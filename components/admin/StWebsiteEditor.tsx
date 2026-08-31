'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { ImageField } from '@/components/admin/ImageField';
import ListEditor from '@/components/admin/ListEditor';
import {
  saveStHome,
  saveStSafety,
  type StWebsiteState,
} from '@/lib/admin/st-website-actions';

function SaveButton({ label = 'Save' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? 'Saving…' : label}
    </button>
  );
}

function Result({ state }: { state: StWebsiteState }) {
  if (!state) return null;
  return <p className={`mt-3 text-sm ${state.ok ? 'text-teal-deep' : 'text-red-600'}`}>{state.message}</p>;
}

type Section = { title: string; intro: string; points: string[] };

/**
 * The School Trips home page and Health & Safety page, edited in one place.
 *
 * Every field is prefilled with what the site is publishing and blank means
 * "leave it alone" rather than "make it empty" — so a half-finished edit
 * cannot wipe a paragraph off the live site.
 */
export default function StWebsiteEditor({
  home,
  safety,
  warning,
}: {
  home: {
    heroImage: string;
    eyebrow: string;
    headline: string;
    headlineAccent: string;
    lede: string;
    ctaPrimary: string;
    ctaSecondary: string;
    introEyebrow: string;
    introHeadline: string;
    introHeadlineAccent: string;
    introParagraphs: string[];
  };
  safety: {
    heroImage: string;
    heroTitle: string;
    heroSub: string;
    intro: string;
    sections: Section[];
    closingTitle: string;
    closingText: string;
  };
  warning?: string;
}) {
  const [tab, setTab] = useState<'home' | 'safety'>('home');

  const [homeState, homeAction] = useFormState<StWebsiteState, FormData>(saveStHome, null);
  const [safetyState, safetyAction] = useFormState<StWebsiteState, FormData>(saveStSafety, null);

  const [heroImage, setHeroImage] = useState(home.heroImage);
  const [paragraphs, setParagraphs] = useState<string[]>(
    home.introParagraphs.length ? home.introParagraphs : [''],
  );

  const [safetyHero, setSafetyHero] = useState(safety.heroImage);
  const [sections, setSections] = useState<Section[]>(safety.sections);

  const setSection = (i: number, patch: Partial<Section>) =>
    setSections((ss) => ss.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Website content</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        The words and hero images on the School Trips home page and Health &amp; Safety page.
        Anything left blank keeps the wording the site already publishes.
      </p>

      {warning && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-ink">
          {warning}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        {(
          [
            ['home', 'Home page'],
            ['safety', 'Health & Safety'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'home' && (
        <form action={homeAction} className="mt-6 max-w-3xl space-y-6">
          <input type="hidden" name="hero_image" value={heroImage} />
          <input type="hidden" name="intro_paragraphs" value={JSON.stringify(paragraphs)} />

          <section className="card p-6">
            <h2 className="font-serif text-xl text-ink">The hero</h2>
            <p className="mt-1 text-sm text-ink-soft">The first thing anyone sees.</p>
            <div className="mt-5">
              <ImageField label="Hero image" value={heroImage} onChange={setHeroImage} />
            </div>
            <div className="mt-5 grid gap-4">
              <div>
                <label className="field-label">Small line above the headline</label>
                <input name="eyebrow" defaultValue={home.eyebrow} className="field" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Headline</label>
                  <input name="headline" defaultValue={home.headline} className="field" />
                </div>
                <div>
                  <label className="field-label">Headline, italic part</label>
                  <input name="headline_accent" defaultValue={home.headlineAccent} className="field" />
                  <p className="mt-1 text-xs text-ink-soft">Shown in italics after the headline.</p>
                </div>
              </div>
              <div>
                <label className="field-label">Opening paragraph</label>
                <textarea name="lede" rows={3} defaultValue={home.lede} className="field" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">First button</label>
                  <input name="cta_primary" defaultValue={home.ctaPrimary} className="field" />
                </div>
                <div>
                  <label className="field-label">Second button</label>
                  <input name="cta_secondary" defaultValue={home.ctaSecondary} className="field" />
                </div>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-serif text-xl text-ink">Introduction</h2>
            <p className="mt-1 text-sm text-ink-soft">The block of text under the hero.</p>
            <div className="mt-5 grid gap-4">
              <div>
                <label className="field-label">Small line above the heading</label>
                <input name="intro_eyebrow" defaultValue={home.introEyebrow} className="field" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Heading</label>
                  <input name="intro_headline" defaultValue={home.introHeadline} className="field" />
                </div>
                <div>
                  <label className="field-label">Heading, italic part</label>
                  <input
                    name="intro_headline_accent"
                    defaultValue={home.introHeadlineAccent}
                    className="field"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5">
              <ListEditor
                label="Paragraphs"
                hint="One entry per paragraph"
                items={paragraphs}
                onChange={setParagraphs}
                multiline
                placeholder="A paragraph of the introduction…"
              />
            </div>
          </section>

          <Result state={homeState} />
          <SaveButton label="Save home page" />
        </form>
      )}

      {tab === 'safety' && (
        <form action={safetyAction} className="mt-6 max-w-3xl space-y-6">
          <input type="hidden" name="hero_image" value={safetyHero} />
          <input type="hidden" name="sections" value={JSON.stringify(sections)} />

          <section className="card p-6">
            <h2 className="font-serif text-xl text-ink">The hero</h2>
            <div className="mt-5">
              <ImageField label="Hero image" value={safetyHero} onChange={setSafetyHero} />
            </div>
            <div className="mt-5 grid gap-4">
              <div>
                <label className="field-label">Page title</label>
                <input name="hero_title" defaultValue={safety.heroTitle} className="field" />
              </div>
              <div>
                <label className="field-label">Line under &ldquo;Our promise&rdquo;</label>
                <input name="hero_sub" defaultValue={safety.heroSub} className="field" />
              </div>
              <div>
                <label className="field-label">Opening paragraph</label>
                <textarea name="intro" rows={4} defaultValue={safety.intro} className="field" />
              </div>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl text-ink">Sections</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Each area of safety, with its own list of points.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSections((ss) => [...ss, { title: '', intro: '', points: [] }])}
                className="text-sm font-semibold text-teal-deep hover:underline"
              >
                + Add a section
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {sections.map((s, i) => (
                <div key={i} className="rounded-xl bg-sand/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <label className="field-label">Section title</label>
                      <input
                        value={s.title}
                        onChange={(e) => setSection(i, { title: e.target.value })}
                        className="field"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSections((ss) => ss.filter((_, n) => n !== i))}
                      className="mt-7 shrink-0 text-sm font-semibold text-ink-soft hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3">
                    <label className="field-label">Intro</label>
                    <textarea
                      rows={2}
                      value={s.intro}
                      onChange={(e) => setSection(i, { intro: e.target.value })}
                      className="field"
                    />
                  </div>
                  <div className="mt-3">
                    <ListEditor
                      label="Points"
                      items={s.points}
                      onChange={(points) => setSection(i, { points })}
                      multiline
                      placeholder="A point in this section…"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-serif text-xl text-ink">Closing</h2>
            <div className="mt-5 grid gap-4">
              <div>
                <label className="field-label">Title</label>
                <input name="closing_title" defaultValue={safety.closingTitle} className="field" />
              </div>
              <div>
                <label className="field-label">Text</label>
                <textarea name="closing_text" rows={3} defaultValue={safety.closingText} className="field" />
              </div>
            </div>
          </section>

          <Result state={safetyState} />
          <SaveButton label="Save Health & Safety page" />
        </form>
      )}
    </div>
  );
}
