'use server';

import { revalidatePath } from 'next/cache';
import { pcstClient } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';
import { requireAdmin } from '@/lib/admin/guard';

/**
 * The words on the School Trips home page and Health & Safety page.
 *
 * Only the fields edited here are stored; the School Trips site merges them
 * over the defaults in its own code. That means a field left blank keeps the
 * wording that ships with the site rather than emptying it, and a new field
 * added there needs nothing doing here.
 */

export type StHomeContent = {
  heroImage: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  lede: string;
  ctaPrimary: string;
  ctaSecondary: string;
  introEyebrow: string;
  introHeadline: string;
  introHeadlineAccent: string;
  introParagraphs: string[];
};

export type StSafetyContent = {
  heroImage: string;
  heroTitle: string;
  heroSub: string;
  intro: string;
  sections: { title: string; intro: string; points: string[] }[];
  closingTitle: string;
  closingText: string;
};

export type StWebsiteState = { ok: boolean; message: string } | null;

async function readKey(key: string) {
  const db = pcstClient();
  const { data, error } = await db.from('site_settings').select('value').eq('key', key).maybeSingle();
  if (error) {
    if (/relation|schema cache/i.test(error.message)) {
      throw new Error(
        'The site_settings table is missing — run the School Trips migration 20260830000000_site_settings.sql first.',
      );
    }
    throw new Error(error.message);
  }
  return (data?.value ?? {}) as any;
}

export async function getStHomeContent(): Promise<{ saved: any; error?: string }> {
  await requireAdmin();
  try {
    return { saved: await readKey('site') };
  } catch (e: any) {
    return { saved: {}, error: e.message };
  }
}

export async function getStSafetyContent(): Promise<{ saved: any; error?: string }> {
  await requireAdmin();
  try {
    return { saved: await readKey('safety_page') };
  } catch (e: any) {
    return { saved: {}, error: e.message };
  }
}

/** Blank means "leave the shipped wording alone", so empties are dropped. */
function pruned(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

async function save(key: string, value: Record<string, unknown>) {
  const db = pcstClient();
  const { error } = await db
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) {
    if (/relation|schema cache/i.test(error.message)) {
      return 'The site_settings table is missing — run the School Trips migration first.';
    }
    return error.message;
  }
  return null;
}

export async function saveStHome(_prev: StWebsiteState, formData: FormData): Promise<StWebsiteState> {
  await requireAdmin();

  const paragraphs = JSON.parse(String(formData.get('intro_paragraphs') ?? '[]')) as string[];
  const value = {
    hero: pruned({
      heroImage: String(formData.get('hero_image') ?? '').trim(),
      eyebrow: String(formData.get('eyebrow') ?? '').trim(),
      headline: String(formData.get('headline') ?? '').trim(),
      headlineAccent: String(formData.get('headline_accent') ?? '').trim(),
      lede: String(formData.get('lede') ?? '').trim(),
      ctaPrimary: String(formData.get('cta_primary') ?? '').trim(),
      ctaSecondary: String(formData.get('cta_secondary') ?? '').trim(),
    }),
    intro: pruned({
      eyebrow: String(formData.get('intro_eyebrow') ?? '').trim(),
      headline: String(formData.get('intro_headline') ?? '').trim(),
      headlineAccent: String(formData.get('intro_headline_accent') ?? '').trim(),
      paragraphs: paragraphs.map((p) => String(p).trim()).filter(Boolean),
    }),
  };

  const error = await save('site', value);
  if (error) return { ok: false, message: error };

  revalidatePath('/admin/school-trips/website');
  // The School Trips site is a separate deployment; without this the change
  // sits in the database and the public page keeps serving the old copy.
  await revalidatePcst(null);
  return { ok: true, message: 'Home page saved. The website updates within a minute.' };
}

export async function saveStSafety(_prev: StWebsiteState, formData: FormData): Promise<StWebsiteState> {
  await requireAdmin();

  const sections = JSON.parse(String(formData.get('sections') ?? '[]')) as {
    title: string;
    intro: string;
    points: string[];
  }[];

  const value = pruned({
    heroImage: String(formData.get('hero_image') ?? '').trim(),
    heroTitle: String(formData.get('hero_title') ?? '').trim(),
    heroSub: String(formData.get('hero_sub') ?? '').trim(),
    intro: String(formData.get('intro') ?? '').trim(),
    sections: sections
      .filter((s) => s.title?.trim())
      .map((s) => ({
        title: s.title.trim(),
        intro: (s.intro ?? '').trim(),
        points: (s.points ?? []).map((p) => String(p).trim()).filter(Boolean),
      })),
    closing: pruned({
      title: String(formData.get('closing_title') ?? '').trim(),
      text: String(formData.get('closing_text') ?? '').trim(),
    }),
  });

  const error = await save('safety_page', value);
  if (error) return { ok: false, message: error };

  revalidatePath('/admin/school-trips/website');
  await revalidatePcst(null);
  return { ok: true, message: 'Health & Safety page saved. The website updates within a minute.' };
}
