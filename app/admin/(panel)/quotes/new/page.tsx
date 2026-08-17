import Image from 'next/image';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapPackage } from '@/lib/data';
import { createQuote } from '@/lib/admin/quote-actions';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  const db = createAdminClient();
  const { data } = await db
    .from('packages')
    .select('*, destinations(slug, name, region)')
    .order('title');
  const packages = (data ?? []).map(mapPackage);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/quotes" className="text-sm font-semibold text-teal-deep hover:underline">← Quotes</Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">New quote</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Start from a package — itinerary, images and inclusions come pre-filled — or start blank.
      </p>

      <form action={createQuote} className="card mt-8 p-6">
        <button type="submit" className="btn-outline w-full !justify-between !rounded-xl !px-5 !py-4 text-left">
          <span>
            <span className="block font-serif text-lg text-ink">Blank quote</span>
            <span className="text-xs text-ink-soft">A clean slate — add everything yourself</span>
          </span>
          <span className="text-teal">→</span>
        </button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {packages.map((p) => (
          <form key={p.id} action={createQuote}>
            <input type="hidden" name="package_id" value={p.id} />
            <button type="submit" className="card group w-full text-left transition-shadow hover:shadow-lg">
              <div className="relative h-32 w-full overflow-hidden">
                {p.heroImage && (
                  <Image src={p.heroImage} alt="" fill sizes="320px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
              </div>
              <div className="p-4">
                <p className="truncate font-semibold text-ink group-hover:text-teal-deep">{p.title}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{p.destinationName} · {p.nights} nights</p>
              </div>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
