import { createServer } from "http";
import app from "./app";
import { registerRoutes } from "./routes/routes";
import { logger } from "./lib/logger";
import { serveStatic } from "./static";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

// Register the deploy health-check route immediately, before any async work.
// The deploy infra port-probe times out at 60s, so we MUST open the listening
// socket as soon as possible — heavy startup work (DB seeding, route
// registration, etc.) happens after `listen()` returns.
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

httpServer.listen({ port, host: "0.0.0.0" }, () => {
  logger.info({ port }, "Server listening");
});

(async () => {
  try {
    await registerRoutes(httpServer, app);
  } catch (err) {
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
  }
})();
