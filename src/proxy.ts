import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { contentSecurityPolicy } from '@/core/csp';
import { routing } from '@/i18n/routing';

const handleI18n = createMiddleware(routing);

export default function proxy(request: NextRequest): NextResponse {
  const response = handleI18n(request);
  const demo =
    request.nextUrl.searchParams.get('demo') === '1' ||
    request.cookies.get('el.demo')?.value === '1';
  if (request.nextUrl.searchParams.get('demo') === '1') {
    response.cookies.set('el.demo', '1', { path: '/', sameSite: 'lax' });
  }
  if (demo) response.headers.set('Content-Security-Policy', contentSecurityPolicy(false));
  return response;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
