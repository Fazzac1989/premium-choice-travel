'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';
import { searchCommonsBroadening, queriesForTrip, type Candidate } from '@/lib/images/commons';
import { searchShutterstock, licenseShutterstock, isShutterstockCandidate, shutterstockId, ShutterstockBusyError } from '@/lib/images/shutterstock';
import sharp from 'sharp';

/**
 * Photography curation for School Trips.
 *
 * Nothing is published automatically. Shortlists are proposed, a human approves,
 * and approving downloads a hosted copy and records the photographer, licence
 * and source so attribution can always be honoured.
 */

const BUCKET = 'trip-images';

export type ImageResult = { ok: true; id?: number } | { ok: false; error: string };

export type Shortlist = {
  role: string;
  label: string;
  query: string;
  usedQuery: string;
  candidates: Candidate[];
};

const NOT_CONFIGURED = { ok: false, error: 'School Trips database is not configured.' } as const;

/** Build the shortlists for a trip, ready for a human to choose from. */
export async function shortlistForStTrip(tripId: number): Promise<
  | {
      ok: true;
      trip: { id: number; title: string; subject: string | null; country: string | null };
      shortlists: Shortlist[];
    }
  | { ok: false; error: string }
> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  const { data: trip } = await db
    .from('trips')
    .select('id, title, city, subjects(name), countries(name)')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return { ok: false, error: 'Trip not found.' };

  const meta = {
    title: trip.title,
    subject: (trip.subjects as any)?.name ?? null,
    country: (trip.countries as any)?.name ?? null,
    city: trip.city,
  };

  const plans = queriesForTrip(meta);
  const shortlists: Shortlist[] = [];
  for (const p of plans) {
    // Shutterstock first; Commons only when a search genuinely finds nothing.
    let candidates: Candidate[] = [];
    let usedQuery = p.query;
    try {
      candidates = await searchShutterstock(p.query, {
        minWidth: p.role === 'hero' ? 2400 : 1600,
        landscapeOnly: p.landscapeOnly,
        limit: 18,
      });
    } catch (e) {
      if (e instanceof ShutterstockBusyError) return { ok: false, error: e.message };
      throw e;
    }
    if (!candidates.length) {
      const commons = await searchCommonsBroadening(p.query, {
        minWidth: p.role === 'hero' ? 2400 : 1600,
        landscapeOnly: p.landscapeOnly,
        limit: 18,
      });
      candidates = commons.candidates;
      usedQuery = commons.usedQuery;
    }
    shortlists.push({
      role: p.role,
      label: p.label,
      query: p.query,
      usedQuery,
      candidates: candidates.slice(0, 8),
    });
  }

  return {
    ok: true,
    trip: { id: trip.id, title: trip.title, subject: meta.subject, country: meta.country },
    shortlists,
  };
}

/** Search Commons directly, for when a shortlist misses. */
export async function searchStImages(
  query: string,
  landscapeOnly = false
): Promise<{ ok: true; candidates: Candidate[] } | { ok: false; error: string }> {
  await requireAdmin();
  if (!query.trim()) return { ok: false, error: 'Enter something to search for.' };

  try {
    const stock = await searchShutterstock(query, { minWidth: 1600, landscapeOnly, limit: 24 });
    if (stock.length) return { ok: true, candidates: stock.slice(0, 12) };
  } catch (e) {
    // Quota spent — say so rather than silently serving Commons.
    if (e instanceof ShutterstockBusyError) return { ok: false, error: e.message };
    throw e;
  }
  const { candidates } = await searchCommonsBroadening(query, {
    minWidth: 1600,
    landscapeOnly,
    limit: 24,
  });
  return { ok: true, candidates: candidates.slice(0, 12) };
}

/** A scaled copy, so a web-sized file is stored rather than a 20MB original. */
const scaledUrl = (title: string, width: number) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=${width}`;

async function draftAltText(c: Candidate, tripTitle: string, label: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return '';
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 300,
      output_config: { effort: 'low' },
      system:
        'Write alt text for a photograph on a school-travel website. One sentence, under 120 characters, ' +
        'describing what is visible. British English. Never begin with "Image of" or "Photo of", and never ' +
        'keyword-stuff. If the source information is too vague to describe the picture, reply with the ' +
        'single word UNKNOWN.',
      messages: [
        {
          role: 'user',
          content:
            `File title: ${c.title}\n` +
            `Source description: ${c.description ?? '(none)'}\n` +
            `Used on the trip: ${tripTitle}\n` +
            `Role on the page: ${label}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    const text = block && block.type === 'text' ? block.text.trim() : '';
    return text === 'UNKNOWN' ? '' : text.replace(/^["']|["']$/g, '').slice(0, 200);
  } catch {
    return '';
  }
}

/** Approve a candidate: host a copy, keep the rights metadata, draft alt text. */
export async function approveStImage(input: {
  tripId: number;
  role: 'hero' | 'gallery' | 'card' | 'itinerary';
  label: string;
  candidate: Candidate;
  sortOrder: number;
  itineraryDayId?: number | null;
}): Promise<ImageResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  const { data: trip } = await db
    .from('trips')
    .select('id, slug, title')
    .eq('id', input.tripId)
    .maybeSingle();
  if (!trip) return { ok: false, error: 'Trip not found.' };

  // Widths kept modest: Supabase storage rejected the 4000px originals.
  const fromShutterstock = isShutterstockCandidate(input.candidate);
  const targetWidth = input.role === 'hero' ? 2600 : 1800;
  let bytes: Buffer;
  try {
    if (fromShutterstock) {
      // Licenses on the account's plan, then a web-sized copy is stored.
      const raw = await licenseShutterstock(shutterstockId(input.candidate));
      bytes = await sharp(raw).resize({ width: targetWidth, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    } else {
      const res = await fetch(scaledUrl(input.candidate.title, targetWidth), {
        headers: { 'User-Agent': 'PremiumChoiceTravel/1.0 (info@premiumchoicetravel.com)' },
      });
      if (!res.ok) return { ok: false, error: `Could not download that image (${res.status}).` };
      bytes = Buffer.from(await res.arrayBuffer());
    }
  } catch (e: any) {
    return { ok: false, error: `Download failed: ${e.message}` };
  }
  if (bytes.length > 12 * 1024 * 1024) {
    return { ok: false, error: 'That file is unusually large — pick another.' };
  }

  const ext = input.candidate.mime === 'image/png' ? 'png' : 'jpg';
  const path = `curated/${trip.slug}/${input.role}-${Date.now()}.${ext}`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: input.candidate.mime === 'image/png' ? 'image/png' : 'image/jpeg',
    cacheControl: '31536000',
  });
  if (upErr) return { ok: false, error: upErr.message };

  const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const alt = await draftAltText(input.candidate, trip.title, input.label);

  // Only one hero per trip: retire any previous one.
  if (input.role === 'hero') {
    await db.from('trip_images').delete().eq('trip_id', input.tripId).eq('role', 'hero');
  }

  const { data: inserted, error } = await db
    .from('trip_images')
    .insert({
      trip_id: input.tripId,
      role: input.role,
      itinerary_day_id: input.itineraryDayId ?? null,
      url,
      alt_text: alt,
      caption: input.candidate.description?.slice(0, 160) ?? null,
      width: input.candidate.width,
      height: input.candidate.height,
      bytes: bytes.length,
      source: fromShutterstock ? 'Shutterstock' : 'Wikimedia Commons',
      source_url: input.candidate.sourceUrl,
      photographer: input.candidate.photographer,
      licence: input.candidate.licence,
      attribution_required: fromShutterstock
        ? false
        : !/^(cc0|public domain|pdm)/i.test(input.candidate.licence ?? ''),
      downloaded_at: new Date().toISOString(),
      sort_order: input.sortOrder,
      approved: true,
    })
    .select('id')
    .single();
  if (error) {
    // Do not leave an orphaned file behind if the row could not be written.
    await db.storage.from(BUCKET).remove([path]);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/school-trips/images');
  await revalidatePcst(trip.slug);
  return { ok: true, id: inserted.id };
}

export async function updateStImage(
  id: number,
  fields: { altText?: string; caption?: string; focalX?: number; focalY?: number; sortOrder?: number }
): Promise<ImageResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const patch: Record<string, unknown> = {};
  if (fields.altText !== undefined) patch.alt_text = fields.altText;
  if (fields.caption !== undefined) patch.caption = fields.caption || null;
  if (fields.focalX !== undefined) patch.focal_x = fields.focalX;
  if (fields.focalY !== undefined) patch.focal_y = fields.focalY;
  if (fields.sortOrder !== undefined) patch.sort_order = fields.sortOrder;
  if (Object.keys(patch).length === 0) return { ok: true };

  const db = pcstClient();
  const { data, error } = await db
    .from('trip_images')
    .update(patch)
    .eq('id', id)
    .select('trip_id')
    .single();
  if (error) return { ok: false, error: error.message };

  const { data: trip } = await db.from('trips').select('slug').eq('id', data.trip_id).maybeSingle();
  revalidatePath('/admin/school-trips/images');
  if (trip) await revalidatePcst(trip.slug);
  return { ok: true };
}

export async function deleteStImage(id: number): Promise<ImageResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  const { data: image } = await db
    .from('trip_images')
    .select('url, trip_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await db.from('trip_images').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  // Remove the hosted copy too, so storage does not fill with unused files.
  const marker = `/${BUCKET}/`;
  const path = image?.url?.includes(marker) ? image.url.split(marker)[1] : null;
  if (path) await db.storage.from(BUCKET).remove([decodeURIComponent(path)]);

  if (image?.trip_id) {
    const { data: trip } = await db.from('trips').select('slug').eq('id', image.trip_id).maybeSingle();
    if (trip) await revalidatePcst(trip.slug);
  }
  revalidatePath('/admin/school-trips/images');
  return { ok: true };
}
