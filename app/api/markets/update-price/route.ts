import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { markets } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';

const schema = z.object({
  marketId: z.string().uuid(),
  current_price: z.number().min(0).max(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { marketId, current_price } = parsed.data;

  const [market] = await db
    .update(markets)
    .set({ current_price: String(current_price) })
    .where(eq(markets.id, marketId))
    .returning();

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }

  return NextResponse.json(market);
}
