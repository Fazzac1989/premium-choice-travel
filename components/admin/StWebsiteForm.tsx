'use client';

import { useState } from 'react';
import { saveStSiteSettings } from '@/lib/admin/st-site-actions';
import type { SiteSettings, SafetyPage } from '@/lib/st-site-defaults';

/**
 * Structured editing for the public site's words.
 *
 * Every field is a real field rather than one giant rich-text box, so nobody
 * can accidentally delete a section or break the layout. Steps are edited as
 * "Title | text" lines: one step per line, the bar separating the two.
 */

const stepsToText = (steps: { title: string; text: string }[]) =>
  steps.map((s) => `${s.title} | ${s.text}`).join('\n');

const textToSteps = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split('|');
      return { title: title.trim(), text: rest.join('|').trim() };
    })
    .filter((s) => s.title);

const parasToText = (paras: string[]) => paras.join('\n\n');
const textToParas = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

function Group({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="card p-0" open={open}>
      <summary className="cursor-pointer px-6 py-4 font-serif text-lg text-ink">{title}</summary>
      <div className="grid gap-4 border-t border-line p-6">{children}</div>
    </details>
  );
}

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
  </label>
);

export default function StWebsiteForm({
  site: initialSite,
  safety: initialSafety,
  siteUrl,
}: {
  site: SiteSettings;
  safety: SafetyPage;
  siteUrl: string;
}) {
  const [site, setSite] = useState(initialSite);
  const [safety, setSafety] = useState(initialSafety);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = <K extends keyof SiteSettings>(area: K, fields: Partial<SiteSettings[K]>) =>
    setSite((s) => ({ ...s, [area]: { ...(s[area] as object), ...fields } as SiteSettings[K] }));

  async function save(key: 'site' | 'safety_page') {
    setBusy(key);
    setError(null);
    setNote(null);
    const res = await saveStSiteSettings(key, key === 'site' ? site : safety);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setNote('Saved. The public site rebuilds within a minute or two.');
  }

  return (
    <div className="mt-8 grid gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      {note && <p className="text-sm font-semibold text-teal-deep">{note}</p>}

      <Group title="Homepage hero" open>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headline">
            <input className="field" value={site.hero.headline} onChange={(e) => patch('hero', { headline: e.target.value })} />
          </Field>
          <Field label="Headline accent" hint="Set in italics at the end of the headline.">
            <input className="field" value={site.hero.headlineAccent} onChange={(e) => patch('hero', { headlineAccent: e.target.value })} />
          </Field>
        </div>
        <Field label="Supporting statement">
          <textarea rows={2} className="field" value={site.hero.lede} onChange={(e) => patch('hero', { lede: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary button">
            <input className="field" value={site.hero.ctaPrimary} onChange={(e) => patch('hero', { ctaPrimary: e.target.value })} />
          </Field>
          <Field label="Secondary button">
            <input className="field" value={site.hero.ctaSecondary} onChange={(e) => patch('hero', { ctaSecondary: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="Homepage introduction">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Eyebrow" hint="The small line above the heading — the campaign strapline lives here.">
            <input className="field" value={site.intro.eyebrow} onChange={(e) => patch('intro', { eyebrow: e.target.value })} />
          </Field>
          <Field label="Heading">
            <input className="field" value={site.intro.headline} onChange={(e) => patch('intro', { headline: e.target.value })} />
          </Field>
          <Field label="Heading accent">
            <input className="field" value={site.intro.headlineAccent} onChange={(e) => patch('intro', { headlineAccent: e.target.value })} />
          </Field>
        </div>
        <Field label="Introduction" hint="Leave a blank line between paragraphs.">
          <textarea rows={8} className="field" value={parasToText(site.intro.paragraphs)} onChange={(e) => patch('intro', { paragraphs: textToParas(e.target.value) })} />
        </Field>
      </Group>

      <Group title="Parents · Children · Teachers">
        <Field label="Heading">
          <input className="field" value={site.pct.headline} onChange={(e) => patch('pct', { headline: e.target.value })} />
        </Field>
        <Field label="Supporting line">
          <input className="field" value={site.pct.sub} onChange={(e) => patch('pct', { sub: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Parents">
            <textarea rows={4} className="field" value={site.pct.parents} onChange={(e) => patch('pct', { parents: e.target.value })} />
          </Field>
          <Field label="Children">
            <textarea rows={4} className="field" value={site.pct.children} onChange={(e) => patch('pct', { children: e.target.value })} />
          </Field>
          <Field label="Teachers">
            <textarea rows={4} className="field" value={site.pct.teachers} onChange={(e) => patch('pct', { teachers: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="Tailored journeys">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading">
            <input className="field" value={site.tailored.headline} onChange={(e) => patch('tailored', { headline: e.target.value })} />
          </Field>
          <Field label="Heading accent">
            <input className="field" value={site.tailored.headlineAccent} onChange={(e) => patch('tailored', { headlineAccent: e.target.value })} />
          </Field>
        </div>
        <Field label="Body" hint="Leave a blank line between paragraphs.">
          <textarea rows={7} className="field" value={parasToText(site.tailored.paragraphs)} onChange={(e) => patch('tailored', { paragraphs: textToParas(e.target.value) })} />
        </Field>
        <Field label="Closing line">
          <textarea rows={2} className="field" value={site.tailored.closing} onChange={(e) => patch('tailored', { closing: e.target.value })} />
        </Field>
      </Group>

      <Group title="Journey inspiration">
        <p className="text-xs text-ink-soft">
          The six journeys shown are the trips marked <strong>featured</strong> in Trips — tick
          Featured on a trip to place it here.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Eyebrow">
            <input className="field" value={site.inspiration.eyebrow} onChange={(e) => patch('inspiration', { eyebrow: e.target.value })} />
          </Field>
          <Field label="Heading">
            <input className="field" value={site.inspiration.headline} onChange={(e) => patch('inspiration', { headline: e.target.value })} />
          </Field>
          <Field label="Heading accent">
            <input className="field" value={site.inspiration.headlineAccent} onChange={(e) => patch('inspiration', { headlineAccent: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="With you at every stage">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Eyebrow">
            <input className="field" value={site.stages.eyebrow} onChange={(e) => patch('stages', { eyebrow: e.target.value })} />
          </Field>
          <Field label="Heading">
            <input className="field" value={site.stages.headline} onChange={(e) => patch('stages', { headline: e.target.value })} />
          </Field>
          <Field label="Heading accent">
            <input className="field" value={site.stages.headlineAccent} onChange={(e) => patch('stages', { headlineAccent: e.target.value })} />
          </Field>
        </div>
        <Field label="Supporting line">
          <input className="field" value={site.stages.sub} onChange={(e) => patch('stages', { sub: e.target.value })} />
        </Field>
        <Field label="Steps" hint="One step per line: Title | text.">
          <textarea rows={6} className="field font-mono text-xs" value={stepsToText(site.stages.steps)} onChange={(e) => patch('stages', { steps: textToSteps(e.target.value) })} />
        </Field>
      </Group>

      <Group title="Start planning / consultation">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading">
            <input className="field" value={site.planning.headline} onChange={(e) => patch('planning', { headline: e.target.value })} />
          </Field>
          <Field label="Heading accent">
            <input className="field" value={site.planning.headlineAccent} onChange={(e) => patch('planning', { headlineAccent: e.target.value })} />
          </Field>
          <Field label="Panel title">
            <input className="field" value={site.planning.panelTitle} onChange={(e) => patch('planning', { panelTitle: e.target.value })} />
          </Field>
          <Field label="Panel supporting line">
            <input className="field" value={site.planning.panelSub} onChange={(e) => patch('planning', { panelSub: e.target.value })} />
          </Field>
        </div>
        <Field label="Steps" hint="One step per line: Title | text.">
          <textarea rows={5} className="field font-mono text-xs" value={stepsToText(site.planning.steps)} onChange={(e) => patch('planning', { steps: textToSteps(e.target.value) })} />
        </Field>
      </Group>

      <Group title="Switches & contact">
        <label className="flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal"
            checked={site.flags.appPromotion}
            onChange={(e) => patch('flags', { appPromotion: e.target.checked })}
          />
          Promote the mobile app on the homepage
          <span className="text-xs text-ink-soft">— off until the app launch is announced</span>
        </label>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal"
            checked={site.flags.subjectMap}
            onChange={(e) => patch('flags', { subjectMap: e.target.checked })}
          />
          Show the world map on subject pages
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telephone">
            <input className="field" value={site.contact.phone} onChange={(e) => patch('contact', { phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="field" value={site.contact.email} onChange={(e) => patch('contact', { email: e.target.value })} />
          </Field>
        </div>
      </Group>

      <div className="flex items-center gap-3">
        <button className="btn-primary !py-2.5" disabled={busy !== null} onClick={() => save('site')}>
          {busy === 'site' ? 'Saving…' : 'Save website settings'}
        </button>
        <a className="btn-outline !bg-white !py-2.5" href={siteUrl} target="_blank" rel="noreferrer">
          View the site ↗
        </a>
      </div>

      <h2 className="mt-6 font-serif text-2xl text-ink">Health, Safety &amp; Security page</h2>

      <Group title="Hero & introduction">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Page title">
            <input className="field" value={safety.heroTitle} onChange={(e) => setSafety({ ...safety, heroTitle: e.target.value })} />
          </Field>
          <Field label="Supporting line">
            <input className="field" value={safety.heroSub} onChange={(e) => setSafety({ ...safety, heroSub: e.target.value })} />
          </Field>
        </div>
        <Field label="Introduction">
          <textarea rows={4} className="field" value={safety.intro} onChange={(e) => setSafety({ ...safety, intro: e.target.value })} />
        </Field>
      </Group>

      {safety.sections.map((section, i) => (
        <Group key={i} title={`Section ${i + 1} — ${section.title}`}>
          <Field label="Title">
            <input
              className="field"
              value={section.title}
              onChange={(e) => {
                const next = [...safety.sections];
                next[i] = { ...section, title: e.target.value };
                setSafety({ ...safety, sections: next });
              }}
            />
          </Field>
          <Field label="Introduction">
            <textarea
              rows={3}
              className="field"
              value={section.intro}
              onChange={(e) => {
                const next = [...safety.sections];
                next[i] = { ...section, intro: e.target.value };
                setSafety({ ...safety, sections: next });
              }}
            />
          </Field>
          <Field label="Points" hint="One per line. Leave empty for a text-only section.">
            <textarea
              rows={4}
              className="field"
              value={section.points.join('\n')}
              onChange={(e) => {
                const next = [...safety.sections];
                next[i] = { ...section, points: e.target.value.split('\n').map((p) => p.trim()).filter(Boolean) };
                setSafety({ ...safety, sections: next });
              }}
            />
          </Field>
        </Group>
      ))}

      <Group title="Closing">
        <Field label="Title">
          <input className="field" value={safety.closing.title} onChange={(e) => setSafety({ ...safety, closing: { ...safety.closing, title: e.target.value } })} />
        </Field>
        <Field label="Text">
          <textarea rows={3} className="field" value={safety.closing.text} onChange={(e) => setSafety({ ...safety, closing: { ...safety.closing, text: e.target.value } })} />
        </Field>
      </Group>

      <div className="flex items-center gap-3">
        <button className="btn-primary !py-2.5" disabled={busy !== null} onClick={() => save('safety_page')}>
          {busy === 'safety_page' ? 'Saving…' : 'Save safety page'}
        </button>
        <a className="btn-outline !bg-white !py-2.5" href={`${siteUrl}/safety`} target="_blank" rel="noreferrer">
          View the page ↗
        </a>
      </div>
    </div>
  );
}
