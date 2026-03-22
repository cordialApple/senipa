import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accounts, performanceStats, trades } from '@/db/schema';

export async function updateLeaderboard(userId: string): Promise<void> {
  const closedTrades = await db
    .select({ realized_pnl: trades.realized_pnl })
    .from(trades)
    .where(and(eq(trades.user_id, userId), eq(trades.status, 'CLOSED')));

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.user_id, userId));

  if (!account) return;

  const totalTrades = closedTrades.length;
  const totalProfit = closedTrades.reduce((sum, t) => sum + Number(t.realized_pnl ?? 0), 0);
  const wins = closedTrades.filter((t) => Number(t.realized_pnl ?? 0) > 0).length;
  const winRate = totalTrades > 0 ? wins / totalTrades : 0;
  const maxDrawdown = Number(account.current_drawdown);

  await db
    .insert(performanceStats)
    .values({
      user_id: userId,
      total_profit: totalProfit.toFixed(2),
      win_rate: winRate.toFixed(4),
      total_trades: totalTrades,
      max_drawdown: maxDrawdown.toFixed(2),
      leaderboard_rank: null,
    })
    .onConflictDoUpdate({
      target: performanceStats.user_id,
      set: {
        total_profit: totalProfit.toFixed(2),
        win_rate: winRate.toFixed(4),
        total_trades: totalTrades,
        max_drawdown: maxDrawdown.toFixed(2),
      },
    });

  // Full rank recomputation — fetch all rows, sort in JS, update every row in one transaction
  const allStats = await db
    .select({
      userId: performanceStats.user_id,
      totalProfit: performanceStats.total_profit,
      winRate: performanceStats.win_rate,
    })
    .from(performanceStats);

  const ranked = [...allStats].sort((a, b) => {
    const profitDiff = Number(b.totalProfit) - Number(a.totalProfit);
    if (profitDiff !== 0) return profitDiff;
    return Number(b.winRate) - Number(a.winRate);
  });

  await db.transaction(async (tx) => {
    for (const [i, row] of ranked.entries()) {
      await tx
        .update(performanceStats)
        .set({ leaderboard_rank: i + 1 })
        .where(eq(performanceStats.user_id, row.userId));
    }
  });
}
