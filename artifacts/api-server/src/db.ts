import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@workspace/db";

export const hasDatabase = Boolean(process.env.DATABASE_URL);

if (!hasDatabase) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[DB] DATABASE_URL is required in production so application data is persisted.");
  }
  console.warn("[DB] DATABASE_URL is not set. Falling back to in-memory storage for local development only.");
}

export const pool = hasDatabase
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  : undefined;

export const db = pool ? drizzle(pool, { schema }) : undefined as any;

// Ensures schema columns added incrementally are always present in the DB.
// Safe to run on every startup — uses ADD COLUMN IF NOT EXISTS.
export async function runStartupMigrations(): Promise<void> {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE b2c_users
        ADD COLUMN IF NOT EXISTS admin_deep_check_bonus integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS email_verification_token text
    `);
    console.info("[db] Startup migrations applied.");
  } catch (err) {
    console.error("[db] Startup migration failed:", err);
  } finally {
    client.release();
  }
}
