import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the Replit reverse proxy on every environment so `req.secure` and the
// remote IP reflect the real client. Required for cross-site cookies issued
// over HTTPS (the dev preview is also served via HTTPS through the proxy).
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// The mobile artifact (Expo) is served from a different subdomain than the
// API (it bypasses the artifact router), so cross-origin requests from the
// mobile app need to be allowed *and* must carry the session cookie. We use
// an explicit allowlist (built from Replit-provided env vars + localhost dev
// hosts) — never reflect arbitrary origins — because we set
// `credentials: true` and use cookie-based sessions, which would otherwise
// expose authenticated endpoints to CSRF from any site.
//
// Allowed origins:
//  • Each entry in REPLIT_DOMAINS (the main repl domain that serves the web
//    artifact and the API via the artifact router).
//  • REPLIT_EXPO_DEV_DOMAIN (the Expo dev subdomain that hosts the mobile
//    web preview and Metro bundler).
//  • CORS_ALLOWED_ORIGINS — comma-separated override for additional trusted
//    origins (e.g. published custom domains).
//  • Localhost on any port for local-machine development.
//
// Requests without an Origin header (native mobile fetch, curl, server-to-
// server) are also allowed since they cannot be forged by a browser.
const allowedOriginSet = new Set<string>();
for (const d of (process.env.REPLIT_DOMAINS ?? "").split(",")) {
  const host = d.trim();
  if (host) allowedOriginSet.add(`https://${host}`);
}
if (process.env.REPLIT_EXPO_DEV_DOMAIN) {
  allowedOriginSet.add(`https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`);
}
for (const o of (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",")) {
  const trimmed = o.trim();
  if (trimmed) allowedOriginSet.add(trimmed);
}
const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isAllowedOrigin(origin: string): boolean {
  return allowedOriginSet.has(origin) || localhostOrigin.test(origin);
}

app.use(
  cors({
    // Reflect the request origin for allowed origins; for unknown origins we
    // simply omit the `Access-Control-Allow-Origin` header (returning `false`
    // here). The browser will refuse to read the response, which is the
    // correct outcome — and we don't surface a 500. The CSRF middleware
    // below independently blocks state-changing requests from unknown
    // origins so the server never executes them either.
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      return cb(null, isAllowedOrigin(origin));
    },
    credentials: true,
  }),
);

// CSRF defense: because we set `SameSite=None` on the shared session cookie
// (required for the cross-origin Expo mobile client), browsers would
// otherwise attach the session cookie on simple cross-site form posts. The
// CORS allowlist alone does NOT prevent that — CORS only restricts response
// readability, not whether the request is sent. We therefore reject any
// state-changing request whose `Origin` (or, for clients that omit Origin,
// `Referer`) is not in the allowlist. Requests without Origin AND without
// Referer are allowed: those are native-mobile fetches, curl, and
// server-to-server calls, which cannot be forged by a browser.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
app.use((req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.path.startsWith("/api/webhooks/")) return next();

  const origin = req.get("origin");
  if (origin) {
    if (isAllowedOrigin(origin)) return next();
    return res.status(403).json({ error: "Cross-site request blocked" });
  }

  const referer = req.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (isAllowedOrigin(refOrigin)) return next();
      return res.status(403).json({ error: "Cross-site request blocked" });
    } catch {
      return res.status(403).json({ error: "Invalid referer" });
    }
  }

  // No Origin and no Referer: not a browser-driven cross-site request.
  return next();
});

// Passport scan endpoint accepts large base64 images
app.use(
  "/api/passport/scan",
  express.json({ limit: "12mb" }),
);

// Document upload endpoint also receives base64 file payloads
app.use(
  /^\/api\/cases\/[^/]+\/documents$/,
  express.json({ limit: "12mb" }),
);

// Public proposal apply can carry checklist uploads as base64 data URLs.
app.use(
  /^\/api\/proposals\/[^/]+\/apply$/,
  express.json({ limit: "60mb" }),
);

// Public proposal passport scan receives the same image payload as agency scan.
app.use(
  /^\/api\/proposals\/[^/]+\/passport\/scan$/,
  express.json({ limit: "12mb" }),
);

// Agency branding can include a small uploaded logo data URL.
app.use(
  /^\/api\/tenants\/[^/]+\/branding$/,
  express.json({ limit: "3mb" }),
);

// Dashboard customizer estimates can include one reference image.
app.use(
  /^\/api\/agency\/[^/]+\/customizer\/estimate$/,
  express.json({ limit: "8mb" }),
);

// Visa-copy upload endpoint
app.use(
  /^\/api\/cases\/[^/]+\/visa-copy$/,
  express.json({ limit: "3mb" }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Session setup
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  logger.error("[Boot] FATAL: SESSION_SECRET is required in production. Refusing to start.");
  process.exit(1);
}

const PgStore = connectPgSimple(session);
const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "visa-shuttle-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Replit always serves the public domain over HTTPS (even in dev), and
    // we trust the proxy above, so secure cookies work in every environment.
    // The mobile app talks to the API cross-origin from the Expo subdomain,
    // which requires `SameSite=None; Secure` for the session cookie to be
    // accepted by the browser.
    secure: true,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: "none",
  },
};

if (pool) {
  // Defensive bootstrap: ensure the `sessions` table exists before the store
  // tries to read/write it. `connect-pg-simple`'s `createTableIfMissing` runs
  // on first use and has been observed to silently leave the table missing in
  // some environments — when that happens every `req.session.save()` fails
  // with a confusing "Session error, please try again" response on login.
  // Creating it explicitly at boot makes a fresh database always work.
  void pool
    .query(
      `CREATE TABLE IF NOT EXISTS "sessions" (
         "sid"    varchar       NOT NULL COLLATE "default",
         "sess"   json          NOT NULL,
         "expire" timestamp(6)  NOT NULL,
         CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
       );
       CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");`,
    )
    .catch((err) => {
      logger.error({ err }, "[Session] Failed to ensure sessions table exists");
    });

  sessionOptions.store = new PgStore({
    pool,
    createTableIfMissing: true,
    tableName: "sessions",
  });
} else {
  logger.warn("[Session] Using default memory session store because DATABASE_URL is not set.");
}

app.use(session(sessionOptions));

// Site-wide password protection middleware
const SITE_PASSWORD = process.env.SITE_PASSWORD;
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!SITE_PASSWORD) return next();
  // Deploy probe must always succeed regardless of site-password gating.
  if (req.path === "/api/healthz") return next();
  if (req.path.startsWith("/api/site-auth")) return next();
  if (req.path.startsWith("/api/proposals/")) return next();
  if (req.path.startsWith("/api/public/invoice/")) return next();
  if (req.path.startsWith("/api/public/proposal/")) return next();
  if (req.path.startsWith("/api") && !(req.session as any)?.siteAuthenticated) {
    return res.status(401).json({ error: "Site authentication required" });
  }
  next();
});

export default app;
