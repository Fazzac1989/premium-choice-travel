import SiteHeader from '@/components/SiteHeader';
import OurStory from '@/components/OurStory';

export const metadata = {
  title: 'Our story',
  description:
    'Premium Choice Travel is a family-owned, Dubai-based travel company built on four decades of experience, British roots and a genuine understanding of life in the UAE.',
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <OurStory contactHref="/contact" showBrandGrid />
      </main>
    </>
  );
}
