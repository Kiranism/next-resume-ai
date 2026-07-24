import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Neon's serverless driver speaks Postgres over a WebSocket to Neon's gateway,
// so idle connections don't go stale and time out on read the way a raw
// node-postgres TCP pool does against Neon (which closes idle connections and
// scales compute to zero). Node 21+ (local dev) and Vercel's Node 22 runtime
// expose a global WebSocket the driver can use — no extra dependency needed.
neonConfig.webSocketConstructor = globalThis.WebSocket;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// A dropped idle connection surfaces as a pool 'error' event; with no listener,
// pg-style pools re-throw it as an uncaughtException (the crash this replaces).
// Log and continue — the pool discards the dead client and opens a fresh one on
// the next query.
pool.on('error', (err) => {
  console.error('Neon pool error (recovered):', err.message);
});

export const db = drizzle(pool, { schema });
