// ──────────────────────────────────────────────────────────────────────────
// Boot strategy
//
// The deploy infra requires that port $PORT be opened within ~30s of process
// start. Previously the entry module imported `./app` and `./routes/routes`
// statically — but ES module imports are **hoisted**, so any slow top-level
// code in those modules (or anything they transitively import) executes
// BEFORE the entry module's body, blocking `httpServer.listen()` and causing
// the deploy to fail with no diagnostic output.
//
// To make port binding bulletproof we:
//   1. Statically import only Node built-ins + Express (fast, no I/O).
//   2. Open the listening socket IMMEDIATELY with a stub Express app that
//      answers /api/healthz so the deploy port-probe succeeds.
//   3. Load the real app + routes asynchronously via `await import(...)`.
//      A delegating middleware on the stub forwards real requests to the
//      full app once it's ready; before then everything else returns 503.
//   4. Every step writes a marker to stderr (line-buffered, guaranteed
//      flush) so deploy logs always show exactly how far boot got.
// ──────────────────────────────────────────────────────────────────────────

const bootLog = (msg: string) => process.stderr.write(`[boot] ${msg}\n`);

bootLog("entry start");

// Force stdout into blocking mode so the structured logger's lines flush
// reliably (Node block-buffers stdout when piped to a non-TTY).
try {
  const handle = (process.stdout as any)._handle;
  if (handle && typeof handle.setBlocking === "function") {
    handle.setBlocking(true);
    bootLog("stdout set to blocking");
  }
} catch (err) {
  bootLog(`setBlocking failed: ${(err as Error)?.message ?? err}`);
}

// Top-level error nets so any thrown error during async init is visible
// in deploy logs instead of dying silently.
process.on("uncaughtException", (err) => {
  bootLog(`uncaughtException: ${(err as Error)?.stack ?? err}`);
});
process.on("unhandledRejection", (reason) => {
  bootLog(`unhandledRejection: ${(reason as any)?.stack ?? reason}`);
});

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import express, { type Express, type Request, type Response, type NextFunction } from "express";

bootLog("static imports complete");

const rawPort = process.env["PORT"];
if (!rawPort) {
  bootLog("FATAL: PORT env var missing");
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  bootLog(`FATAL: invalid PORT "${rawPort}"`);
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}
bootLog(`PORT=${port}`);

// ── Stub server ──────────────────────────────────────────────────────────
// Minimal Express instance that owns the listening socket. It answers
// /api/healthz immediately and delegates every other request to the real
// app once it's been loaded.
const stubApp: Express = express();
let realApp: Express | undefined;

stubApp.get("/api/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok", ready: Boolean(realApp) });
});

stubApp.use((req: Request, res: Response, next: NextFunction) => {
  if (realApp) {
    return (realApp as unknown as (
      req: IncomingMessage,
      res: ServerResponse,
      next: NextFunction,
    ) => void)(req, res, next);
  }
  if (req.path === "/api/healthz") return next();
  res.status(503).json({ error: "Server warming up, please retry shortly." });
});

const httpServer = createServer(stubApp);

httpServer.on("error", (err) => {
  bootLog(`httpServer error: ${(err as Error)?.message ?? err}`);
});

bootLog("calling httpServer.listen");
httpServer.listen({ port, host: "0.0.0.0" }, () => {
  bootLog(`LISTENING on ${port}`);
});

// ── Async heavy load ─────────────────────────────────────────────────────
// Load the real app AFTER the listening socket is open. Any slow top-level
// code in `./app` or `./routes/routes` can no longer block port binding.
(async () => {
  try {
    bootLog("importing ./app");
    const appMod = await import("./app");
    const fullApp = appMod.default as Express;
    bootLog("imported ./app");

    bootLog("importing ./routes/routes");
    const routesMod = await import("./routes/routes");
    bootLog("imported ./routes/routes");

    bootLog("importing ./lib/logger");
    const { logger } = await import("./lib/logger");
    bootLog("imported ./lib/logger");

    bootLog("importing ./static");
    const { serveStatic } = await import("./static");
    bootLog("imported ./static");

    bootLog("registerRoutes start");
    await routesMod.registerRoutes(httpServer, fullApp);
    bootLog("registerRoutes complete");

    fullApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      logger.error({ err }, `[error] ${status} ${err?.message ?? "Unknown error"}`);
      const isProd = process.env.NODE_ENV === "production";
      const safeMessage =
        isProd && status >= 500 ? "Internal Server Error" : err?.message || "Internal Server Error";
      if (!res.headersSent) {
        res.status(status).json({ message: safeMessage });
      }
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(fullApp);
      bootLog("serveStatic mounted");
    }

    // Atomic swap: from this point on the stub delegates every request to
    // the real app, including session/CORS/CSRF middleware.
    realApp = fullApp;
    bootLog("real app live");
    logger.info({ port }, "Server fully ready");
  } catch (err) {
    bootLog(`FATAL during async init: ${(err as Error)?.stack ?? err}`);
    // Don't exit — keep the stub serving healthz so the deploy stays up
    // and the operator can see the diagnostic in the logs.
  }
})();
