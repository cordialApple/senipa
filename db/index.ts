import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// The neon-serverless (WebSocket) driver supports interactive transactions,
// unlike neon-http. In Node serverless route handlers it needs a WebSocket
// implementation provided explicitly.
neonConfig.webSocketConstructor = ws;

// Lazy singleton: construct the pool on first query so a missing DATABASE_URL
// fails at request time, not at build/import time.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof drizzle<typeof schema>> };

function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (globalForDb.db) return globalForDb.db;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const instance = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

  // Guard against extra connections during Next.js hot-reload in development
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = instance;
  }
  return instance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get: (_target, prop) => (getDb() as unknown as Record<string | symbol, unknown>)[prop],
});
