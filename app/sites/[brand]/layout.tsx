import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import BrandHeader, { type HeaderDestinationGroup } from '@/components/brand-site/BrandHeader';
import BrandFooter from '@/components/brand-site/BrandFooter';
import PwaSetup from '@/components/brand-site/PwaSetup';
import { CoastalHeader, CoastalTabBar } from '@/components/staycations/coastal/CoastalNav';
import { ChromeProvider } from '@/components/staycations/coastal/Chrome';
import CoastalFooter from '@/components/staycations/coastal/CoastalFooter';
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
    // Staycations installs as an app that opens on Explore.
    ...(isStaycations
      ? {
          manifest: '/manifest.webmanifest',
          appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Staycations' },
          // Naming any icon here replaces the ones Next derives from
          // app/icon.png, so the tab icon has to be named too or the site
          // ends up with no favicon at all. It is the green Premium Choice
          // mark, the same one every other brand shows. The Apple icon is a
          // different thing — the installed app's home-screen icon — and
          // keeps the Staycations artwork.
          icons: {
            icon: [{ url: '/icon.png', type: 'image/png' }],
            shortcut: ['/icon.png'],
            apple: '/images/pwa/apple-touch-icon.png',
          },
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
    ...(brand?.slug === 'staycations' ? { themeColor: '#164B57' } : {}),
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
  // Every brand site but Corporate has an Offers page.
  const showOffers = brand.key !== 'corporate';

  // ── Staycations: the Coastal Calm app shell ──────────────────
  if (isStaycations) {
    return (
      <div className="coastal min-h-screen">
        <ChromeProvider>
          <CoastalHeader base={base} logo={brand.logo} logoWhite={brand.logoWhite} />
          <main>{children}</main>
          <CoastalFooter base={base} logoWhite={brand.logoWhite} description={brand.description} />
          <CoastalTabBar base={base} />
          <PwaSetup base={base} />
        </ChromeProvider>
      </div>
    );
  }

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
    <div className="coastal min-h-screen">
      <BrandHeader
        base={base}
        name={brand.name}
        logo={brand.logo}
        logoWhite={brand.logoWhite}
        isHolidays={isHolidays}
        isStaycations={false}
        showOffers={showOffers}
        destinationGroups={destinationGroups}
      />
      {children}
      <BrandFooter
        showOffers={showOffers}
        name={brand.name}
        description={brand.description}
        logoWhite={brand.logoWhite}
        base={base}
        isHolidays={isHolidays}
        isStaycations={false}
      />
    </div>
  );
}
