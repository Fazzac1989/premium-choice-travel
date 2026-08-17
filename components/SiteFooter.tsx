import Image from 'next/image';
import Link from 'next/link';

const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=100057396162736' },
  { label: 'Instagram', href: 'https://www.instagram.com/premiumchoicetravel1/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/premiumchoicetravel/' },
];

export default function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr]">
        <div>
          <Image src="/images/logo-white.png" alt="Premium Choice Travel" width={177} height={46} className="h-10 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            One trusted Dubai travel company behind six specialist travel brands —
            holidays, school trips, staycations, cruises, golf and corporate travel.
          </p>
          <div className="mt-5 flex gap-4">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener" className="text-xs font-semibold text-white/60 hover:text-teal">
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow !text-teal">Travel</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/brands/holidays" className="text-white/80 hover:text-teal">Holidays</Link></li>
            <li><Link href="/brands/staycations" className="text-white/80 hover:text-teal">Staycations</Link></li>
            <li><Link href="/brands/cruise" className="text-white/80 hover:text-teal">Cruises</Link></li>
            <li><Link href="/destinations" className="text-white/80 hover:text-teal">Destinations</Link></li>
            <li><Link href="/packages" className="text-white/80 hover:text-teal">Packages</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-teal">Specialists</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a href="https://premiumchoiceschooltrips.com" target="_blank" rel="noopener" className="text-white/80 hover:text-teal">School Trips</a></li>
            <li><Link href="/brands/golf-holidays" className="text-white/80 hover:text-teal">Golf Holidays</Link></li>
            <li><Link href="/brands/corporate" className="text-white/80 hover:text-teal">Corporate</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-teal">Company</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/about" className="text-white/80 hover:text-teal">About us</Link></li>
            <li><Link href="/brands" className="text-white/80 hover:text-teal">Our brands</Link></li>
            <li><Link href="/plan" className="text-white/80 hover:text-teal">Plan my trip</Link></li>
            <li><Link href="/contact" className="text-white/80 hover:text-teal">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-teal">Contact</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li><a href="tel:+97144206965" className="hover:text-teal">+971 4 420 6965</a></li>
            <li><a href="mailto:info@premiumchoicetravel.com" className="hover:text-teal">info@premiumchoicetravel.com</a></li>
            <li>Jumeirah Lakes Towers, Dubai, UAE</li>
            <li>Monday–Friday, 9.00am–7.30pm</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Premium Choice Travel JLT. All rights reserved.</p>
          <p>Licensed UAE travel agency · Dubai, United Arab Emirates</p>
        </div>
      </div>
    </footer>
  );
}
