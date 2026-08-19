import Link from 'next/link';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import StMediaManager, { type MediaItem } from '@/components/admin/StMediaManager';

export const dynamic = 'force-dynamic';

export default async function StMediaPage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const db = pcstClient();
  const { data: files } = await db.storage.from('trip-images').list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  // A listing mixes files with sub-folders (quote-logos, uploads/…). Folders
  // come back with a null id and no metadata, and would render as broken
  // thumbnails pointing at a 400.
  const items: MediaItem[] = (files ?? [])
    .filter((f) => f.id !== null && f.name !== '.emptyFolderPlaceholder')
    .map((f) => ({
      name: f.name,
      url: db.storage.from('trip-images').getPublicUrl(f.name).data.publicUrl,
      size: (f.metadata as any)?.size ?? 0,
      createdAt: f.created_at,
    }));

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Media</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Hero and gallery photography for the School Trips site. Images are resized in your browser
          before upload, so originals off a camera roll are fine.
        </p>
      </div>

      <StMediaManager items={items} />
    </>
  );
}
