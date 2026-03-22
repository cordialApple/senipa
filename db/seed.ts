import "dotenv/config";
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.ts';

// Standalone script — does not reuse the global db singleton
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const sevenDaysFromNow = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
};

const DEMO_MARKETS: Array<typeof schema.markets.$inferInsert> = [
  {
    title: 'Will the Fed cut rates in Q2 2026?',
    description: 'Resolves YES if the Federal Reserve announces at least one rate cut at any FOMC meeting in Q2 2026.',
    current_price: '0.6200',
    expiration_date: sevenDaysFromNow(),
    market_status: 'ACTIVE',
    resolved_outcome: null,
    // created_by_admin filled below after admin upsert
    created_by_admin: '',
  },
  {
    title: 'Will BTC close above $80k on April 1, 2026?',
    description: 'Resolves YES if Bitcoin\'s daily closing price on April 1, 2026 exceeds $80,000 USD on Coinbase.',
    current_price: '0.4500',
    expiration_date: sevenDaysFromNow(),
    market_status: 'ACTIVE',
    resolved_outcome: null,
    created_by_admin: '',
  },
  {
    title: 'Will Apple announce a new AI chip at WWDC 2026?',
    description: 'Resolves YES if Apple announces a new silicon chip with a dedicated AI/ML engine at WWDC 2026.',
    current_price: '0.7800',
    expiration_date: sevenDaysFromNow(),
    market_status: 'ACTIVE',
    resolved_outcome: null,
    created_by_admin: '',
  },
  {
    title: 'Will the US unemployment rate exceed 5% in 2026?',
    description: 'Resolves YES if any monthly BLS unemployment report for 2025 shows a rate above 5.0%.',
    current_price: '0.3100',
    expiration_date: sevenDaysFromNow(),
    market_status: 'ACTIVE',
    resolved_outcome: null,
    created_by_admin: '',
  },
  {
    title: 'Will OpenAI release GPT-5 before June 2026?',
    description: 'Resolves YES if OpenAI publicly releases a model officially named GPT-5 before June 1, 2025.',
    current_price: '0.5500',
    expiration_date: sevenDaysFromNow(),
    market_status: 'ACTIVE',
    resolved_outcome: null,
    created_by_admin: '',
  },
];

async function seed() {

  const passwordHash = await bcrypt.hash('admin123', 12);

  const [admin] = await db
    .insert(schema.users)
    .values({
      email: 'admin@demo.com',
      password_hash: passwordHash,
      role: 'ADMIN',
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { role: 'ADMIN' },
    })
    .returning({ id: schema.users.id });

  for (const market of DEMO_MARKETS) {
    await db
      .insert(schema.markets)
      .values({ ...market, created_by_admin: admin.id })
      .onConflictDoNothing();
  }

  console.log('Seed complete. Admin:', admin.id);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
