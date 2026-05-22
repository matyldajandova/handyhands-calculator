import type { NextRequest } from 'next/server';

export const AB_COOKIE_NAME = 'ab_pdf_funnel_v1';
export const AB_HEADER_NAME = 'x-ab-variant';
export const AB_VARIANTS = ['a', 'b'] as const;
export type AbVariant = (typeof AB_VARIANTS)[number];

export const AB_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const BOT_RE =
  /bot|crawler|spider|crawling|preview|whatsapp|facebook|telegram|slack/i;

export function parseVariant(v?: string | null): AbVariant {
  return v === 'b' ? 'b' : 'a';
}

export function variantLabel(v: AbVariant): string {
  return v === 'b' ? 'B - email gate' : 'A - control';
}

export function variantDisplayName(v: AbVariant): string {
  return v === 'b' ? 'email gate' : 'control';
}

export type AbSetCookie = AbVariant | 'reset' | null;

/** Dev-only: ?ab=a | ?ab=b forces variant; ?ab=reset clears cookie. */
export function resolveAbVariant(req: NextRequest): {
  variant: AbVariant;
  setCookie: AbSetCookie;
} {
  const isDev = process.env.NODE_ENV !== 'production';
  const existing = req.cookies.get(AB_COOKIE_NAME)?.value;
  const queryAb = req.nextUrl.searchParams.get('ab');

  if (isDev) {
    if (queryAb === 'reset') {
      return { variant: 'a', setCookie: 'reset' };
    }
    if (queryAb === 'a' || queryAb === 'b') {
      return { variant: queryAb, setCookie: queryAb };
    }
    const forced = process.env.AB_FORCE_VARIANT;
    if (forced === 'a' || forced === 'b') {
      return { variant: forced, setCookie: existing ? null : forced };
    }
  }

  const isBot = BOT_RE.test(req.headers.get('user-agent') ?? '');
  if (existing === 'a' || existing === 'b') {
    return { variant: existing, setCookie: null };
  }
  const variant: AbVariant = isBot ? 'a' : Math.random() < 0.5 ? 'a' : 'b';
  return { variant, setCookie: isBot ? null : variant };
}

/** Resolve variant for server components (header, cookie, optional dev query). */
export function resolveVariantForPage(options: {
  headerVariant?: string | null;
  cookieVariant?: string | null;
  queryAb?: string | null;
}): AbVariant {
  const { headerVariant, cookieVariant, queryAb } = options;
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev && (queryAb === 'a' || queryAb === 'b')) {
    return queryAb;
  }

  if (headerVariant === 'a' || headerVariant === 'b') {
    return headerVariant;
  }

  if (cookieVariant === 'a' || cookieVariant === 'b') {
    return cookieVariant;
  }

  return 'a';
}

export function isProductionCookie(): boolean {
  return (
    process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  );
}
