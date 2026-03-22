import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const [account] = await db
    .select({
      id: accounts.id,
      current_balance: accounts.current_balance,
      starting_balance: accounts.starting_balance,
      peak_balance: accounts.peak_balance,
      profit_target: accounts.profit_target,
      max_drawdown: accounts.max_drawdown,
      current_drawdown: accounts.current_drawdown,
      account_status: accounts.account_status,
      min_trades_required: accounts.min_trades_required,
      trades_taken: accounts.trades_taken,
      created_at: accounts.created_at,
    })
    .from(accounts)
    .where(eq(accounts.user_id, auth.userId));

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json(account);
}
