import { notFound } from 'next/navigation';
import EnquiryForm from '@/components/EnquiryForm';
import { getBrand } from '@/lib/brands';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Plan my trip' };

export default function BrandEnquirePage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: { about?: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();

  // Arrived from one of the circles on the home page: name what they clicked
  // on the specialist's email, and say it back to them here so it is clearly
  // the thing they asked about. Only ever one of the brand's own services,
  // never free text from the address bar.
  const about = brand.services.find((s) => s === searchParams.about) ?? '';

  return (
    <main className="bg-sand">
      <div className="container-site py-14 sm:py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="eyebrow">{brand.name}</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Let’s plan something wonderful
          </h1>
          <p className="mt-3 text-ink-soft">
            {about
              ? `About ${about.toLowerCase()}. Tell us what you have in mind and a specialist replies typically within one working day.`
              : 'Tell us what you have in mind and a specialist replies typically within one working day.'}
          </p>
        </div>
        <div className="card mx-auto max-w-2xl p-8">
          <EnquiryForm brand={brand.key} packageTitle={about ? `${brand.name} — ${about}` : `${brand.name} enquiry`} />
        </div>
      </div>
    </main>
  );
}
