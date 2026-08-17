import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    // In the Replit deploy environment the visa-shuttle frontend is served
    // as a separate static artifact by the deploy infra — api-server never
    // needs to serve it directly. Log a notice and skip instead of crashing.
    console.warn(
      `[static] dist/public not found at ${distPath}; ` +
      "skipping static file serving (expected in deploy — frontend served by infra).",
    );
    return;
  }

  app.use(express.static(distPath));

  app.get("/", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  // Single Page Application (SPA) catch-all fallback
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
      return res.sendFile(path.resolve(distPath, "index.html"));
    }
    next();
  });
}
