'use client';

import { track } from '@vercel/analytics';
import { sendGTMEvent } from '@next/third-parties/google';
import type { AbVariant } from '@/lib/ab-variant-core';

export const AB_TEST_NAME = 'pdf_funnel_v1';
const CURRENCY = 'CZK';

const VIEW_ITEM_SESSION_PREFIX = 'view_item_sent:';

export type AbTrackEvent =
  | 'ab_funnel_view'
  | 'ab_pdf_download'
  | 'ab_poptavka_submit';

export type AbEventExtra = {
  serviceType?: string;
  serviceTitle?: string;
  price?: number;
  hash?: string;
};

function normalizeExtra(
  extra?: Record<string, string | number | boolean | null>,
): AbEventExtra {
  return {
    serviceType:
      typeof extra?.serviceType === 'string' ? extra.serviceType : undefined,
    serviceTitle:
      typeof extra?.serviceTitle === 'string' ? extra.serviceTitle : undefined,
    price: typeof extra?.price === 'number' ? extra.price : undefined,
    hash: typeof extra?.hash === 'string' ? extra.hash : undefined,
  };
}

function buildViewItemPayload(variant: AbVariant, extra: AbEventExtra) {
  const serviceType = extra.serviceType || '';
  const serviceTitle = extra.serviceTitle || serviceType;
  const value = extra.price ?? 0;

  return {
    event: 'view_item',
    ab_variant: variant,
    ab_test_name: AB_TEST_NAME,
    currency: CURRENCY,
    value,
    items: [
      {
        item_id: serviceType,
        item_name: serviceTitle,
        price: value,
      },
    ],
  };
}

function buildGenerateLeadPayload(
  variant: AbVariant,
  leadType: 'pdf_download' | 'poptavka',
  extra: AbEventExtra,
) {
  return {
    event: 'generate_lead',
    ab_variant: variant,
    ab_test_name: AB_TEST_NAME,
    lead_type: leadType,
    service_type: extra.serviceType || '',
    currency: CURRENCY,
    value: extra.price ?? 0,
  };
}

function shouldSkipViewItemGtm(hash?: string): boolean {
  if (!hash || typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(`${VIEW_ITEM_SESSION_PREFIX}${hash}`) === '1';
}

function markViewItemSent(hash?: string): void {
  if (!hash || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(`${VIEW_ITEM_SESSION_PREFIX}${hash}`, '1');
}

function pushGtmEvent(
  event: AbTrackEvent,
  variant: AbVariant,
  extra: AbEventExtra,
): void {
  if (typeof window === 'undefined') return;

  if (event === 'ab_funnel_view') {
    if (shouldSkipViewItemGtm(extra.hash)) return;
    sendGTMEvent(buildViewItemPayload(variant, extra));
    markViewItemSent(extra.hash);
    return;
  }

  if (event === 'ab_pdf_download') {
    sendGTMEvent(
      buildGenerateLeadPayload(variant, 'pdf_download', extra),
    );
    return;
  }

  sendGTMEvent(buildGenerateLeadPayload(variant, 'poptavka', extra));
}

/** Dual-fire: Vercel Analytics (ab_* events) + GTM dataLayer (GA4 standard events). */
export function trackAbEvent(
  event: AbTrackEvent,
  variant: AbVariant,
  extra?: Record<string, string | number | boolean | null>,
) {
  const normalized = normalizeExtra(extra);

  const vercelPayload: Record<string, string | number | boolean | null> = {
    variant,
    ...extra,
  };

  if (event === 'ab_pdf_download') {
    vercelPayload.lead_type = 'pdf_download';
  } else if (event === 'ab_poptavka_submit') {
    vercelPayload.lead_type = 'poptavka';
  }

  track(event, vercelPayload);
  pushGtmEvent(event, variant, normalized);
}
