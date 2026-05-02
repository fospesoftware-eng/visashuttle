import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);
const PgStore = connectPgSimple(session);

// Trust proxy for production (required for secure cookies behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    siteAuthenticated?: boolean;
  }
}

// Passport scan endpoint accepts large base64 images — bump just that path so
// the rest of the platform keeps a conservative body limit.
app.use(
  "/api/passport/scan",
  express.json({
    limit: "12mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Document upload endpoint also receives base64 file payloads (passport pages,
// checklist attachments uploaded by the agent in the case-creation wizard).
// Mounted before the global parser so the bigger limit wins for this path only.
app.use(
  /^\/api\/cases\/[^/]+\/documents$/,
  express.json({
    limit: "12mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Visa-copy upload endpoint receives an inline data URL (PDF / image) of the
// stamped visa. Bumped to 3 MB so a ~2 MB base64 payload fits comfortably.
app.use(
  /^\/api\/cases\/[^/]+\/visa-copy$/,
  express.json({
    limit: "3mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Session middleware
const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "visa-shuttle-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: "lax",
  },
};

if (pool) {
  sessionOptions.store = new PgStore({
      pool,
      createTableIfMissing: true,
      tableName: "sessions",
  });
} else {
  console.warn("[Session] Using default memory session store because DATABASE_URL is not set.");
}

app.use(session(sessionOptions));

// Site-wide password protection middleware
const SITE_PASSWORD = process.env.SITE_PASSWORD;
app.use((req, res, next) => {
  // If no password is configured, allow all access
  if (!SITE_PASSWORD) {
    return next();
  }
  
  // Skip protection for site-auth endpoints (needed to authenticate)
  if (req.path.startsWith("/api/site-auth")) {
    return next();
  }

  // Public, tokenized proposal endpoints — the token IS the credential, so
  // these must work for unauthenticated end-customers clicking a share link.
  if (req.path.startsWith("/api/proposals/")) {
    return next();
  }

  // Public, tokenized invoice payment endpoints (share-link flow + Cashfree
  // return-url) — same rationale as proposals: the token IS the credential.
  if (req.path.startsWith("/api/public/invoice/")) {
    return next();
  }

  // Public, tokenized proposal-payment endpoints (the customer-facing
  // "Pay estimate" CTA shown after applying via a proposal link).
  if (req.path.startsWith("/api/public/proposal/")) {
    return next();
  }

  // Protect API routes - require site authentication
  if (req.path.startsWith("/api") && !req.session?.siteAuthenticated) {
    return res.status(401).json({ error: "Site authentication required" });
  }
  
  // All other routes (HTML, assets) pass through - the frontend PasswordGate handles UI protection
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Suppress response body in logs for endpoints that return PII
      // (e.g. extracted passport details, uploaded document images).
      const isSensitiveResponse =
        path === "/api/passport/scan" ||
        /^\/api\/cases\/[^/]+\/documents$/.test(path);
      if (capturedJsonResponse && !isSensitiveResponse) {
        // Belt-and-braces: scrub any `fileUrl` field anywhere in the response
        // before logging, in case other endpoints surface document records.
        // base64 data URLs are huge and contain personal data — never log them.
        const safe = JSON.parse(JSON.stringify(capturedJsonResponse), (k, v) =>
          k === "fileUrl" && typeof v === "string" && v.startsWith("data:")
            ? "[redacted-data-url]"
            : v,
        );
        logLine += ` :: ${JSON.stringify(safe)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
