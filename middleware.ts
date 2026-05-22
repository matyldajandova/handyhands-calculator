import { type NextRequest, NextResponse } from 'next/server';
import {
  AB_COOKIE_NAME,
  AB_HEADER_NAME,
  resolveAbVariant,
} from '@/utils/ab-variant';

export const config = {
  matcher: ['/vysledek', '/vysledek/:path*', '/poptavka', '/poptavka/:path*'],
};

export function middleware(req: NextRequest) {
  const { variant, setCookie } = resolveAbVariant(req);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(AB_HEADER_NAME, variant);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  if (setCookie === 'reset') {
    res.cookies.delete(AB_COOKIE_NAME);
  } else if (setCookie) {
    res.cookies.set(AB_COOKIE_NAME, setCookie, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });
  }

  return res;
}
