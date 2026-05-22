import { cookies, headers } from 'next/headers';
import { AbVariantCookieSync } from '@/components/ab-variant-cookie-sync';
import {
  AB_COOKIE_NAME,
  AB_HEADER_NAME,
  resolveVariantForPage,
} from '@/lib/ab-variant-core';

export const dynamic = 'force-dynamic';

export default async function PoptavkaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const cookieStore = await cookies();

  const variant = resolveVariantForPage({
    headerVariant: headersList.get(AB_HEADER_NAME),
    cookieVariant: cookieStore.get(AB_COOKIE_NAME)?.value,
  });

  return (
    <>
      <AbVariantCookieSync variant={variant} />
      {children}
    </>
  );
}
