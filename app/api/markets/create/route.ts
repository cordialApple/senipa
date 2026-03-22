import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { markets } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  current_price: z.number().min(0).max(1),
  expiration_date: z.string().datetime(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { title, description, current_price, expiration_date } = parsed.data;

  const [market] = await db
    .insert(markets)
    .values({
      title,
      description,
      current_price: String(current_price),
      expiration_date: new Date(expiration_date),
      market_status: 'ACTIVE',
      resolved_outcome: null,
      created_by_admin: auth.userId,
    })
    .returning();

  return NextResponse.json(market, { status: 201 });
}
