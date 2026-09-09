import { redirect } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';

/** Saved moved to its own tab when the app gained one. */
export default function LegacySavedPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  redirect(`${brand ? brandBase(brand) : ''}/saved`);
}
