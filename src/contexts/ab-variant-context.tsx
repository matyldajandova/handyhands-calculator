'use client';

import { createContext, useContext } from 'react';
import type { AbVariant } from '@/lib/ab-variant-core';
import { AB_PRODUCTION_VARIANT } from '@/lib/ab-variant-core';

const AbVariantContext = createContext<AbVariant>(AB_PRODUCTION_VARIANT);

export function AbVariantProvider({
  variant,
  children,
}: {
  variant: AbVariant;
  children: React.ReactNode;
}) {
  return (
    <AbVariantContext.Provider value={variant}>
      {children}
    </AbVariantContext.Provider>
  );
}

export function useAbVariant(): AbVariant {
  return useContext(AbVariantContext);
}
