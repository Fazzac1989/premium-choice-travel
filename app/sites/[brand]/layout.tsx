import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import BrandHeader, { type HeaderDestinationGroup } from '@/components/brand-site/BrandHeader';
import BrandFooter from '@/components/brand-site/BrandFooter';
import AppTabBar from '@/components/brand-site/AppTabBar';
import PwaSetup from '@/components/brand-site/PwaSetup';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestinations } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string } }): Promise<Metadata> {
  const brand = getBrand(params.brand);
  if (!brand) return {};
  const isStaycations = brand.slug === 'staycations';
  return {
    title: { default: brand.name, template: `%s — ${brand.name}` },
    description: brand.description,
    // Staycations installs as an app that opens on the hotel list.
    ...(isStaycations
      ? {
          manifest: '/manifest.webmanifest',
          appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Staycations' },
          icons: { apple: '/images/pwa/apple-touch-icon.png' },
        }
      : {}),
  };
}

export function generateViewport({ params }: { params: { brand: string } }): Viewport {
  const brand = getBrand(params.brand);
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    ...(brand?.slug === 'staycations' ? { themeColor: '#16242E' } : {}),
  };
}

/** Regions and per-region cap for the landscape destinations dropdown. */
const DROPDOWN_REGIONS = ['Indian Ocean', 'Asia', 'Europe', 'Middle East', 'Africa'];

export default async function BrandSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { brand: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();
  const base = brandBase(brand);
  const isHolidays = brand.slug === 'holidays';
  const isStaycations = brand.slug === 'staycations';

  let destinationGroups: HeaderDestinationGroup[] = [];
  if (isHolidays) {
    const all = (await getDestinations()).filter((d) => d.region !== 'Cruise Seas');
    destinationGroups = DROPDOWN_REGIONS.map((region) => ({
      region,
      items: all
        .filter((d) => d.region === region)
        .sort((a, b) => a.priorityRank - b.priorityRank)
        .slice(0, 8)
        .map((d) => ({ slug: d.slug, name: d.name })),
    })).filter((g) => g.items.length > 0);
  }

  return (
    <>
      <BrandHeader
        base={base}
        name={brand.name}
        logo={brand.logo}
        logoWhite={brand.logoWhite}
        isHolidays={isHolidays}
        isStaycations={isStaycations}
        destinationGroups={destinationGroups}
      />
      {children}
      {/* In app mode the marketing footer gives way to the tab bar. */}
      <div className={isStaycations ? 'pwa-hidden' : undefined}>
        <BrandFooter
          name={brand.name}
          description={brand.description}
          logoWhite={brand.logoWhite}
          base={base}
          isHolidays={isHolidays}
          isStaycations={isStaycations}
        />
      </div>
      {isStaycations && (
        <>
          <AppTabBar base={base} />
          <PwaSetup base={base} />
        </>
      )}
    </>
  );
}
