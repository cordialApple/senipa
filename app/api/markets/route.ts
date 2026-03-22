import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { markets } from '@/db/schema';

export async function GET(): Promise<NextResponse> {
  const rows = await db
    .select({
      id: markets.id,
      title: markets.title,
      description: markets.description,
      current_price: markets.current_price,
      expiration_date: markets.expiration_date,
      market_status: markets.market_status,
      created_at: markets.created_at,
    })
    .from(markets)
    .where(eq(markets.market_status, 'ACTIVE'));

  return NextResponse.json(rows);
}
