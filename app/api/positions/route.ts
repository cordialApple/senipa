import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { markets, trades } from '@/db/schema';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const openTrades = await db
    .select({
      id: trades.id,
      user_id: trades.user_id,
      market_id: trades.market_id,
      position_type: trades.position_type,
      entry_price: trades.entry_price,
      quantity: trades.quantity,
      status: trades.status,
      realized_pnl: trades.realized_pnl,
      created_at: trades.created_at,
      closed_at: trades.closed_at,
      market_current_price: markets.current_price,
    })
    .from(trades)
    .innerJoin(markets, eq(trades.market_id, markets.id))
    .where(
      and(
        eq(trades.user_id, auth.userId),
        eq(trades.status, 'OPEN'),
      ),
    );

  const result = openTrades.map((row) => {
    const currentPrice = Number(row.market_current_price);
    const entryPrice = Number(row.entry_price);
    const quantity = Number(row.quantity);

    const unrealized_pnl =
      row.position_type === 'YES'
        ? (currentPrice - entryPrice) * quantity
        : (entryPrice - currentPrice) * quantity;

    const { market_current_price, ...trade } = row;
    return { ...trade, unrealized_pnl };
  });

  return NextResponse.json(result);
}
