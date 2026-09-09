import Image from 'next/image';
import Link from 'next/link';
import { priceLabel, untilLabel, type Offer } from '@/lib/offers-shared';

/**
 * One offer as a card: picture, badge, title, the "from" price and how long
 * it runs, and a button. The button goes where the offer says, or to the
 * enquiry form with the offer named.
 */
export default function OfferCard({ offer, enquireBase = '' }: { offer: Offer; enquireBase?: string }) {
  const href = offer.ctaHref || `${enquireBase}/enquire?offer=${encodeURIComponent(offer.title)}`;
  const external = /^https?:\/\//.test(href);
  const label = offer.ctaLabel || 'Enquire about this offer';
  const price = priceLabel(offer);
  const until = untilLabel(offer);

  const Button = external ? (
    <a href={href} target="_blank" rel="noopener" className="btn-primary mt-5 !px-5 !py-2.5">{label}</a>
  ) : (
    <Link href={href} className="btn-primary mt-5 !px-5 !py-2.5">{label}</Link>
  );

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-sand">
        {offer.image && (
          <Image src={offer.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
        )}
        {offer.badge && (
          <span className="absolute left-4 top-4 rounded-full bg-teal px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {offer.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-2xl leading-tight text-ink">{offer.title}</h3>
        {offer.subtitle && <p className="mt-1 text-sm text-ink-soft">{offer.subtitle}</p>}
        {offer.description && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{offer.description}</p>}
        <div className="mt-auto pt-4">
          {price && (
            <p className="text-lg font-semibold text-teal-deep">
              {price}
              {offer.priceNote && <span className="ml-1 text-xs font-normal text-ink-soft">{offer.priceNote}</span>}
            </p>
          )}
          {until && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{until}</p>}
          {Button}
        </div>
      </div>
    </article>
  );
}
