import Image from 'next/image';
import Link from 'next/link';
import { BRANDS } from '@/lib/brands';

export default function BrandGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {BRANDS.map((b) => {
        const card = (
          <>
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src={b.heroImage}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col bg-white p-6">
              {b.logoCard ? (
                <Image
                  src={b.logoCard}
                  alt={b.name}
                  width={520}
                  height={144}
                  className="h-20 w-auto max-w-full self-start object-contain object-left sm:h-24"
                />
              ) : (
                <h3 className="font-serif text-2xl text-ink">{b.name}</h3>
              )}
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{b.description}</p>
              <p className="mt-4 text-sm font-bold text-teal-deep">
                {b.cta} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </p>
            </div>
          </>
        );
        const cls =
          'group card flex flex-col overflow-hidden transition-shadow hover:shadow-xl hover:shadow-ink/10';
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
