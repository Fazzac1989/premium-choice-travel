import type { Metadata } from 'next';
import { Archivo, Cormorant_Garamond, Fraunces, Great_Vibes, Inter } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const greatVibes = Great_Vibes({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap',
});

/**
 * Coastal Calm's two faces, self-hosted by Next so nothing is fetched from
 * Google at run time. They live here rather than in one brand's layout
 * because every site but School Trips wears this design now.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'sans-serif'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Premium Choice Travel — Tailor-made holidays from the UAE',
    template: '%s — Premium Choice Travel',
  },
  description:
    'Dubai-based travel specialists crafting tailor-made holidays, honeymoons, cruises and staycations. Maldives, Georgia, Japan and beyond — with personal service at every step.',
  openGraph: {
    siteName: 'Premium Choice Travel',
    type: 'website',
  },
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: 'Premium Choice Travel',
  url: siteUrl,
  logo: `${siteUrl}/images/logo.png`,
  telephone: '+971 4 420 6965',
  email: 'info@premiumchoicetravel.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Jumeirah Lakes Towers, Dubai',
    addressCountry: 'AE',
  },
  sameAs: [
    'https://www.facebook.com/profile.php?id=100057396162736',
    'https://www.instagram.com/premiumchoicetravel1/',
    'https://www.linkedin.com/company/premiumchoicetravel/',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${fraunces.variable} ${greatVibes.variable} ${cormorant.variable} ${inter.variable}`}
    >
      <body className="font-sans">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </body>
    </html>
  );
}
