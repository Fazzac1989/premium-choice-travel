import { notFound } from 'next/navigation';
import CorporatePage from '@/components/corporate/CorporatePage';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { CORPORATE_PAGES } from '@/lib/corporate/content';

export const dynamic = 'force-dynamic';

const page = CORPORATE_PAGES['meetings-and-groups'];

export const metadata = { title: page.metaTitle, description: page.metaDescription };

/** A Premium Choice Corporate page; no other brand site has it. */
export default function Page({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.key !== 'corporate') notFound();
  return <CorporatePage base={brandBase(brand)} page={page} />;
}
