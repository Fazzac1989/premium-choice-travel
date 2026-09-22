'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PackageBrochure, PageContent } from '@/lib/package-brochure/schema';
import type { BrochurePackage } from '@/lib/package-brochure/data';
import {
  hasCoursesPage,
  hasWhyPage,
  introSummary,
  paginateContents,
  type PackageGroup,
  type PackageSpread,
} from '@/lib/package-brochure/spreads';
import { highlightIcon } from '@/lib/package-brochure/highlight-icons';
import { sizedImage } from '@/lib/package-brochure/image-size';
import '@/components/pkg-brochure/deck.css';
import '@/components/pkg-brochure/golf.css';

type Brand = {
  name: string;
  /** The dark mark for a pale page, and the white cut for a navy one. */
  logo: string;
  logoWhite: string;
  site: string;
};

type Props = {
  brochure: PackageBrochure;
  spreads: PackageSpread[];
  groups: PackageGroup[];
  brand: Brand;
  pdfHref: string;
  brochureQrSvg: string | null;
};

/**
 * The brochure, as a deck.
 *
 * Every slide is rendered and the print stylesheet lays them out as A4 pages,
 * so the PDF is this document rather than a second one built to match. That is
 * the arrangement the School Trips brochure settled on and it is worth keeping:
 * there is no separate print template to fall out of step.
 */
export default function PackageBrochureSlides({
  brochure,
  spreads,
  groups,
  brand,
  pdfHref,
  brochureQrSvg,
}: Props) {
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<'forward' | 'back' | null>(null);
  const previous = useRef(0);

  const design = brochure.design;
  const showItinerary = design.showItinerary !== false;
  const showCourses = design.showCourses !== false;
  const showWhy = design.showWhy !== false;

  const hasContents = spreads.length > 0;
  const contentsPages = hasContents ? paginateContents(groups) : [];
  const hasClosing = Boolean(brochure.closingText);

  // Introduction, then the courses, the day-by-day and why — each only when
  // the package actually has something to put on it.
  const slidesPerPackage = spreads.map(
    (s) =>
      1 +
      (showCourses && hasCoursesPage(s.pkg) ? 1 : 0) +
      (showItinerary && (s.pkg?.itinerary ?? []).length > 0 ? 1 : 0) +
      (showWhy && hasWhyPage(s.pkg) ? 1 : 0),
  );
  const packageSlideTotal = slidesPerPackage.reduce((a, b) => a + b, 0);
  const total = 1 + contentsPages.length + packageSlideTotal + (hasClosing ? 1 : 0);
  const firstPackageIndex = 1 + contentsPages.length;
  const contentsIndex = hasContents ? 1 : -1;

  const go = useCallback(
    (next: number) => {
      const i = Math.max(0, Math.min(total - 1, next));
      if (i === index) return;
      previous.current = index;
      setTurning(i > index ? 'forward' : 'back');
      setIndex(i);
    },
    [index, total],
  );

  // The turn is decoration; the page is switched immediately either way.
  useEffect(() => {
    if (!turning) return;
    const t = setTimeout(() => setTurning(null), 440);
    return () => clearTimeout(t);
  }, [turning, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(index + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(index - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(total - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, total]);

  /**
   * Our own PDF, not the browser's print dialogue, which produces whatever the
   * reader's settings say — its own margins, and background graphics off by
   * default, which would print a navy page white.
   */
  const download = () => {
    window.location.href = pdfHref;
  };

  /** Where a package's introduction sits, so the contents can jump to it. */
  const slideOf = (packageId: number) => {
    const n = spreads.findIndex((s) => s.packageId === packageId);
    if (n < 0) return firstPackageIndex;
    return firstPackageIndex + slidesPerPackage.slice(0, n).reduce((a, b) => a + b, 0);
  };

  const pageClass = (i: number) => {
    if (i === index && turning) return turning === 'forward' ? 'sl-page sl-entering' : 'sl-page';
    if (i === previous.current && turning) return 'sl-page sl-leaving';
    return 'sl-page';
  };

  // While turning, the outgoing page has to stay on screen to be seen leaving.
  const visible = (i: number) => i === index || (turning !== null && i === previous.current);

  const slides: React.ReactNode[] = [];
  const coverLight = design.coverTheme === 'light';

  /* ───────────────────────────── cover ───────────────────────────── */
  slides.push(
    <article
      key="cover"
      className={`${pageClass(0)} sl-cover${coverLight ? ' sl-cover--light' : ''}`}
      hidden={!visible(0)}
    >
      {/* The mark first, so on paper it sits at the head of the page. */}
      <div className="sl-mark">
        <a className="sl-brand" href={brand.site} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverLight ? brand.logo : brand.logoWhite} alt={brand.name} />
        </a>
      </div>
      <div className="sl-body">
        <p className="sl-eyebrow">{brochure.subtitle ?? brand.name}</p>
        <h1>{brochure.title}</h1>
        {brochure.introText && <p className="sl-sub">{brochure.introText}</p>}
      </div>
      <span className="sl-edition sl-cover-edition">
        {(brochure.publishedAt ?? brochure.createdAt).slice(0, 4)}
      </span>
    </article>,
  );

  /* ──────────────────────────── contents ──────────────────────────── */
  contentsPages.forEach((page, n) => {
    const i = slides.length;
    slides.push(
      <article key={`contents-${n}`} className={pageClass(i)} hidden={!visible(i)}>
        <div className="sl-body">
          <Masthead brand={brand} eyebrow="Contents" />
          <h2>
            {contentsPages.length > 1 ? `Contents (${n + 1} of ${contentsPages.length})` : 'Contents'}
          </h2>
          <div className="sl-toc-cols">
            {page.map((g, k) => (
              <section className="sl-group" key={`${g.label || 'all'}-${k}`}>
                {g.label && <p className="sl-group-label">{g.label}</p>}
                <ul className="sl-toc">
                  {g.spreads.map((s) => (
                    <li key={s.packageId}>
                      <button type="button" onClick={() => go(slideOf(s.packageId))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="sl-thumb"
                          src={sizedImage(s.pkg?.heroImage ?? s.images[0], 'micro') ?? undefined}
                          alt=""
                        />
                        <span className="sl-t">{s.pkg?.title ?? s.content.headline ?? 'Journey'}</span>
                        <span className="sl-m">
                          {[
                            s.pkg?.destination,
                            s.pkg?.category,
                            s.pkg?.nights ? `${s.pkg.nights} nights` : null,
                            s.pkg?.rounds ? `${s.pkg.rounds} rounds` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </article>,
    );
  });

  /* ───────────────────────── one package at a time ───────────────────────── */
  for (const s of spreads) {
    const p = s.pkg;

    // The introduction.
    {
      const i = slides.length;
      slides.push(
        <article key={`intro-${s.packageId}`} className={pageClass(i)} hidden={!visible(i)}>
          <div className="sl-body">
            <Masthead brand={brand} eyebrow={[p?.destination, p?.category].filter(Boolean).join(' · ')} />
            <PackageIntro spread={s} />
          </div>
        </article>,
      );
    }

    // The courses.
    if (showCourses && hasCoursesPage(p)) {
      const i = slides.length;
      slides.push(
        <article key={`courses-${s.packageId}`} className={pageClass(i)} hidden={!visible(i)}>
          <div className="sl-body">
            <Masthead brand={brand} eyebrow={`${p!.title} · The courses`} />
            <div className="sl-courses-head">
              <h2>The courses</h2>
              {p!.rounds !== null && (
                <span className="sl-rounds">
                  {p!.rounds}
                  <small>{p!.rounds === 1 ? 'round' : 'rounds'}</small>
                </span>
              )}
            </div>
            <ul className={`sl-courses${p!.courses.length > 3 ? ' sl-courses-two' : ''}`}>
              {p!.courses.map((c, n) => (
                <li className="sl-course" key={n}>
                  {c.heading && <h3>{c.heading}</h3>}
                  {c.body && <p>{c.body}</p>}
                </li>
              ))}
            </ul>
            {p!.roundsNote && <p className="sl-note">{p!.roundsNote}</p>}
            {/* Handicap, buggies, caddies, clubs and tee times sit with the
                courses rather than on the why page: they are all about
                playing, and three courses alone left the sheet two-thirds
                empty. */}
            <GolfFacts pkg={p!} />
          </div>
        </article>,
      );
    }

    // The day-by-day.
    if (showItinerary && (p?.itinerary ?? []).length > 0) {
      const i = slides.length;
      const days = p!.itinerary;
      const included = s.content.inclusions?.length ? s.content.inclusions : p!.includes;
      const excluded = s.content.exclusions?.length ? s.content.exclusions : p!.excludes;
      slides.push(
        <article key={`days-${s.packageId}`} className={pageClass(i)} hidden={!visible(i)}>
          <div className="sl-body">
            <Masthead brand={brand} eyebrow={`${p!.title} · Day by day`} />
            <h2>Day by day</h2>
            {/* Four columns and smaller type when the days will not otherwise
                fit the sheet. Counting days alone was not enough: an eight-day
                journey sits comfortably at 1,700 characters and runs off the
                bottom at 2,500, so the length of the writing decides it too. */}
            <div className={`sl-days${isDense(days) ? ' sl-days-dense' : ''}`}>
              {days.map((d, n) => (
                <div className="sl-day" key={n}>
                  <p className="sl-day-n">{d.label || `Day ${n + 1}`}</p>
                  <h4>{d.title}</h4>
                  {d.description && <p>{d.description}</p>}
                </div>
              ))}
            </div>
            <Inclusions included={included} excluded={excluded} />
          </div>
        </article>,
      );
    }

    // Why this destination.
    if (showWhy && hasWhyPage(p)) {
      const i = slides.length;
      slides.push(
        <article key={`why-${s.packageId}`} className={`${pageClass(i)} sl-why-page`} hidden={!visible(i)}>
          <div className="sl-body">
            <Masthead brand={brand} eyebrow={`${p!.title} · Why ${p!.destination ?? 'here'}`} white />
            <div className="sl-why">
              <div>
                <h2>Why {p!.destination ?? 'this destination'}</h2>
                {p!.whyWorks.length > 0 && (
                  <>
                    <p className="sl-why-label">Why it works</p>
                    <ul className="sl-why-list">
                      {p!.whyWorks.map((w, n) => (
                        <li key={n}>{w}</li>
                      ))}
                    </ul>
                  </>
                )}
                {p!.seasonalNotes && <p className="sl-season">{p!.seasonalNotes}</p>}
              </div>
              <div className="sl-why-side">
                {p!.whoFor.length > 0 && (
                  <div className="sl-why-fact">
                    <span>Who it suits</span>
                    <ul>
                      {p!.whoFor.map((w, n) => (
                        <li key={n}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <PriceLine pkg={p!} />
                {p!.extensions.length > 0 && (
                  <div className="sl-why-fact">
                    <span>Add on</span>
                    <ul>
                      {p!.extensions.map((e, n) => (
                        <li key={n}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>,
      );
    }
  }

  /* ───────────────────────────── closing ───────────────────────────── */
  if (hasClosing) {
    const i = slides.length;
    slides.push(
      <article key="closing" className={`${pageClass(i)} sl-closing`} hidden={!visible(i)}>
        <div className="sl-body">
          <p className="sl-eyebrow">Next steps</p>
          <h2>Talk to us about any of these</h2>
          {brochure.closingText && <p className="sl-lede">{brochure.closingText}</p>}
          <div className="sl-contact">
            {design.contactPhone && <a href={`tel:${design.contactPhone.replace(/\s/g, '')}`}>{design.contactPhone}</a>}
            <a href={`mailto:${design.contactEmail ?? 'info@premiumchoicetravel.com'}`}>
              {design.contactEmail ?? 'info@premiumchoicetravel.com'}
            </a>
            {brochureQrSvg && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img className="sl-qr" src={brochureQrSvg} alt="" width={68} height={68} />
            )}
          </div>
        </div>
      </article>,
    );
  }

  return (
    <div className={`sl-deck${design.documentTheme === 'dark' ? ' sl-deck--dark' : ''}`}>
      <div className="sl-bar">
        <span style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="sl-nav" onClick={() => go(index - 1)} disabled={index === 0}>
            ← Back
          </button>
          {contentsIndex >= 0 && index > contentsIndex && (
            <button type="button" className="sl-back" onClick={() => go(contentsIndex)}>
              Contents
            </button>
          )}
        </span>
        <span className="sl-count" aria-live="polite">
          {index + 1} / {total}
        </span>
        <span style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="sl-nav" onClick={download}>
            Download as PDF
          </button>
          <button type="button" className="sl-nav" onClick={() => go(index + 1)} disabled={index === total - 1}>
            Next →
          </button>
        </span>
      </div>

      <div className="sl-stage">{slides}</div>
    </div>
  );
}

/* ───────────────────────────── pieces ───────────────────────────── */

/**
 * Whether a day-by-day needs the four-column, smaller-type layout.
 *
 * Measured against the 36 itineraries in the golf collection: at three columns
 * everything up to about 1,900 characters clears an A4 sheet, and the one that
 * did not — eight days and 2,531 characters — clears it at four. Counting days
 * alone would have shrunk four perfectly comfortable pages to fix one.
 */
export function isDense(days: { description: string }[]): boolean {
  if (days.length > 8) return true;
  const chars = days.reduce((a, d) => a + (d.description?.length ?? 0), 0);
  return chars > 1900;
}

function Masthead({ brand, eyebrow, white }: { brand: Brand; eyebrow: string; white?: boolean }) {
  return (
    <div className="sl-masthead">
      <p className="sl-eyebrow">{eyebrow}</p>
      <a className="sl-brand" href={brand.site} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={white ? brand.logoWhite : brand.logo} alt={brand.name} />
      </a>
    </div>
  );
}

/** The package's opening page: the pitch, the pictures and the highlights. */
function PackageIntro({ spread }: { spread: PackageSpread }) {
  const p = spread.pkg;
  const c: PageContent = spread.content;
  const lede = c.proposition ?? p?.tagline ?? introSummary(p?.overview ?? [], 240);
  const body = c.body?.length ? c.body : (p?.overview ?? []).slice(0, 1);
  const shots = [p?.heroImage, ...(spread.images.length ? spread.images : p?.images ?? [])]
    .filter((x): x is string => Boolean(x))
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 3);
  const highlights = (c.highlights?.map((h) => h.name) ?? p?.highlights ?? []).slice(0, 6);

  return (
    <>
      <h2>{c.headline ?? p?.title}</h2>
      {lede && <p className="sl-lede">{lede}</p>}

      <p className="sl-meta">
        {p?.destination && <span><b>{p.destination}</b></span>}
        {p?.nights ? <span>{p.nights} nights</span> : null}
        {p?.rounds !== null && p?.rounds !== undefined ? <span><b>{p.rounds}</b> rounds</span> : null}
        {p?.hotelName && <span>{p.hotelName}</span>}
        {p?.boardBasis && <span>{p.boardBasis}</span>}
      </p>

      <div className="sl-intro">
        <div>
          {body.map((para, n) => (
            <p className="sl-lede" key={n}>
              {para}
            </p>
          ))}
          {highlights.length > 0 && (
            <ul className={`sl-hl${highlights.length > 3 ? ' sl-hl-two' : ''}`}>
              {highlights.map((h, n) => {
                const icon = highlightIcon(h);
                return (
                  <li key={n}>
                    <svg className="sl-hl-icon" viewBox="0 0 24 24" aria-hidden="true">
                      {icon.circle && <circle cx={icon.circle[0]} cy={icon.circle[1]} r={icon.circle[2]} />}
                      {icon.paths.map((d, k) => (
                        <path d={d} key={k} />
                      ))}
                    </svg>
                    <span>{h}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="sl-shots">
          {shots.map((src, n) => (
            <figure key={n}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sizedImage(src, n === 0 ? 'hero' : 'thumb') ?? src} alt="" />
            </figure>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * The golf facts. Each line is the package's own wording; a fact it does not
 * record is not printed, and nothing is inferred from anything else.
 */
function GolfFacts({ pkg }: { pkg: BrochurePackage }) {
  /**
   * A placeholder is not a fact. Several packages record "unknown" where
   * nobody has filled the field in, and a line reading "Caddies — unknown"
   * tells a reader less than no line at all. Tee times are the exception:
   * there "unknown" means something, and it is spelled out below.
   */
  const told = (v: string | null) =>
    v && !/^(unknown|n\/?a|tbc|tba|-{1,2}|none)$/i.test(v.trim()) ? v : null;

  const rows: { label: string; value: string }[] = [];
  const add = (label: string, v: string | null) => {
    const value = told(v);
    if (value) rows.push({ label, value });
  };
  add('Handicap', pkg.handicap);
  add('Buggies', pkg.buggies);
  add('Caddies', pkg.caddies);
  add('Clubs', pkg.clubCarriage);
  add('Non-golfers', pkg.nonGolfer);
  if (!rows.length && !pkg.teeTimeStatus) return null;

  return (
    <dl className="sl-facts">
      {rows.map((r) => (
        <div className="sl-fact" key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
      {pkg.teeTimeStatus && (
        <div className="sl-fact">
          <dt>Tee times</dt>
          <dd>
            <span className="sl-teetime" data-status={pkg.teeTimeStatus}>
              {TEE_TIME_WORDING[pkg.teeTimeStatus] ?? pkg.teeTimeStatus}
            </span>
          </dd>
        </div>
      )}
    </dl>
  );
}

/**
 * How a tee-time status reads in print.
 *
 * "unknown" is the common case and it must not read as availability — the
 * package copy says "access unverified" and the brochure says the same.
 */
const TEE_TIME_WORDING: Record<string, string> = {
  held: 'Held for this departure',
  requested: 'Requested, awaiting confirmation',
  unknown: 'Access unverified — confirmed before you pay',
};

/**
 * The price. Only four packages carry one; the rest are on request, and saying
 * so plainly is better than leaving the panel out.
 */
function PriceLine({ pkg }: { pkg: BrochurePackage }) {
  const onRequest = !pkg.priceFrom;
  return (
    <dl className="sl-price">
      <dt>{onRequest ? 'Price' : 'From'}</dt>
      <dd>
        {onRequest
          ? 'On request'
          : `${pkg.currency} ${pkg.priceFrom!.toLocaleString('en-US')}`}
      </dd>
      <p className="sl-price-note">
        {onRequest
          ? 'Priced on enquiry — tee times and hotels are quoted once confirmed.'
          : 'Per golfer sharing, indicative. Confirmed on quotation.'}
      </p>
    </dl>
  );
}

/** What the price covers and what to budget for, beneath the days. */
function Inclusions({ included, excluded }: { included: string[]; excluded: string[] }) {
  if (!included.length && !excluded.length) return null;
  const items = (list: string[]) => list.map((i) => i.trim().replace(/\.$/, '')).filter(Boolean);
  const List = ({ label, list }: { label: string; list: string[] }) =>
    list.length ? (
      <div>
        <b>{label}</b>
        <ul className={items(list).length > 6 ? 'sl-incl-many' : undefined}>
          {items(list).map((i, n) => (
            <li key={n}>{i}</li>
          ))}
        </ul>
      </div>
    ) : null;
  // A lone list gets the whole width rather than half of it.
  const solo = !included.length || !excluded.length;
  return (
    <div className={`sl-incl${solo ? ' sl-incl--solo' : ''}`}>
      <List label="Included" list={included} />
      <List label="Items to budget for" list={excluded} />
    </div>
  );
}
