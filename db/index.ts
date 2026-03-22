import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Guard against extra connections during Next.js hot-reload in development
const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle> };

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(process.env.DATABASE_URL);
export const db = globalForDb.db ?? drizzle(sql, { schema });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}
