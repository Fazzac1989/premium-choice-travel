import DestinationsManager from '@/components/admin/DestinationsManager';

export const dynamic = 'force-dynamic';

export default function AdminDestinationsPage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-ink">Destinations</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The countries and regions shown across the websites. Shared by every brand.
      </p>
      <DestinationsManager />
    </>
  );
}
