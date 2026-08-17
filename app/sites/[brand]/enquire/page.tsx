import { notFound } from 'next/navigation';
import EnquiryForm from '@/components/EnquiryForm';
import { getBrand } from '@/lib/brands';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Plan my trip' };

export default function BrandEnquirePage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();

  return (
    <main className="bg-sand">
      <div className="container-site py-14 sm:py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="eyebrow">{brand.name}</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Let’s plan something wonderful
          </h1>
          <p className="mt-3 text-ink-soft">
            Tell us what you have in mind and a specialist replies within one working day.
          </p>
        </div>
        <div className="card mx-auto max-w-2xl p-8">
          <EnquiryForm packageTitle={`${brand.name} enquiry`} />
        </div>
      </div>
    </main>
  );
}
