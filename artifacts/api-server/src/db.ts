import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@workspace/db";

export const hasDatabase = Boolean(process.env.DATABASE_URL);

if (!hasDatabase) {
  console.warn("[DB] DATABASE_URL is not set. Falling back to in-memory storage.");
}

export const pool = hasDatabase
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  : undefined;

export const db = pool ? drizzle(pool, { schema }) : undefined as any;
