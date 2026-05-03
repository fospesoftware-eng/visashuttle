import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// Lazy-initialized singletons so this module can be imported in the browser
// for schema types and constants without immediately throwing.
let _pool: pg.Pool | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getPool(): pg.Pool {
  if (!_pool) _pool = createPool();
  return _pool;
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) _db = drizzle(getPool(), { schema });
  return _db;
}

// Eagerly-init on server side only (non-browser environments)
if (typeof (globalThis as any).window === "undefined" && process.env.DATABASE_URL) {
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzle(_pool, { schema });
}

/** @deprecated Use getPool() for lazy access */
export const pool = {
  get query() { return getPool().query.bind(getPool()); },
  get connect() { return getPool().connect.bind(getPool()); },
  get end() { return getPool().end.bind(getPool()); },
} as unknown as pg.Pool;

/** @deprecated Use getDb() for lazy access */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export * from "./schema";
