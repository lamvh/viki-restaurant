import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/auth/admin-session';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  // Either session kind grants access: a Supabase user, or a valid signed
  // password-session cookie. The cookie is HMAC-verified here, so editing it by
  // hand does not get past this check.
  const adminUser = await verifyAdminToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  if (!user && !adminUser && !isLoginPage) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
