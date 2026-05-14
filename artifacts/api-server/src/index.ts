// Boot diagnostics go to stderr because:
//   1. Node line-buffers stderr but block-buffers stdout when piped to a
//      non-TTY (the case under the deploy infra), so stderr writes show up
//      immediately in deploy logs while stdout writes can sit in a 4KB
//      buffer until SIGKILL discards them.
//   2. Pino (our structured logger) writes to stdout via SonicBoom, which
//      compounds the buffering risk during the first ~100ms of boot before
//      its async flush loop kicks in.
// Once the listening socket is open we still use the structured logger for
// everything else.
const bootLog = (msg: string) => process.stderr.write(`[boot] ${msg}\n`);

bootLog("index.ts top-level start");

// Force stdout into blocking/sync mode so the structured logger's
// "Server listening" line is guaranteed to flush before the deploy
// port-probe / health-check evaluates the process.
try {
  const handle = (process.stdout as any)._handle;
  if (handle && typeof handle.setBlocking === "function") {
    handle.setBlocking(true);
    bootLog("stdout set to blocking mode");
  }
} catch (err) {
  bootLog(`failed to set stdout blocking: ${(err as Error)?.message ?? err}`);
}

import { createServer } from "http";
bootLog("imported http");

import app from "./app";
bootLog("imported ./app");

import { registerRoutes } from "./routes/routes";
bootLog("imported ./routes/routes");

import { logger } from "./lib/logger";
bootLog("imported ./lib/logger");

import { serveStatic } from "./static";
bootLog("imported ./static");

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

bootLog(`creating http server (port=${port})`);
const httpServer = createServer(app);

// Register the deploy health-check route immediately, before any async work.
// The deploy infra port-probe times out fast, so we MUST open the listening
// socket as soon as possible — heavy startup work (DB seeding, route
// registration, etc.) happens after `listen()` returns.
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

bootLog("calling httpServer.listen");
httpServer.listen({ port, host: "0.0.0.0" }, () => {
  // Stderr write first (guaranteed flush) so deploy logs always show the
  // bind succeeded, then the structured info log.
  bootLog(`listen callback fired on port ${port}`);
  logger.info({ port }, "Server listening");
});

httpServer.on("error", (err) => {
  bootLog(`httpServer error: ${(err as Error)?.message ?? err}`);
  logger.error({ err }, "[Boot] httpServer error");
});

(async () => {
  try {
    bootLog("registerRoutes start");
    await registerRoutes(httpServer, app);
    bootLog("registerRoutes complete");
  } catch (err) {
    bootLog(`registerRoutes failed: ${(err as Error)?.message ?? err}`);
    logger.error({ err }, "[Boot] registerRoutes failed");
    throw err;
  }

  app.use((err: any, _req: any, res: any, _next: any) => {
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
    serveStatic(app);
    bootLog("serveStatic mounted");
  }
})();
