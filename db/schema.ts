import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['TRADER', 'ADMIN']);
export const accountStatusEnum = pgEnum('account_status', ['EVALUATION', 'FUNDED', 'FAILED']);
export const marketStatusEnum = pgEnum('market_status', ['ACTIVE', 'RESOLVED']);
export const resolvedOutcomeEnum = pgEnum('resolved_outcome', ['YES', 'NO']);
export const positionTypeEnum = pgEnum('position_type', ['YES', 'NO']);
export const tradeStatusEnum = pgEnum('trade_status', ['OPEN', 'CLOSED']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('TRADER'),
  created_at: timestamp('created_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  starting_balance: numeric('starting_balance', { precision: 12, scale: 2 }).notNull(),
  current_balance: numeric('current_balance', { precision: 12, scale: 2 }).notNull(),
  peak_balance: numeric('peak_balance', { precision: 12, scale: 2 }).notNull(),
  profit_target: numeric('profit_target', { precision: 12, scale: 2 }).notNull(),
  max_drawdown: numeric('max_drawdown', { precision: 12, scale: 2 }).notNull(),
  current_drawdown: numeric('current_drawdown', { precision: 12, scale: 2 }).notNull().default('0'),
  account_status: accountStatusEnum('account_status').notNull().default('EVALUATION'),
  min_trades_required: integer('min_trades_required').notNull(),
  trades_taken: integer('trades_taken').notNull().default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const markets = pgTable('markets', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  current_price: numeric('current_price', { precision: 10, scale: 4 }).notNull(),
  expiration_date: timestamp('expiration_date').notNull(),
  market_status: marketStatusEnum('market_status').notNull().default('ACTIVE'),
  resolved_outcome: resolvedOutcomeEnum('resolved_outcome'),
  created_by_admin: uuid('created_by_admin').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
});

export const trades = pgTable('trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  market_id: uuid('market_id').notNull().references(() => markets.id),
  position_type: positionTypeEnum('position_type').notNull(),
  entry_price: numeric('entry_price', { precision: 10, scale: 4 }).notNull(),
  quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull(),
  status: tradeStatusEnum('status').notNull().default('OPEN'),
  realized_pnl: numeric('realized_pnl', { precision: 12, scale: 2 }),
  created_at: timestamp('created_at').defaultNow(),
  closed_at: timestamp('closed_at'),
});

export const performanceStats = pgTable('performance_stats', {
  user_id: uuid('user_id').primaryKey().references(() => users.id),
  total_profit: numeric('total_profit', { precision: 12, scale: 2 }),
  win_rate: numeric('win_rate', { precision: 5, scale: 4 }),
  total_trades: integer('total_trades').notNull().default(0),
  max_drawdown: numeric('max_drawdown', { precision: 12, scale: 2 }),
  leaderboard_rank: integer('leaderboard_rank'),
});
