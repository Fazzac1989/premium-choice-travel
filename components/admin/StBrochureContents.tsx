'use client';

import {
  moveStBrochureTrip,
  setStBrochureTripHidden,
  updateStBrochureDesign,
} from '@/lib/admin/st-brochure-actions';
import type { Brochure, BrochurePage } from '@/lib/brochure/schema';

/**
 * What the brochure contains, in the order a reader meets it.
 *
 * The brochure is a deck: cover, contents, a page or two per trip, then the
 * pages about us, then the closing page. The stored rows underneath do not
 * map one-to-one onto those pages — a trip has several rows of copy, and the
 * standard pages have no rows at all — which is why a list of rows was
 * confusing to reorder and impossible to prune. This list is the deck.
 *
 * Trips move and hide as a whole. The standard pages switch on and off. The
 * cover picks its theme. Every change is saved as it is made.
 */

type TripInfo = { id: number; title: string; days: number };

export default function StBrochureContents({
  brochure,
  pages,
  trips,
  run,
  busy,
}: {
  brochure: Brochure;
  pages: BrochurePage[];
  trips: TripInfo[];
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const d = brochure.design;
  const on = (v: boolean | undefined) => v !== false;
  const light = d.coverTheme === 'light';

  // Trips in the order their first row appears — the order the deck uses.
  const order: number[] = [];
  for (const p of pages) if (p.tripId && !order.includes(p.tripId)) order.push(p.tripId);
  const hiddenTrip = (id: number) => pages.filter((p) => p.tripId === id).every((p) => p.hidden);
  const info = (id: number) => trips.find((t) => t.id === id);
  const shown = order.filter((id) => !hiddenTrip(id));

  const hasClosing = Boolean(
    brochure.closingText || pages.some((p) => p.pageType === 'contact' || p.pageType === 'callToAction'),
  );

  const setDesign = (patch: Record<string, unknown>, note: string) =>
    run('design', () => updateStBrochureDesign(brochure.id, patch), note);

  // Page numbers as the deck will show them. Safety runs to three pages.
  let n = 0;
  const num = () => String(++n).padStart(2, '0');
  /** "05–07": a section that takes several pages. */
  const span = (count: number) => {
    const first = num();
    n += count - 1;
    return `${first}–${String(n).padStart(2, '0')}`;
  };

  const Row = ({
    number,
    title,
    detail,
    right,
    muted,
  }: {
    number: string;
    title: string;
    detail?: string;
    right?: React.ReactNode;
    muted?: boolean;
  }) => (
    <div className={`card flex flex-wrap items-center gap-4 p-4 ${muted ? 'opacity-50' : ''}`}>
      <span className="w-8 text-right text-xs tabular-nums text-ink-soft">{number}</span>
      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {detail && <p className="mt-0.5 text-xs text-ink-soft">{detail}</p>}
      </div>
      {right}
    </div>
  );

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
      <input
        type="checkbox"
        checked={value}
        disabled={busy !== null}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-teal"
      />
      {label}
    </label>
  );

  return (
    <section>
      <h2 className="font-serif text-xl text-ink">What the brochure contains</h2>
      <p className="mt-1 text-sm text-ink-soft">
        In reading order, as the PDF will print. Trips move and hide as a whole; the standard
        pages switch on and off; changes save as you make them.
      </p>

      <div className="mt-4 grid gap-2">
        <Row
          number={num()}
          title="Cover"
          detail={`${brochure.title}${brochure.clientName ? ` · prepared for ${brochure.clientName}` : ''}`}
          right={
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setDesign({ coverTheme: t }, `Cover set to ${t}.`)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    (t === 'light') === light ? 'border-teal bg-teal/5 text-teal-deep' : 'border-line text-ink-soft hover:border-teal'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          }
        />

        {shown.length > 0 && <Row number={num()} title="Contents" detail={`${shown.length} trip${shown.length === 1 ? '' : 's'}, with thumbnails`} />}

        {order.map((id, i) => {
          const t = info(id);
          const hidden = hiddenTrip(id);
          const withDays = on(d.showItinerary) && (t?.days ?? 0) > 0;
          const number = hidden ? '—' : withDays ? `${num()}–${num()}` : num();
          return (
            <Row
              key={id}
              number={number}
              title={t?.title ?? `Trip ${id}`}
              detail={
                hidden
                  ? 'Hidden — not in the brochure'
                  : withDays
                    ? `Introduction, then the day-by-day itinerary (${t?.days} days)`
                    : 'Introduction'
              }
              muted={hidden}
              right={
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <button
                    disabled={busy !== null || i === 0}
                    onClick={() => run(`trip-up-${id}`, () => moveStBrochureTrip(brochure.id, id, -1))}
                    className="text-ink-soft hover:text-teal-deep disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    disabled={busy !== null || i === order.length - 1}
                    onClick={() => run(`trip-dn-${id}`, () => moveStBrochureTrip(brochure.id, id, 1))}
                    className="text-ink-soft hover:text-teal-deep disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      run(
                        `trip-hide-${id}`,
                        () => setStBrochureTripHidden(brochure.id, id, !hidden),
                        hidden ? 'Trip shown.' : 'Trip hidden.',
                      )
                    }
                    className="text-ink-soft hover:text-teal-deep"
                  >
                    {hidden ? 'Show' : 'Hide'}
                  </button>
                </div>
              }
            />
          );
        })}

        {order.some((id) => (info(id)?.days ?? 0) > 0) && (
          <div className="px-4 py-1">
            <Toggle
              label="Include the day-by-day itinerary page for each trip"
              value={on(d.showItinerary)}
              onChange={(v) => setDesign({ showItinerary: v }, v ? 'Itinerary pages on.' : 'Itinerary pages off.')}
            />
          </div>
        )}

        <Row
          number={on(d.showIntro) ? num() : '—'}
          title="About Premium Choice"
          detail="Who we are — the standard introduction"
          muted={!on(d.showIntro)}
          right={<Toggle label="Include" value={on(d.showIntro)} onChange={(v) => setDesign({ showIntro: v }, v ? 'Introduction on.' : 'Introduction off.')} />}
        />
        <Row
          number={on(d.showSafety) ? span(3) : '—'}
          title="Health, safety & security"
          detail="The same content as the website's safety page, over three pages"
          muted={!on(d.showSafety)}
          right={<Toggle label="Include" value={on(d.showSafety)} onChange={(v) => setDesign({ showSafety: v }, v ? 'Safety pages on.' : 'Safety pages off.')} />}
        />
        <Row
          number={on(d.showApp) ? num() : '—'}
          title="Our technology"
          detail="The app, with the parent, child and teacher screens"
          muted={!on(d.showApp)}
          right={<Toggle label="Include" value={on(d.showApp)} onChange={(v) => setDesign({ showApp: v }, v ? 'Technology page on.' : 'Technology page off.')} />}
        />

        {hasClosing && <Row number={num()} title="Closing page" detail="Next steps and how to reach us — edit its text below" />}
      </div>
    </section>
  );
}
