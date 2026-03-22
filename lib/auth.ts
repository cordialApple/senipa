import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JwtPayload } from './jwt';

export async function requireAuth(request: NextRequest): Promise<JwtPayload | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  try {
    return verifyToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}

export async function requireAdmin(request: NextRequest): Promise<JwtPayload | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (result.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return result;
}
