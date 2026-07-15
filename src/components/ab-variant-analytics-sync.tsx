'use client';

import { useEffect } from 'react';
import { sendGTMEvent } from '@next/third-parties/google';
import type { AbVariant } from '@/lib/ab-variant-core';
import { AB_TEST_NAME } from '@/utils/ab-analytics';
import { AB_TEST_ENABLED } from '@/lib/ab-variant-core';

const EXPOSURE_SESSION_KEY = 'ab_exposure_sent';

/** Fires one ab_exposure dataLayer event per browser session on funnel pages. */
export function AbVariantAnalyticsSync({ variant }: { variant: AbVariant }) {
  useEffect(() => {
    if (!AB_TEST_ENABLED) return;
    if (typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem(EXPOSURE_SESSION_KEY)) return;

    sessionStorage.setItem(EXPOSURE_SESSION_KEY, variant);
    sendGTMEvent({
      event: 'ab_exposure',
      ab_variant: variant,
      ab_test_name: AB_TEST_NAME,
    });
  }, [variant]);

  return null;
}
