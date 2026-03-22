import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/db';
import { users, accounts, performanceStats } from '@/db/schema';
import { signToken } from '@/lib/jwt';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const password_hash = await bcrypt.hash(password, 12);

  // Hardcoded evaluation params per business rules
  const STARTING_BALANCE = '10000.00';
  const PROFIT_TARGET = '1000.00';
  const MAX_DRAWDOWN = '500.00';
  const MIN_TRADES = 10;

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email, password_hash, role: 'TRADER' })
        .returning({ id: users.id, email: users.email, role: users.role });

      await tx.insert(accounts).values({
        user_id: user.id,
        starting_balance: STARTING_BALANCE,
        current_balance: STARTING_BALANCE,
        peak_balance: STARTING_BALANCE,
        profit_target: PROFIT_TARGET,
        max_drawdown: MAX_DRAWDOWN,
        current_drawdown: '0.00',
        account_status: 'EVALUATION',
        min_trades_required: MIN_TRADES,
        trades_taken: 0,
      });

      await tx.insert(performanceStats).values({
        user_id: user.id,
        total_profit: null,
        win_rate: null,
        total_trades: 0,
        max_drawdown: null,
        leaderboard_rank: null,
      });

      return user;
    });

    const token = signToken({ userId: result.id, email: result.email, role: result.role });
    return NextResponse.json({ token }, { status: 201 });
  } catch (err: unknown) {
    // Unique violation → duplicate email
    if (err instanceof Error && err.message.includes('unique')) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
