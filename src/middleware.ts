import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the cookie (Server-side check)
  const hasToken = request.cookies.has('access_token'); 
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');

  // 1. Unauthenticated user trying to access Dashboard
  if (!hasToken && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  // 2. Logged-in user trying to access Sign-In page
  if (hasToken && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
};
