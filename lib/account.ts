import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { accounts } from '@/db/schema';

// Matches the transaction type produced by drizzle-orm/neon-http's db.transaction()
type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function updateDrawdown(
  userId: string,
  newBalance: number,
  tx?: DrizzleTransaction,
): Promise<void> {
  const client = tx ?? db;

  const [account] = await client
    .select()
    .from(accounts)
    .where(eq(accounts.user_id, userId));

  const peak = Number(account.peak_balance);
  const maxDD = Number(account.max_drawdown);

  const newPeak = newBalance > peak ? newBalance : peak;
  const currentDrawdown = newPeak - newBalance;
  const failed = currentDrawdown > maxDD;

  await client
    .update(accounts)
    .set({
      peak_balance: String(newPeak),
      current_drawdown: String(currentDrawdown),
      ...(failed ? { account_status: 'FAILED' } : {}),
    })
    .where(eq(accounts.user_id, userId));
}
