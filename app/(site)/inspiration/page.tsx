import SiteHeader from '@/components/SiteHeader';
import InspirationCurator from '@/components/InspirationCurator';

export const metadata = {
  title: 'Give me some inspiration',
  description:
    'Answer a few questions and our AI holiday curator sketches three tailor-made trip ideas — then a Premium Choice Travel specialist prices the one you love.',
};

export default function InspirationPage({
  searchParams,
}: {
  searchParams: { destination?: string };
}) {
  return (
    <>
      <SiteHeader solid />
      <main className="bg-sand pt-[72px]">
        <div className="container-site py-14 sm:py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="eyebrow">AI Holiday Curator</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Give me some inspiration
            </h1>
            <p className="mt-3 text-ink-soft">
              Tell us how you like to travel and we’ll sketch three genuinely different trip
              ideas in under a minute — then a human expert takes over.
            </p>
          </div>
          <InspirationCurator destinationHint={searchParams.destination ?? ''} />
        </div>
      </main>
    </>
  );
}
