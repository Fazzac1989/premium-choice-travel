'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';
import { DEFAULT_TERMS, getQuoteById, nextQuoteRef, type QuoteLine } from '@/lib/quotes';
import { emailShell, sendEmail } from '@/lib/email';

export type QuoteActionState = { ok: boolean; message: string } | null;

/** Create a draft quote — optionally pre-filled from a package — and open the editor. */
export async function createQuote(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const packageId = formData.get('package_id') ? Number(formData.get('package_id')) : null;
  const ref = await nextQuoteRef();

  let row: Record<string, unknown> = {
    ref,
    title: 'New quote',
    status: 'draft',
    terms: DEFAULT_TERMS,
    currency: 'AED',
  };

  if (packageId) {
    const { data: pkg } = await db.from('packages').select('*').eq('id', packageId).maybeSingle();
    if (pkg) {
      row = {
        ...row,
        title: pkg.title,
        package_id: pkg.id,
        currency: pkg.currency ?? 'AED',
        hero_image: pkg.hero_image,
        images: pkg.gallery ?? [],
        itinerary: pkg.itinerary ?? [],
        inclusions: pkg.includes ?? [],
        exclusions: pkg.excludes ?? [],
      };
    }
  }

  const { data, error } = await db.from('quotes').insert(row).select('id').single();
  if (error) throw new Error(error.message);
  redirect(`/admin/quotes/${data.id}`);
}

export async function saveQuote(_prev: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const id = Number(formData.get('id'));
  if (!id) return { ok: false, message: 'Missing quote id.' };

  let payload: any;
  try {
    payload = JSON.parse(String(formData.get('payload') ?? '{}'));
  } catch {
    return { ok: false, message: 'Invalid data — please refresh and try again.' };
  }

  const {
    title, clientName, clientEmail, clientPhone, travelDates, validity,
    adults, children, notes, currency, heroImage, images, itinerary,
    inclusions, exclusions, terms, status, lines,
  } = payload;

  if (!title?.trim()) return { ok: false, message: 'The quote needs a title.' };

  const { error } = await db
    .from('quotes')
    .update({
      title: title.trim(),
      client_name: clientName?.trim() || null,
      client_email: clientEmail?.trim() || null,
      client_phone: clientPhone?.trim() || null,
      travel_dates: travelDates?.trim() || null,
      validity: validity || null,
      adults: adults === '' || adults === null ? null : Number(adults),
      children: children === '' || children === null ? null : Number(children),
      notes: notes?.trim() || null,
      currency: currency?.trim() || 'AED',
      hero_image: heroImage?.trim() || null,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      itinerary: Array.isArray(itinerary) ? itinerary : [],
      inclusions: Array.isArray(inclusions) ? inclusions.filter(Boolean) : [],
      exclusions: Array.isArray(exclusions) ? exclusions.filter(Boolean) : [],
      terms: Array.isArray(terms) ? terms.filter(Boolean) : [],
      status: ['draft', 'sent', 'accepted', 'declined', 'expired'].includes(status) ? status : 'draft',
    })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };

  // Replace lines wholesale — simplest reliable sync.
  await db.from('quote_lines').delete().eq('quote_id', id);
  const cleanLines: QuoteLine[] = (Array.isArray(lines) ? lines : []).filter(
    (l: any) => l.description?.trim()
  );
  if (cleanLines.length > 0) {
    const { error: linesError } = await db.from('quote_lines').insert(
      cleanLines.map((l: any, i: number) => ({
        quote_id: id,
        sort_order: i,
        description: String(l.description).trim(),
        qty: Number(l.qty) || 0,
        unit_cost: Number(l.unitCost) || 0,
        markup_pct: Number(l.markupPct) || 0,
      }))
    );
    if (linesError) return { ok: false, message: linesError.message };
  }

  revalidatePath(`/admin/quotes/${id}`);
  revalidatePath('/admin/quotes');
  return { ok: true, message: 'Quote saved.' };
}

export async function deleteQuote(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const db = createAdminClient();
  await db.from('quotes').delete().eq('id', id);
  redirect('/admin/quotes');
}

/** Email the client their personal quote link (and mark the quote as sent). */
export async function sendQuoteToClient(_prev: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const quote = id ? await getQuoteById(id) : null;
  if (!quote) return { ok: false, message: 'Quote not found.' };
  if (!quote.clientEmail) return { ok: false, message: 'Add the client’s email address first (and save).' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const link = `${siteUrl}/quotes/${quote.publicToken}`;

  const result = await sendEmail({
    to: quote.clientEmail,
    subject: `Your personal travel quote — ${quote.title} (${quote.ref})`,
    html: emailShell({
      title: `Your quote is ready${quote.clientName ? `, ${quote.clientName.split(' ')[0]}` : ''}!`,
      bodyHtml: `<p style="font-size:14px;line-height:1.7">
        Thank you for planning your trip with Premium Choice Travel. Your personal quote
        for <strong>${quote.title}</strong> is ready to view online — including the full
        itinerary, inclusions and pricing.${quote.validity ? ` It is valid until <strong>${new Date(quote.validity).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.` : ''}
      </p>
      <p style="font-size:14px;line-height:1.7">You can also download it as a PDF from the same page.</p>`,
      cta: { label: 'View my quote', url: link },
    }),
  });

  if (!result.ok) return { ok: false, message: result.error ?? 'Email failed.' };

  const db = createAdminClient();
  await db.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/admin/quotes/${id}`);

  return result.skipped
    ? { ok: true, message: 'No RESEND_API_KEY set — marked as sent. Copy the link and share it manually.' }
    : { ok: true, message: `Sent to ${quote.clientEmail}.` };
}
