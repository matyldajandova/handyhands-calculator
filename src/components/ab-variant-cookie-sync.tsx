'use client';

import { useEffect } from 'react';
import {
  AB_COOKIE_MAX_AGE,
  AB_COOKIE_NAME,
  type AbVariant,
} from '@/lib/ab-variant-core';

/** Ensures the browser has ab_pdf_funnel_v1 when middleware Set-Cookie is dropped. */
export function AbVariantCookieSync({ variant }: { variant: AbVariant }) {
  useEffect(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${AB_COOKIE_NAME}=([^;]*)`),
    );
    const current = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (current === variant) return;

    const secure =
      typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? '; Secure'
        : '';
    document.cookie = `${AB_COOKIE_NAME}=${variant}; Path=/; Max-Age=${AB_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  }, [variant]);

  return null;
}
