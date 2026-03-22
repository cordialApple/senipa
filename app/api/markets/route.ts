import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { accounts, markets } from '@/db/schema';
import { requireAuth } from '@/lib/auth';
import { buildBetBuddySnapshot } from '@/lib/betBuddy';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Require auth because sizing suggestions depend on account balance.
  const auth = await requireAuth(request);
  // If auth failed, return the auth error response directly.
  if (auth instanceof NextResponse) return auth;

  // Load the caller's account to power bankroll-aware recommendations.
  const [account] = await db
    .select({ current_balance: accounts.current_balance })
    .from(accounts)
    .where(eq(accounts.user_id, auth.userId));

  // If no account exists we cannot compute stake advice.
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Convert persisted numeric string into a JS number once.
  const accountBalance = Number(account.current_balance);

  // Load active markets as before.
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

  // Attach Bet Buddy model + sizing payload per market row.
  const enriched = rows.map((row) => ({
    ...row,
    bet_buddy: buildBetBuddySnapshot({
      marketPriceYes: Number(row.current_price),
      expirationDate: new Date(row.expiration_date),
      accountBalance,
    }),
  }));

  // Return enriched market rows to the client.
  return NextResponse.json(enriched);
}
