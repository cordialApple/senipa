import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { accounts, performanceStats, users } from '@/db/schema';

export async function GET() {
  const rows = await db
    .select({
      leaderboardRank: performanceStats.leaderboard_rank,
      email: users.email,
      totalProfit: performanceStats.total_profit,
      winRate: performanceStats.win_rate,
      totalTrades: performanceStats.total_trades,
      maxDrawdown: performanceStats.max_drawdown,
      accountStatus: accounts.account_status,
    })
    .from(performanceStats)
    .leftJoin(users, eq(performanceStats.user_id, users.id))
    .leftJoin(accounts, eq(performanceStats.user_id, accounts.user_id));

  const sorted = [...rows].sort((a, b) => {
    const profitDiff = Number(b.totalProfit) - Number(a.totalProfit);
    if (profitDiff !== 0) return profitDiff;
    return Number(b.winRate) - Number(a.winRate);
  });

  return NextResponse.json(sorted);
}
