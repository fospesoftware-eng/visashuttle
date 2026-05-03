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

// The mobile artifact (Expo) is served from a *different* subdomain than the
// API (it bypasses the artifact router), so cross-origin requests from the
// mobile app must be allowed and must carry the session cookie. Reflecting
// the request origin (instead of `*`) keeps `Access-Control-Allow-Credentials`
// valid. Requests with no Origin header (native fetch, server-to-server) are
// also allowed.
app.use(
  cors({
    origin: (origin, cb) => cb(null, origin ?? true),
    credentials: true,
  }),
);

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
