import SiteHeader from '@/components/SiteHeader';
import PlanWizard from '@/components/PlanWizard';

export const metadata = {
  title: 'Plan my trip',
  description: 'Tell us what kind of trip you’re dreaming of and a Premium Choice specialist will shape it with you.',
};

export default function PlanPage() {
  return (
    <>
      <SiteHeader solid />
      <main className="bg-sand pt-[72px]">
        <div className="container-site py-14 sm:py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="eyebrow">Plan my trip</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Tell us what you’re dreaming of
            </h1>
            <p className="mt-3 text-ink-soft">
              Six quick questions — then a real specialist takes over. No obligation, no spam.
            </p>
          </div>
          <PlanWizard />
        </div>
      </main>
    </>
  );
}
