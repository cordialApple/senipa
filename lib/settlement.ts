import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accounts, markets, trades } from '@/db/schema';
import { updateDrawdown } from '@/lib/account';
import { checkEvaluation } from '@/lib/evaluation';
import { updateLeaderboard } from '@/lib/leaderboard';

export async function settleMarket(
  marketId: string,
  outcome: 'YES' | 'NO',
): Promise<number> {
  const openTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.market_id, marketId), eq(trades.status, 'OPEN')));

  if (openTrades.length === 0) {
    // Still need to mark the market resolved even with no open trades
    await db
      .update(markets)
      .set({ market_status: 'RESOLVED', resolved_outcome: outcome })
      .where(eq(markets.id, marketId));
    return 0;
  }

  // settlement price per position type: YES outcome → YES=1,NO=0; NO outcome → YES=0,NO=1
  const settlementPrice = (positionType: 'YES' | 'NO'): number => {
    if (outcome === 'YES') return positionType === 'YES' ? 1 : 0;
    return positionType === 'YES' ? 0 : 1;
  };

  // Aggregate realized PnL per user before entering the transaction
  const userPnl = new Map<string, number>();
  for (const trade of openTrades) {
    const sp = settlementPrice(trade.position_type);
    const pnl = (sp - Number(trade.entry_price)) * Number(trade.quantity);
    userPnl.set(trade.user_id, (userPnl.get(trade.user_id) ?? 0) + pnl);
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    // 1. Close all open trades with their realized_pnl
    for (const trade of openTrades) {
      const sp = settlementPrice(trade.position_type);
      const realized = (sp - Number(trade.entry_price)) * Number(trade.quantity);
      await tx
        .update(trades)
        .set({
          status: 'CLOSED',
          realized_pnl: realized.toFixed(2),
          closed_at: now,
        })
        .where(eq(trades.id, trade.id));
    }

    // 2. Update each affected user's balance, then recalculate drawdown atomically
    for (const [userId, totalPnl] of userPnl) {
      const [account] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.user_id, userId));

      const newBalance = Number(account.current_balance) + totalPnl;

      await tx
        .update(accounts)
        .set({ current_balance: newBalance.toFixed(2) })
        .where(eq(accounts.user_id, userId));

      // updateDrawdown accepts tx so drawdown state is atomic with the balance write
      await updateDrawdown(userId, newBalance, tx);
    }

    // 3. Resolve the market — must be inside the transaction so it rolls back on any failure
    await tx
      .update(markets)
      .set({ market_status: 'RESOLVED', resolved_outcome: outcome })
      .where(eq(markets.id, marketId));
  });

  // Post-commit: evaluation and leaderboard are eventually consistent, never inside the tx
  const affectedUsers = [...userPnl.keys()];
  await Promise.all(
    affectedUsers.flatMap((userId) => [
      checkEvaluation(userId),
      updateLeaderboard(userId),
    ]),
  );

  return openTrades.length;
}
