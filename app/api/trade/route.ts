import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/index';
import { accounts, markets, trades } from '@/db/schema';
import { requireAuth } from '@/lib/auth';

const tradeSchema = z.object({
  marketId: z.string().uuid(),
  position_type: z.enum(['YES', 'NO']),
  quantity: z.number().positive(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = tradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { marketId, position_type, quantity } = parsed.data;

  const [market] = await db
    .select()
    .from(markets)
    .where(eq(markets.id, marketId));

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }
  if (market.market_status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Market is not active' }, { status: 400 });
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.user_id, auth.userId));

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Always use server-side market price — never trust client input
  const entryPrice = Number(market.current_price);
  const currentBalance = Number(account.current_balance);
  const positionValue = quantity * entryPrice;

  if (positionValue > 0.20 * currentBalance) {
    return NextResponse.json(
      { error: 'Position size exceeds 20% of current balance' },
      { status: 400 },
    );
  }

  const created = await db.transaction(async (tx) => {
    const [trade] = await tx
      .insert(trades)
      .values({
        user_id: auth.userId,
        market_id: marketId,
        position_type,
        entry_price: market.current_price,
        quantity: quantity.toString(),
        status: 'OPEN',
        realized_pnl: null,
      })
      .returning();

    await tx
      .update(accounts)
      .set({ trades_taken: account.trades_taken + 1 })
      .where(eq(accounts.id, account.id));

    return trade;
  });

  return NextResponse.json(created, { status: 201 });
}
