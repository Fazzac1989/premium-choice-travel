'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';

/**
 * Shutterstock integration for the admin image pickers.
 * Search shows watermarked previews; picking an image licenses it through the
 * account's API subscription and ingests the clean file into our own storage
 * (never hotlinked). If the plan has no API licensing, the UI gets a link to
 * license the image on shutterstock.com instead.
 */

const API = 'https://api.shutterstock.com/v2';

export type StockResult = {
  id: string;
  description: string;
  thumb: string;
  pageUrl: string;
};

export type StockSearchState =
  | { ok: true; results: StockResult[]; page: number; totalPages: number }
  | { ok: false; error: string; notConfigured?: boolean };

const token = () => process.env.SHUTTERSTOCK_API_TOKEN;

export async function shutterstockSearch(query: string, page = 1): Promise<StockSearchState> {
  await requireAdmin();
  const t = token();
  if (!t) {
    return {
      ok: false,
      notConfigured: true,
      error: 'Shutterstock is not connected yet — add SHUTTERSTOCK_API_TOKEN to the environment.',
    };
  }
  const q = query.trim();
  if (!q) return { ok: true, results: [], page: 1, totalPages: 0 };

  const res = await fetch(
    `${API}/images/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}&sort=relevance&image_type=photo`,
    { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' }
  );
  if (res.status === 401) {
    return { ok: false, error: 'Shutterstock rejected the token — regenerate it at developers.shutterstock.com and update SHUTTERSTOCK_API_TOKEN.' };
  }
  if (!res.ok) {
    return { ok: false, error: `Shutterstock search failed (HTTP ${res.status}) — try again in a moment.` };
  }
  const json: any = await res.json();
  const results: StockResult[] = (json.data ?? []).map((r: any) => ({
    id: String(r.id),
    description: String(r.description ?? '').slice(0, 140),
    thumb: r.assets?.huge_thumb?.url || r.assets?.preview?.url || r.assets?.large_thumb?.url || '',
    pageUrl: `https://www.shutterstock.com/image-photo/${r.id}`,
  }));
  return {
    ok: true,
    results: results.filter((r) => r.thumb),
    page,
    totalPages: Math.min(20, Math.ceil((json.total_count ?? 0) / 24)),
  };
}

export type StockLicenseState =
  | { ok: true; url: string }
  | { ok: false; error: string; pageUrl?: string; licenseUnavailable?: boolean };

export async function shutterstockLicense(imageId: string): Promise<StockLicenseState> {
  await requireAdmin();
  const t = token();
  if (!t) return { ok: false, error: 'Shutterstock is not connected yet.' };
  const pageUrl = `https://www.shutterstock.com/image-photo/${imageId}`;

  // 1) License the image through the API subscription.
  const lic = await fetch(`${API}/images/licenses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: [{ image_id: imageId, size: 'huge' }] }),
  });
  if (!lic.ok) {
    const body = (await lic.text()).slice(0, 300);
    console.error('[shutterstock license]', lic.status, body);
    return {
      ok: false,
      licenseUnavailable: true,
      pageUrl,
      error:
        lic.status === 403 || lic.status === 401
          ? 'Your Shutterstock plan doesn’t allow licensing through the API — open the image on Shutterstock to license it there, then upload the file.'
          : `Licensing failed (HTTP ${lic.status}) — you may be out of API downloads, or the plan doesn’t cover this size.`,
    };
  }
  const licJson: any = await lic.json();
  const entry = licJson.data?.[0];
  const downloadUrl = entry?.download?.url;
  if (!downloadUrl) {
    console.error('[shutterstock license] no download url', JSON.stringify(licJson).slice(0, 300));
    return { ok: false, licenseUnavailable: true, pageUrl, error: entry?.error || 'Shutterstock returned no download for that image.' };
  }

  // 2) Ingest the clean file into our own storage — never hotlink.
  const img = await fetch(downloadUrl);
  if (!img.ok) return { ok: false, error: `Download failed (HTTP ${img.status}) — try again.`, pageUrl };
  const buffer = Buffer.from(await img.arrayBuffer());
  const contentType = img.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const path = `shutterstock/${imageId}.${ext}`;

  const db = createAdminClient();
  const { error } = await db.storage.from('images').upload(path, buffer, {
    contentType,
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) {
    console.error('[shutterstock upload]', error.message);
    return { ok: false, error: 'Licensed, but storing the file failed — try picking it again.', pageUrl };
  }
  const {
    data: { publicUrl },
  } = db.storage.from('images').getPublicUrl(path);
  return { ok: true, url: publicUrl };
}
