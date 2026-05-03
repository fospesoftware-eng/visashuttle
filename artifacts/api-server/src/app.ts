import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust proxy for production (required for secure cookies behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

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

app.use(cors());

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
