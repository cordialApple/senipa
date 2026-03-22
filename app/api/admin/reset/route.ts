import { NextRequest, NextResponse } from 'next/server';
import { eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { accounts, trades, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const traderAccounts = await db
    .select({ user_id: accounts.user_id })
    .from(accounts)
    .leftJoin(users, eq(accounts.user_id, users.id))
    .where(ne(users.role, 'ADMIN'));

  await db.transaction(async (tx) => {
    for (const { user_id } of traderAccounts) {
      // Delete all trades for this user
      await tx.delete(trades).where(eq(trades.user_id, user_id));

      // Reset account to starting state
      await tx
        .update(accounts)
        .set({
          current_balance: '10000.00',
          peak_balance: '10000.00',
          current_drawdown: '0.00',
          trades_taken: 0,
          account_status: 'EVALUATION',
        })
        .where(eq(accounts.user_id, user_id));
    }
  });

  return NextResponse.json({ reset: true, accountsReset: traderAccounts.length });
}
