import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { loadPackageBrochure } from '@/lib/package-brochure/data';
import { gatherPackages, groupSpreads, orderByRegion } from '@/lib/package-brochure/spreads';
import { BRANDS } from '@/lib/brands';
import PackageBrochureSlides from '@/components/pkg-brochure/PackageBrochureSlides';

/**
 * A brochure, as the public reads it.
 *
 * Served from the root rather than from inside the brand tree — the middleware
 * lets /brochures through untouched — because a brochure is a full-screen deck
 * that prints to A4 and deliberately does not wear the site's header and
 * footer. Which brand it belongs to comes from the record.
 *
 * Rendered per request rather than statically: a brochure can be unlisted, and
 * that check has to happen before any content is sent.
 */
export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

const brandFor = (key: string) => BRANDS.find((b) => b.key === key) ?? BRANDS[0];

/** A QR that scans cleanly at about 25mm and inherits the brand ink. */
async function qr(url: string): Promise<string | null> {
  try {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#16242E', light: '#00000000' },
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return null; // a missing QR is not worth failing a brochure over
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await loadPackageBrochure(params.slug);
  if (result.state !== 'ok') return { title: 'Not found', robots: { index: false } };

  const { brochure } = result.data;
  const brand = brandFor(brochure.brand);
  return {
    title: brochure.seoTitle ?? `${brochure.title} — ${brand.name}`,
    description: brochure.seoDescription ?? brochure.subtitle ?? brand.description,
    // An unlisted brochure is reachable by link but not from a search engine.
    robots: brochure.visibility === 'public' ? undefined : { index: false, follow: false },
  };
}

export default async function BrochurePage({ params }: Props) {
  const result = await loadPackageBrochure(params.slug);
  if (result.state !== 'ok') notFound();

  const { brochure, pages, packages } = result.data;
  const brand = brandFor(brochure.brand);

  const visible = pages.filter((p) => !p.hidden);
  const closing = visible.find((p) => p.pageType === 'contact' || p.pageType === 'callToAction');

  // Region by region, destinations alphabetical inside. The contents and the
  // package pages read from the same array, so the sheets run in the order the
  // contents lists them.
  const spreads = orderByRegion(gatherPackages(visible, packages));

  const site = brand.domains[0] ? `https://www.${brand.domains[0]}` : 'https://www.premiumchoicetravel.com';

  return (
    <PackageBrochureSlides
      brochure={{
        ...brochure,
        // The closing page's own copy wins over the brochure's, when it has any.
        closingText: closing?.content.body?.[0] ?? brochure.closingText,
      }}
      spreads={spreads}
      groups={groupSpreads(spreads, 'region')}
      brand={{
        name: brand.name,
        // Every brand has both cuts today; the house mark is the fallback so a
        // brand added without artwork still prints something rather than a
        // broken image on the cover.
        logo: brand.logo ?? '/images/logo.png',
        logoWhite: brand.logoWhite ?? '/images/logo-white.png',
        site,
      }}
      pdfHref={`/api/brochures/${encodeURIComponent(brochure.slug)}/pdf`}
      brochureQrSvg={await qr(`${site}/brochures/${brochure.slug}`)}
    />
  );
}
