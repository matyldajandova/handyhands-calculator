import { cookies, headers } from 'next/headers';
import {
  AB_HEADER_NAME,
  AB_COOKIE_NAME,
  resolveVariantForPage,
} from '@/utils/ab-variant';
import VysledekContent from './vysledek-content';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ ab?: string; hash?: string }>;
};

export default async function VysledekPage({ searchParams }: PageProps) {
  const { ab: queryAb } = await searchParams;
  const headersList = await headers();
  const cookieStore = await cookies();

  const variant = resolveVariantForPage({
    headerVariant: headersList.get(AB_HEADER_NAME),
    cookieVariant: cookieStore.get(AB_COOKIE_NAME)?.value,
    queryAb,
  });

  return <VysledekContent variant={variant} />;
}
