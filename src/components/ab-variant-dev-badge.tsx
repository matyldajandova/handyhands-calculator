'use client';

import { useSearchParams } from 'next/navigation';
import type { AbVariant } from '@/utils/ab-variant';
import { AB_TEST_ENABLED, variantDisplayName } from '@/utils/ab-variant';

interface AbVariantDevBadgeProps {
  variant: AbVariant;
}

function buildAbHref(searchParams: URLSearchParams, ab: string): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set('ab', ab);
  const qs = params.toString();
  return qs ? `?${qs}` : `?ab=${ab}`;
}

export function AbVariantDevBadge({ variant }: AbVariantDevBadgeProps) {
  const searchParams = useSearchParams();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] rounded-lg border border-amber-500/50 bg-amber-50 px-3 py-2 text-xs shadow-md dark:bg-amber-950/90 dark:text-amber-100"
      role="status"
      aria-label={`A/B variant: ${variantDisplayName(variant)}`}
    >
      <span className="font-semibold text-amber-900 dark:text-amber-200">
        A/B: {variantDisplayName(variant)}
        {!AB_TEST_ENABLED ? ' (paused)' : ''}
      </span>
      <span className="mt-1 flex gap-2 text-amber-800 dark:text-amber-300">
        <a
          href={buildAbHref(searchParams, 'a')}
          className="underline hover:no-underline"
        >
          a
        </a>
        <span aria-hidden>·</span>
        <a
          href={buildAbHref(searchParams, 'b')}
          className="underline hover:no-underline"
        >
          b
        </a>
        <span aria-hidden>·</span>
        <a
          href={buildAbHref(searchParams, 'reset')}
          className="underline hover:no-underline"
        >
          reset
        </a>
      </span>
    </div>
  );
}
