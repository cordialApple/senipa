import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { markets, trades, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({
      id: trades.id,
      user_email: users.email,
      market_title: markets.title,
      position_type: trades.position_type,
      quantity: trades.quantity,
      entry_price: trades.entry_price,
      status: trades.status,
      realized_pnl: trades.realized_pnl,
      created_at: trades.created_at,
      closed_at: trades.closed_at,
    })
    .from(trades)
    .leftJoin(users, eq(trades.user_id, users.id))
    .leftJoin(markets, eq(trades.market_id, markets.id))
    .orderBy(desc(trades.created_at))
    .limit(50);

  return NextResponse.json(rows);
}
