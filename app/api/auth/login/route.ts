import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { signToken } from '@/lib/jwt';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['TRADER', 'ADMIN']).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { email, password, role } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // If role=ADMIN is requested, verify the user actually has that role
  if (role === 'ADMIN' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return NextResponse.json({ token, role: user.role });
}
