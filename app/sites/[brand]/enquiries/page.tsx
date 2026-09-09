import { redirect } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';

/** Enquiries became Trips: the same requests, with what happened next. */
export default function LegacyEnquiriesPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  redirect(`${brand ? brandBase(brand) : ''}/trips`);
}
