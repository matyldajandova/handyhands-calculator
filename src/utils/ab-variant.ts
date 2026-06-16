import {
  AB_COOKIE_NAME,
  parseVariant,
  type AbVariant,
} from '@/lib/ab-variant-core';

export {
  AB_COOKIE_NAME,
  AB_HEADER_NAME,
  AB_VARIANTS,
  AB_COOKIE_MAX_AGE,
  parseVariant,
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
  if (typeof document === 'undefined') return 'a';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AB_COOKIE_NAME}=([^;]*)`),
  );
  return parseVariant(match?.[1] ? decodeURIComponent(match[1]) : null);
}
