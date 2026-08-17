import Image from 'next/image';
import Link from 'next/link';
import type { Destination } from '@/lib/types';

export default function DestinationCard({ destination, tall = false }: { destination: Destination; tall?: boolean }) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className={`group relative block overflow-hidden rounded-2xl ${tall ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}
    >
      <Image
        src={destination.heroImage}
        alt={destination.name}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">{destination.region}</p>
        <h3 className="mt-1 font-serif text-2xl text-white">{destination.name}</h3>
      </div>
    </Link>
  );
}
