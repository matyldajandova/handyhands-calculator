import {
  AB_COOKIE_NAME,
  getDefaultVariant,
  resolveEffectiveVariant,
  type AbVariant,
} from '@/lib/ab-variant-core';

export {
  AB_COOKIE_NAME,
  AB_HEADER_NAME,
  AB_VARIANTS,
  AB_COOKIE_MAX_AGE,
  AB_TEST_ENABLED,
  AB_PRODUCTION_VARIANT,
  getDefaultVariant,
  parseVariant,
  resolveEffectiveVariant,
  variantLabel,
  variantDisplayName,
  resolveAbVariant,
  resolveVariantForPage,
  type AbVariant,
  type AbSetCookie,
} from '@/lib/ab-variant-core';

export {
  AB_TEST_NAME,
  trackAbEvent,
  type AbTrackEvent,
  type AbEventExtra,
} from '@/utils/ab-analytics';

/** Read variant from document.cookie (client-only). */
export function getAbVariantClient(): AbVariant {
  if (typeof document === 'undefined') return getDefaultVariant();
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AB_COOKIE_NAME}=([^;]*)`),
  );
  return resolveEffectiveVariant(
    match?.[1] ? decodeURIComponent(match[1]) : null,
  );
}
