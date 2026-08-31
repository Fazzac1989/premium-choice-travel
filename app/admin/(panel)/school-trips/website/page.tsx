import StWebsiteEditor from '@/components/admin/StWebsiteEditor';
import { requireAdmin } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Website content — School Trips' };

/**
 * Read what the School Trips site is publishing right now.
 *
 * From the site itself rather than from a second copy of its defaults: the
 * endpoint returns exactly what the pages render, so the editor cannot show
 * stale wording, and nothing has to be kept in step by hand.
 */
async function liveContent() {
  const base = process.env.PCST_SITE_URL;
  const secret = process.env.PCST_REVALIDATE_SECRET;
  if (!base || !secret) {
    return { site: null, safety: null, warning: 'PCST_SITE_URL or PCST_REVALIDATE_SECRET is not set, so the current wording could not be read.' };
  }
  try {
    const res = await fetch(`${base}/api/site-content?secret=${encodeURIComponent(secret)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return { site: null, safety: null, warning: `The School Trips site returned ${res.status} when asked for its content.` };
    }
    const json = await res.json();
    return { site: json.site, safety: json.safety, warning: undefined as string | undefined };
  } catch (e: any) {
    return { site: null, safety: null, warning: `Could not reach the School Trips site: ${e?.message}` };
  }
}

export default async function StWebsitePage() {
  await requireAdmin();
  const { site, safety, warning } = await liveContent();

  return (
    <StWebsiteEditor
      warning={warning}
      home={{
        heroImage: site?.hero?.heroImage ?? '',
        eyebrow: site?.hero?.eyebrow ?? '',
        headline: site?.hero?.headline ?? '',
        headlineAccent: site?.hero?.headlineAccent ?? '',
        lede: site?.hero?.lede ?? '',
        ctaPrimary: site?.hero?.ctaPrimary ?? '',
        ctaSecondary: site?.hero?.ctaSecondary ?? '',
        introEyebrow: site?.intro?.eyebrow ?? '',
        introHeadline: site?.intro?.headline ?? '',
        introHeadlineAccent: site?.intro?.headlineAccent ?? '',
        introParagraphs: site?.intro?.paragraphs ?? [],
      }}
      safety={{
        heroImage: safety?.heroImage ?? '',
        heroTitle: safety?.heroTitle ?? '',
        heroSub: safety?.heroSub ?? '',
        intro: safety?.intro ?? '',
        sections: safety?.sections ?? [],
        closingTitle: safety?.closing?.title ?? '',
        closingText: safety?.closing?.text ?? '',
      }}
    />
  );
}
