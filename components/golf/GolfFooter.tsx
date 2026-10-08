import Image from 'next/image';
import Link from 'next/link';
import { GOLF_TRIP_TYPES } from '@/lib/golf/catalogue';

type Country = { slug: string; country: string };

/**
 * The golf footer: a catalogue index in columns — kinds of trip, where to
 * play, the company — then the contact details and the legal line. The
 * country column lists only countries that have trips today.
 */
export default function GolfFooter({
  base,
  name,
  logoWhite,
  countries,
}: {
  base: string;
  name: string;
  logoWhite: string | null;
  countries: Country[];
}) {
  const head = 'text-xs font-extrabold uppercase tracking-[0.14em] text-golf-teal';
  const link = 'text-sm text-white/75 hover:text-white';
  return (
    <footer className="bg-golf-navy text-white">
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          {logoWhite ? (
            <Image src={logoWhite} alt={name} width={280} height={78} className="h-11 w-auto" />
          ) : (
            <p className="text-xl font-extrabold">{name}</p>
          )}
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Golf holidays and breaks from the UAE, priced in AED and planned by a Dubai team.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-white/80">
            <li><a href="tel:+97144206965" className="font-bold text-white hover:text-golf-teal">+971 4 420 6965</a></li>
            <li><a href="mailto:info@premiumchoicetravel.com" className="hover:text-white">info@premiumchoicetravel.com</a></li>
            <li>Jumeirah Lakes Towers, Dubai, UAE</li>
            <li>Monday–Friday, 9.00am–7.30pm</li>
          </ul>
        </div>

        <div>
          <p className={head}>Holiday types</p>
          <ul className="mt-4 space-y-2">
            <li><Link href={`${base}/journeys?length=short`} className={link}>Golf breaks</Link></li>
            {GOLF_TRIP_TYPES.map((t) => (
              <li key={t.key}><Link href={`${base}/journeys?type=${t.key}`} className={link}>{t.label}</Link></li>
            ))}
            <li><Link href={`${base}/groups`} className={link}>Groups &amp; societies</Link></li>
          </ul>
        </div>

        <div>
          <p className={head}>Where to play</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
            {countries.slice(0, 12).map((c) => (
              <li key={c.slug}><Link href={`${base}/journeys?country=${c.slug}`} className={link}>{c.country}</Link></li>
            ))}
            <li><Link href={`${base}/destinations`} className="text-sm font-bold text-golf-teal hover:underline">All destinations →</Link></li>
          </ul>
        </div>

        <div>
          <p className={head}>Premium Choice</p>
          <ul className="mt-4 space-y-2">
            <li><Link href={`${base}/about`} className={link}>Our story</Link></li>
            <li><Link href={`${base}/offers`} className={link}>Offers</Link></li>
            <li><Link href={`${base}/enquire`} className={link}>Plan my trip</Link></li>
            <li><Link href={`${base}/enquire`} className={link}>Contact us</Link></li>
            <li><a href="https://premiumchoicetravel.com" className={link}>Premium Choice Travel</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/55 sm:flex-row">
          <p>© {new Date().getFullYear()} Premium Choice Travel JLT. All rights reserved.</p>
          <p className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-white">Booking terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <span>Licensed UAE travel agency</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
