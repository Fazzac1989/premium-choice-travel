'use client';

import { useEffect, useState } from 'react';
import { isHotelSaved, subscribeSavedHotels, toggleSavedHotel } from '@/lib/pwa/saved-hotels';

/**
 * The heart. Works inside a card that is itself a link — the click never
 * reaches the link. State is shared across every heart on the page.
 */
export default function SaveHotelButton({
  slug,
  name,
  className = '',
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isHotelSaved(slug));
    sync();
    return subscribeSavedHotels(sync);
  }, [slug]);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved hotels` : `Save ${name}`}
      title={saved ? 'Saved' : 'Save this hotel'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved(toggleSavedHotel(slug));
      }}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-ink shadow-sm backdrop-blur transition-transform hover:scale-105 active:scale-95 ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={saved ? '#19BAAB' : 'none'}
        stroke={saved ? '#19BAAB' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    </button>
  );
}
