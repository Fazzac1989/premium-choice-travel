import HotelsManager from '@/components/admin/HotelsManager';

export const dynamic = 'force-dynamic';

export default function AdminHotelsPage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-ink">Hotels we rate</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Editorial picks, shared across every brand — link them to journey stages and each
        gets its own public page. Keep copy editorial: no rates or availability promises.
      </p>
      <HotelsManager />
    </>
  );
}
