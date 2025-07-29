import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle Firebase Auth handler path
  if (pathname.startsWith('/__/auth/handler')) {
    // Redirect to our working auth callback route
    const url = request.nextUrl.clone();
    url.pathname = '/api/auth/callback';
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/__/auth/handler/:path*',
  ],
}; 