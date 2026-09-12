import Image from 'next/image';
import Link from 'next/link';
import { EMIRATES } from '@/lib/staycations/filters';

/**
 * The desktop footer.
 *
 * The app itself does not want one — a phone has four destinations at the
 * bottom and nothing else belongs there — but a website does. This is where
 * a search engine, and a reader who has scrolled to the end, find out who
 * runs this, where we are, and that there are stays in every emirate rather
 * than only the ones on screen.
 *
 * So it is rendered in the markup on every page and shown from `lg` up, and
 * `pwa-hidden` takes it out of the installed app entirely.
 */
export default function CoastalFooter({
  base,
  logoWhite,
  description,
}: {
  base: string;
  logoWhite: string | null;
  description: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="pwa-hidden hidden border-t border-sea-line bg-petrol-deep text-white lg:block">
      <div className="cc-wrap grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
        <div>
          {logoWhite ? (
            <Image
              src={logoWhite}
              alt="Premium Choice Staycations"
              width={524}
              height={130}
              className="h-11 w-auto"
            />
          ) : (
            <p className="font-display text-[23px] font-medium">Premium Choice Staycations</p>
          )}
          <p className="mt-4 max-w-xs text-[15px] leading-[23px] text-white/70">{description}</p>
          <a
            href="tel:+97144206965"
            className="mt-5 inline-block font-display text-[23px] font-medium text-white hover:text-mist"
          >
            +971 4 420 6965
          </a>
          <p className="mt-1 text-[13px] leading-[19px] text-white/60">
            Monday to Friday, 9.00am–7.30pm GST
          </p>
        </div>

        <nav aria-labelledby="footer-emirates">
          <h2 id="footer-emirates" className="text-[12px] font-semibold uppercase tracking-[0.16em] text-mist">
            Stays by emirate
          </h2>
          <ul className="mt-4 space-y-2.5 text-[15px] text-white/80">
            {EMIRATES.map((e) => (
              <li key={e}>
                <Link href={`${base}/hotels?emirate=${encodeURIComponent(e)}`} className="hover:text-white">
                  Hotels in {e}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-app">
          <h2 id="footer-app" className="text-[12px] font-semibold uppercase tracking-[0.16em] text-mist">
            Plan a stay
          </h2>
          <ul className="mt-4 space-y-2.5 text-[15px] text-white/80">
            <li><Link href={base || '/'} className="hover:text-white">Explore</Link></li>
            <li><Link href={`${base}/hotels`} className="hover:text-white">All hotels</Link></li>
            <li><Link href={`${base}/offers`} className="hover:text-white">Offers</Link></li>
            <li><Link href={`${base}/saved`} className="hover:text-white">Saved stays</Link></li>
            <li><Link href={`${base}/trips`} className="hover:text-white">Your trips</Link></li>
            <li><Link href={`${base}/concierge`} className="hover:text-white">Concierge</Link></li>
            <li><Link href={`${base}/about`} className="hover:text-white">Our story</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-mist">
            Part of the family
          </h2>
          <p className="mt-4 max-w-xs text-[15px] leading-[23px] text-white/70">
            Staycations is a Premium Choice Travel brand. One Dubai travel company, six
            specialist ways to travel, and a specialist answering every enquiry by name.
          </p>
          <a
            href="https://premiumchoicetravel.com"
            className="mt-3 inline-block text-[15px] font-semibold text-mist hover:text-white"
          >
            Visit Premium Choice Travel
          </a>
          <address className="mt-5 text-[15px] not-italic leading-[23px] text-white/70">
            Premium Choice Travel JLT
            <br />
            Jumeirah Lakes Towers
            <br />
            Dubai, United Arab Emirates
          </address>
          <a
            href="mailto:info@premiumchoicetravel.com"
            className="mt-2 inline-block text-[15px] text-white/80 hover:text-white"
          >
            info@premiumchoicetravel.com
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="cc-wrap flex items-center justify-between gap-4 py-5 text-[13px] text-white/50">
          <p>© {year} Premium Choice Travel JLT. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white">Booking terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <span>Licensed UAE travel agency</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
