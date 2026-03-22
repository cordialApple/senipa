import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/positions') ||
    pathname.startsWith('/markets') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/admin');

  if (!isProtected) return NextResponse.next();

  const authHeader = request.headers.get('Authorization');
  const cookieToken = request.cookies.get('token')?.value;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const payload = verifyToken(token);

    // ADMIN-only section
    if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/positions/:path*', '/markets/:path*', '/leaderboard/:path*', '/admin/:path*'],
};
