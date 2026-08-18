'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import worldData from 'world-atlas/countries-110m.json';

export type MapDestination = {
  slug: string;
  name: string;
  region: string;
  strapline: string;
};

/** Destination slug → Natural Earth country names it lights up on the map. */
const SLUG_TO_MAP_NAMES: Record<string, string[]> = {
  thailand: ['Thailand'], 'sri-lanka': ['Sri Lanka'], 'united-kingdom': ['United Kingdom'],
  japan: ['Japan'], vietnam: ['Vietnam'], greece: ['Greece'],
  turkey: ['Turkey', 'Türkiye'], france: ['France'], italy: ['Italy'], spain: ['Spain'],
  bali: ['Indonesia'], canada: ['Canada'], australia: ['Australia'],
  'united-states': ['United States of America', 'United States'],
  switzerland: ['Switzerland'], 'south-korea': ['South Korea', 'Republic of Korea'],
  'south-africa': ['South Africa'], portugal: ['Portugal'], georgia: ['Georgia'],
  oman: ['Oman'], malaysia: ['Malaysia'], austria: ['Austria'], netherlands: ['Netherlands'],
  finland: ['Finland'], germany: ['Germany'], croatia: ['Croatia'], montenegro: ['Montenegro'],
  azerbaijan: ['Azerbaijan'], armenia: ['Armenia'],
  'czech-republic': ['Czechia', 'Czech Republic'], morocco: ['Morocco'], egypt: ['Egypt'],
  tanzania: ['Tanzania', 'United Republic of Tanzania'], kenya: ['Kenya'], ireland: ['Ireland'],
  'new-zealand': ['New Zealand'], 'saudi-arabia': ['Saudi Arabia'], jordan: ['Jordan'],
  cyprus: ['Cyprus'], albania: ['Albania'], serbia: ['Serbia', 'Republic of Serbia'],
  hungary: ['Hungary'], slovenia: ['Slovenia'], norway: ['Norway'], sweden: ['Sweden'],
  denmark: ['Denmark'], iceland: ['Iceland'], china: ['China'], india: ['India'],
  nepal: ['Nepal'], bhutan: ['Bhutan'], cambodia: ['Cambodia'], philippines: ['Philippines'],
  mexico: ['Mexico'], 'costa-rica': ['Costa Rica'],
  'united-arab-emirates': ['United Arab Emirates'],
};

/** Island destinations too small for the world outline get a glowing marker. */
const ISLAND_MARKERS: { slug: string; coordinates: [number, number] }[] = [
  { slug: 'maldives', coordinates: [73.5, 3.2] },
  { slug: 'seychelles', coordinates: [55.5, -4.7] },
  { slug: 'mauritius', coordinates: [57.55, -20.3] },
  { slug: 'malta', coordinates: [14.4, 35.9] },
  { slug: 'singapore', coordinates: [103.8, 1.35] },
];

const TEAL = '#19BAAB';
const TEAL_SOFT = '#8ADCD3';
const LAND = '#E7E3DA';
const LAND_STROKE = '#FFFFFF';

export default function WorldMapExplorer({ destinations }: { destinations: MapDestination[] }) {
  const [hovered, setHovered] = useState<MapDestination | null>(null);
  // Clicking pins a country so the list below stays filtered (tap-friendly too).
  const [selected, setSelected] = useState<MapDestination | null>(null);

  const pick = (dest: MapDestination) =>
    setSelected((cur) => (cur?.slug === dest.slug ? null : dest));

  const { nameToDest, bySlug } = useMemo(() => {
    const bySlug = new Map(destinations.map((d) => [d.slug, d]));
    const nameToDest = new Map<string, MapDestination>();
    for (const [slug, names] of Object.entries(SLUG_TO_MAP_NAMES)) {
      const dest = bySlug.get(slug);
      if (dest) for (const n of names) nameToDest.set(n, dest);
    }
    return { nameToDest, bySlug };
  }, [destinations]);

  const regions = useMemo(() => {
    const order: string[] = [];
    const groups = new Map<string, MapDestination[]>();
    for (const d of destinations) {
      if (!groups.has(d.region)) {
        groups.set(d.region, []);
        order.push(d.region);
      }
      groups.get(d.region)!.push(d);
    }
    return order.map((r) => ({ region: r, items: groups.get(r)! }));
  }, [destinations]);

  const active = hovered ?? selected;
  const shown = active ? regions.filter((g) => g.region === active.region) : regions;

  const fillFor = (dest: MapDestination | undefined) => {
    if (!dest) return LAND;
    if (active?.slug === dest.slug) return TEAL;
    if (active && active.region === dest.region) return TEAL_SOFT;
    return active ? '#BFE9E3' : TEAL_SOFT;
  };

  return (
    <div>
      {/* Map */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-white">
        <div className="absolute left-5 top-4 z-10 min-h-[3.5rem]">
          {active ? (
            <>
              <p className="eyebrow">{active.region}</p>
              <p className="font-serif text-2xl text-ink">{active.name}</p>
            </>
          ) : (
            <>
              <p className="eyebrow">Explore the map</p>
              <p className="text-sm text-ink-soft">Hover a glowing country · click to filter the list below</p>
            </>
          )}
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-5 top-4 z-10 rounded-full border border-line bg-white px-4 py-2 text-xs font-bold text-ink-soft transition-colors hover:border-teal hover:text-teal-deep"
          >
            ✕ Show all regions
          </button>
        )}

        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 175, center: [15, 6] }}
          width={980}
          height={470}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={worldData as unknown as string}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const dest = nameToDest.get(geo.properties.name as string);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={dest ? () => setHovered(dest) : undefined}
                    onMouseLeave={dest ? () => setHovered(null) : undefined}
                    onClick={dest ? () => pick(dest) : () => setSelected(null)}
                    aria-label={dest ? `${dest.name} — filter the list below` : undefined}
                    style={{
                      default: {
                        fill: fillFor(dest),
                        stroke: LAND_STROKE,
                        strokeWidth: 0.5,
                        outline: 'none',
                        transition: 'fill 250ms ease',
                        cursor: dest ? 'pointer' : 'default',
                      },
                      hover: {
                        fill: dest ? TEAL : LAND,
                        stroke: LAND_STROKE,
                        strokeWidth: 0.5,
                        outline: 'none',
                        cursor: dest ? 'pointer' : 'default',
                      },
                      pressed: { fill: dest ? TEAL : LAND, outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {ISLAND_MARKERS.map(({ slug, coordinates }) => {
            const dest = bySlug.get(slug);
            if (!dest) return null;
            const lit = active?.slug === slug;
            return (
              <Marker
                key={slug}
                coordinates={coordinates}
                onMouseEnter={() => setHovered(dest)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => pick(dest)}
                style={{ default: { cursor: 'pointer' }, hover: { cursor: 'pointer' } }}
              >
                <circle
                  r={lit ? 7 : 5}
                  fill={lit ? TEAL : TEAL_SOFT}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ transition: 'all 250ms ease' }}
                />
                {lit && (
                  <circle r={11} fill="none" stroke={TEAL} strokeWidth={1.5} opacity={0.5} />
                )}
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {/* Countries populate beneath the map */}
      <div className="mt-10 space-y-10" aria-live="polite">
        {shown.map(({ region, items }) => (
          <div key={region}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-2xl text-ink sm:text-3xl">{region}</h2>
              <p className="text-xs text-ink-soft">{items.length} destination{items.length === 1 ? '' : 's'}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((d) => (
                <Link
                  key={d.slug}
                  href={`/destinations/${d.slug}`}
                  onMouseEnter={() => setHovered(d)}
                  onMouseLeave={() => setHovered(null)}
                  className={`group rounded-xl border p-4 transition-all ${
                    hovered?.slug === d.slug
                      ? 'border-teal bg-teal/10 shadow-md'
                      : 'border-line bg-white hover:border-teal hover:bg-teal/5'
                  }`}
                >
                  <p className="font-serif text-lg leading-tight text-ink group-hover:text-teal-deep">{d.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-ink-soft">{d.strapline}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
