import SiteHeader from '@/components/SiteHeader';
import EnquiryForm from '@/components/EnquiryForm';

export const metadata = { title: 'Contact us' };

export default function ContactPage() {
  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site py-14 sm:py-16">
            <p className="eyebrow">Contact</p>
            <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Let’s plan something wonderful
            </h1>
            <p className="mt-4 max-w-xl text-ink-soft">
              Tell us where you’re dreaming of — or let us surprise you. A specialist replies
              with ideas and a personal quote — typically within one working day.
            </p>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-site grid gap-12 lg:grid-cols-[1fr_360px]">
            <div className="card p-8">
              <EnquiryForm />
            </div>
            <aside className="space-y-8">
              <div>
                <p className="eyebrow">Call or WhatsApp</p>
                <a href="tel:+97144206965" className="mt-2 block font-serif text-2xl text-ink hover:text-teal-deep">
                  +971 4 420 6965
                </a>
                <p className="mt-1 text-sm text-ink-soft">Monday–Friday, 9.00am–7.30pm GST</p>
              </div>
              <div>
                <p className="eyebrow">Email</p>
                <a href="mailto:info@premiumchoicetravel.com" className="mt-2 block text-lg font-semibold text-ink hover:text-teal-deep">
                  info@premiumchoicetravel.com
                </a>
              </div>
              <div>
                <p className="eyebrow">Visit us</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Premium Choice Travel JLT<br />
                  Jumeirah Lakes Towers<br />
                  Dubai, United Arab Emirates
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
