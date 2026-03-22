import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { markets } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { settleMarket } from '@/lib/settlement';

const resolveSchema = z.object({
  marketId: z.string().uuid(),
  outcome: z.enum(['YES', 'NO']),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { marketId, outcome } = parsed.data;

  const [market] = await db
    .select()
    .from(markets)
    .where(eq(markets.id, marketId));

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }
  if (market.market_status === 'RESOLVED') {
    return NextResponse.json({ error: 'Market is already resolved' }, { status: 409 });
  }

  const tradesSettled = await settleMarket(marketId, outcome);

  return NextResponse.json({ resolved: true, marketId, outcome, tradesSettled });
}
