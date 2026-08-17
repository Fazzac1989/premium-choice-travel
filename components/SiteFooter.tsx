import Image from 'next/image';
import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Image src="/images/logo-white.png" alt="Premium Choice Travel" width={177} height={46} className="h-10 w-auto" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Dubai-based travel specialists crafting tailor-made holidays, honeymoons,
            cruises and staycations — with personal service at every step of the journey.
          </p>
        </div>
        <div>
          <p className="eyebrow !text-teal">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/destinations" className="text-white/80 hover:text-teal">Destinations</Link></li>
            <li><Link href="/packages" className="text-white/80 hover:text-teal">Holiday packages</Link></li>
            <li><Link href="/about" className="text-white/80 hover:text-teal">About us</Link></li>
            <li><Link href="/contact" className="text-white/80 hover:text-teal">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-teal">Talk to us</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li><a href="tel:+97144206965" className="hover:text-teal">+971 4 420 6965</a></li>
            <li><a href="mailto:info@premiumchoicetravel.com" className="hover:text-teal">info@premiumchoicetravel.com</a></li>
            <li>Jumeirah Lakes Towers, Dubai, UAE</li>
            <li>Sunday–Thursday, 9am–6pm</li>
          </ul>
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
