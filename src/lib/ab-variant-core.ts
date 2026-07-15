import type { NextRequest } from 'next/server';

export const AB_COOKIE_NAME = 'ab_pdf_funnel_v1';
export const AB_HEADER_NAME = 'x-ab-variant';
export const AB_VARIANTS = ['a', 'b'] as const;
export type AbVariant = (typeof AB_VARIANTS)[number];

/** Set to true to re-enable 50/50 assignment between variants a and b. */
export const AB_TEST_ENABLED = false;

/** Live funnel variant while A/B test is paused (variant B won pdf_funnel_v1). */
export const AB_PRODUCTION_VARIANT: AbVariant = 'b';

export const AB_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const BOT_RE =
  /bot|crawler|spider|crawling|preview|whatsapp|facebook|telegram|slack/i;

export function getDefaultVariant(): AbVariant {
  return AB_TEST_ENABLED ? 'a' : AB_PRODUCTION_VARIANT;
}

export function parseVariant(v?: string | null): AbVariant {
  if (v === 'a' || v === 'b') return v;
  return getDefaultVariant();
}

/** When the test is paused, production always uses AB_PRODUCTION_VARIANT; dev overrides still work. */
export function resolveEffectiveVariant(
  variant?: string | null,
  { isDev = process.env.NODE_ENV !== 'production' } = {},
): AbVariant {
  const parsed = variant === 'a' || variant === 'b' ? variant : null;
  if (AB_TEST_ENABLED) {
    return parsed ?? getDefaultVariant();
  }
  if (isDev && parsed) {
    return parsed;
  }
  return AB_PRODUCTION_VARIANT;
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
      return { variant: getDefaultVariant(), setCookie: 'reset' };
    }
    if (queryAb === 'a' || queryAb === 'b') {
      return { variant: queryAb, setCookie: queryAb };
    }
    const forced = process.env.AB_FORCE_VARIANT;
    if (forced === 'a' || forced === 'b') {
      return { variant: forced, setCookie: existing ? null : forced };
    }
  }

  if (!AB_TEST_ENABLED) {
    const variant = AB_PRODUCTION_VARIANT;
    if (existing === variant) {
      return { variant, setCookie: null };
    }
    return { variant, setCookie: variant };
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

  if (!AB_TEST_ENABLED) {
    if (isDev) {
      if (headerVariant === 'a' || headerVariant === 'b') {
        return headerVariant;
      }
      if (cookieVariant === 'a' || cookieVariant === 'b') {
        return cookieVariant;
      }
    }
    return AB_PRODUCTION_VARIANT;
  }

  if (headerVariant === 'a' || headerVariant === 'b') {
    return headerVariant;
  }

  if (cookieVariant === 'a' || cookieVariant === 'b') {
    return cookieVariant;
  }

  return getDefaultVariant();
}

export function isProductionCookie(): boolean {
  return (
    process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  );
}
