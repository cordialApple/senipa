import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { accounts } from '@/db/schema';

export async function checkEvaluation(userId: string): Promise<void> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.user_id, userId));

  if (!account) return;

  // Terminal states are irreversible
  if (account.account_status !== 'EVALUATION') return;

  const currentBalance = Number(account.current_balance);
  const startingBalance = Number(account.starting_balance);
  const peakBalance = Number(account.peak_balance);
  const currentDrawdown = Number(account.current_drawdown);
  const maxDrawdown = Number(account.max_drawdown);
  const profitTarget = Number(account.profit_target);

  // FAIL — check in order; first condition wins
  if (currentDrawdown > maxDrawdown) {
    await db
      .update(accounts)
      .set({ account_status: 'FAILED' })
      .where(eq(accounts.user_id, userId));
    return;
  }

  if (currentBalance < startingBalance - maxDrawdown) {
    await db
      .update(accounts)
      .set({ account_status: 'FAILED' })
      .where(eq(accounts.user_id, userId));
    return;
  }

  // PASS — only reached if neither FAIL condition triggered
  const profit = currentBalance - startingBalance;
  if (profit >= profitTarget && account.trades_taken >= account.min_trades_required) {
    await db
      .update(accounts)
      .set({ account_status: 'FUNDED' })
      .where(eq(accounts.user_id, userId));
  }
}
