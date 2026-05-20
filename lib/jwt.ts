import { SignJWT, jwtVerify } from 'jose';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'TRADER' | 'ADMIN';
}

// Read and encode the secret lazily so a missing JWT_SECRET fails at request
// time rather than at build/import time.
function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret());
  return payload as unknown as JwtPayload;
}
