import Image from 'next/image';
import Link from 'next/link';
import { BRANDS } from '@/lib/brands';

export default function BrandGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {BRANDS.map((b) => {
        const card = (
          <>
            <Image
              src={b.heroImage}
              alt={b.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-ink/10 transition-colors group-hover:via-ink/40" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">Premium Choice</p>
              <h3 className="mt-1 font-serif text-2xl text-white">{b.shortName}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm text-white/75">{b.description}</p>
              <p className="mt-3 text-sm font-bold text-teal">
                {b.cta} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </p>
            </div>
          </>
        );
        const cls = 'group relative block aspect-[4/3] overflow-hidden rounded-2xl sm:aspect-[3/2] lg:aspect-[4/3]';
        return b.externalUrl ? (
          <a key={b.slug} href={b.externalUrl} target="_blank" rel="noopener" className={cls}>
            {card}
          </a>
        ) : (
          <Link key={b.slug} href={`/brands/${b.slug}`} className={cls}>
            {card}
          </Link>
        );
      })}
    </div>
  );
}
