import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import { EMPTY_CONTENT, type ProposalContent } from '@/lib/brochure/proposal-schema';
import StProposalEditor from '@/components/admin/StProposalEditor';

export const dynamic = 'force-dynamic';

export default async function StProposalPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  if (!isPcstConfigured()) {
    return <p className="card p-10 text-sm text-danger">The School Trips database is not configured.</p>;
  }

  const db = pcstClient();
  const { data: row } = await db.from('brochures').select('*').eq('id', id).maybeSingle();
  if (!row || row.kind !== 'proposal') notFound();

  const [{ data: dayRows }, { data: flightRows }, { data: imageRows }, { data: termsRows }] =
    await Promise.all([
      db.from('brochure_days').select('*').eq('brochure_id', id).order('sort_order'),
      db.from('brochure_flights').select('*').eq('brochure_id', id).order('sort_order'),
      db.from('brochure_images').select('*').order('id'),
      db.from('brochure_terms_sets').select('id, name, version, is_default').order('name'),
    ]);

  // Timetable rows for every day in one query rather than one per day.
  const dayIds = (dayRows ?? []).map((d) => d.id);
  const { data: itemRows } = await db
    .from('brochure_day_items')
    .select('*')
    .in('day_id', dayIds.length ? dayIds : [0])
    .order('sort_order');

  const days = (dayRows ?? []).map((d) => ({
    id: d.id as number,
    dayNumber: d.day_number as number,
    date: (d.date ?? null) as string | null,
    title: (d.title ?? '') as string,
    summary: (d.summary ?? '') as string,
    overnight: (d.overnight ?? '') as string,
    imageIds: (Array.isArray(d.image_ids) ? d.image_ids : []) as number[],
    sortOrder: d.sort_order as number,
    items: (itemRows ?? [])
      .filter((i) => i.day_id === d.id)
      .map((i) => ({
        id: i.id as number,
        timeLabel: (i.time_label ?? '') as string,
        text: (i.text ?? '') as string,
        sortOrder: i.sort_order as number,
      })),
  }));

  const flights = (flightRows ?? []).map((f) => ({
    id: f.id as number,
    direction: (f.direction ?? 'outbound') as 'outbound' | 'return',
    flightNumber: (f.flight_number ?? '') as string,
    carrier: (f.carrier ?? '') as string,
    fromCode: (f.from_code ?? '') as string,
    fromName: (f.from_name ?? '') as string,
    toCode: (f.to_code ?? '') as string,
    toName: (f.to_name ?? '') as string,
    departsAt: (f.departs_at ?? null) as string | null,
    arrivesAt: (f.arrives_at ?? null) as string | null,
    note: (f.note ?? '') as string,
    sortOrder: f.sort_order as number,
  }));

  // Public URLs so the editor can show what it is choosing between.
  const images = (imageRows ?? []).map((i) => ({
    id: i.id as number,
    alt: (i.alt ?? '') as string,
    url: db.storage.from('brochure-images').getPublicUrl(i.storage_path).data.publicUrl,
  }));

  const content: ProposalContent = { ...EMPTY_CONTENT, ...(row.content ?? {}) };

  const proposal = {
    id: row.id as number,
    title: (row.title ?? '') as string,
    status: (row.status ?? 'draft') as string,
    content,
    commercials: {
      preparedFor: (row.prepared_for ?? '') as string,
      travelStart: (row.travel_start ?? null) as string | null,
      travelEnd: (row.travel_end ?? null) as string | null,
      studentCount: (row.student_count ?? null) as number | null,
      freePlacesTeachers: (row.free_places_teachers ?? null) as number | null,
      freePlacesPctStaff: (row.free_places_pct_staff ?? null) as number | null,
      pricePerStudent: (row.price_per_student ?? null) as number | null,
      currency: (row.currency ?? 'AED') as string,
      priceBasisNote: (row.price_basis_note ?? '') as string,
    },
    heroEffect: Boolean(row.hero_effect),
    termsSetId: (row.terms_set_id ?? null) as number | null,
    shareToken: (row.share_token ?? null) as string | null,
    shareExpiresAt: (row.share_expires_at ?? null) as string | null,
    viewCount: (row.view_count ?? 0) as number,
    pdfGeneratedAt: (row.pdf_generated_at ?? null) as string | null,
    updatedAt: (row.updated_at ?? null) as string | null,
  };

  return (
    <>
      <Link
        href="/admin/school-trips/proposals"
        className="text-sm font-semibold text-teal-deep hover:underline"
      >
        ← Proposals
      </Link>

      <StProposalEditor
        proposal={proposal}
        days={days}
        flights={flights}
        images={images}
        termsSets={(termsRows ?? []).map((t) => ({
          id: t.id as number,
          name: (t.name ?? '') as string,
          version: (t.version ?? 1) as number,
          isDefault: Boolean(t.is_default),
        }))}
        siteUrl={PCST_SITE_URL}
      />
    </>
  );
}
