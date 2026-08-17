import type { Metadata } from 'next';
import { Archivo, Fraunces } from 'next/font/google';
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
    <html lang="en" className={`${archivo.variable} ${fraunces.variable}`}>
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
