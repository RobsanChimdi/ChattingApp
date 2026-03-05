import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protect call pages
  if (pathname.startsWith('/call')) {
    const token = request.cookies.get('auth-token');
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Check if user has call permissions
    const userPermissions = request.cookies.get('user-permissions');
    if (userPermissions && !JSON.parse(userPermissions.value).includes('call')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/call/:path*']
};