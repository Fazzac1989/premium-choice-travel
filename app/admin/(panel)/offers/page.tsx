import OffersManager from '@/components/admin/OffersManager';

export const dynamic = 'force-dynamic';

export default function AdminOffersPage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-ink">Offers</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Dated deals for the Holidays, Staycations, Cruises and Golf sites — each has an Offers
        page. An offer shows while it is published and within its dates; School Trips and
        Corporate do not show offers.
      </p>
      <OffersManager />
    </>
  );
}
