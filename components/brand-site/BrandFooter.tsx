import Image from 'next/image';
import Link from 'next/link';

export default function BrandFooter({
  name,
  description,
  logoWhite,
  base = '',
  isHolidays = false,
  isStaycations = false,
}: {
  name: string;
  description: string;
  logoWhite: string | null;
  base?: string;
  isHolidays?: boolean;
  isStaycations?: boolean;
}) {
  const masterUrl = 'https://premiumchoicetravel.com';
  const links = [
    ...(isHolidays ? [
      { href: `${base}/destinations`, label: 'Destinations' },
      { href: `${base}/inspiration`, label: 'AI Inspiration' },
    ] : []),
    ...(isStaycations
      ? [{ href: `${base}/hotels`, label: 'Hotels' }]
      : [{ href: `${base}/journeys`, label: 'Journeys' }]),
    { href: `${base}/about`, label: 'Our story' },
    { href: `${base}/enquire`, label: 'Plan my trip' },
  ];
  return (
    <footer className="bg-ink text-white">
      <div className="container-site grid gap-10 py-12 md:grid-cols-3">
        <div>
          {logoWhite ? (
            <Image src={logoWhite} alt={name} width={280} height={78} className="h-11 w-auto" />
          ) : (
            <p className="font-serif text-xl">{name}</p>
          )}
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{description}</p>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/80">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-teal">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-teal">Talk to us</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li><a href="tel:+97144206965" className="hover:text-teal">+971 4 420 6965</a></li>
            <li><a href="mailto:info@premiumchoicetravel.com" className="hover:text-teal">info@premiumchoicetravel.com</a></li>
            <li>Jumeirah Lakes Towers, Dubai, UAE</li>
            <li>Monday–Friday, 9.00am–7.30pm</li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-teal">Part of the family</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            {name} is a Premium Choice Travel brand — one trusted Dubai travel company,
            six specialist ways to travel.
          </p>
          <a href={masterUrl} className="mt-3 inline-block text-sm font-bold text-teal hover:underline">
            Visit Premium Choice Travel →
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Premium Choice Travel JLT. All rights reserved.</p>
          <p>Licensed UAE travel agency</p>
        </div>
      </div>
    </footer>
  );
}
