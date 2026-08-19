import Link from 'next/link';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import StTermsEditor from '@/components/admin/StTermsEditor';

export const dynamic = 'force-dynamic';

export default async function StTermsPage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const { data, error } = await pcstClient()
    .from('booking_terms')
    .select('text, sort_order')
    .order('sort_order');

  if (error) {
    return <p className="card p-10 text-sm text-danger">Could not load booking terms: {error.message}</p>;
  }

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Booking terms</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Shown in the terms accordion on every trip page, in this order. Saving replaces the whole
          list, so an empty line is simply dropped.
        </p>
      </div>

      <StTermsEditor initial={(data ?? []).map((t) => t.text)} />
    </>
  );
}
