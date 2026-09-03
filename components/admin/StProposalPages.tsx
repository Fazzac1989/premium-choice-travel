'use client';

import { useState } from 'react';
import { updateStProposalContent } from '@/lib/admin/st-proposal-actions';
import {
  PAGE_PLACEMENTS,
  PAGE_PLACEMENT_LABELS,
  type CustomPage,
  type ProposalContent,
} from '@/lib/brochure/proposal-schema';

/**
 * Pages of the author's own.
 *
 * Everything else in a proposal has a fixed shape — a day has a timetable, the
 * price has inclusions. A custom page is the blank space: a heading, as many
 * paragraphs as wanted, one photograph if wanted, and a choice of where in the
 * document it goes. It appears in the online page as a section and in the
 * PDF as a slide, in the contents of both.
 */

type ImageOption = { id: number; alt: string; url: string };

/** A page as it is edited: the body as one text, blank lines between paragraphs. */
type EditablePage = Omit<CustomPage, 'body'> & { text: string };

const newPage = (): EditablePage => ({
  id: `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  eyebrow: '',
  title: '',
  text: '',
  imageId: null,
  placement: 'end',
});

export default function StProposalPages({
  proposalId,
  content,
  images,
  run,
  busy,
}: {
  proposalId: number;
  content: ProposalContent;
  images: ImageOption[];
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  // Body is edited as one text with blank lines between paragraphs, the way
  // the rest of the studio's copy is written.
  const [pages, setPages] = useState<EditablePage[]>(
    content.customPages.map((p) => ({ ...p, text: p.body.join('\n\n') })),
  );

  const update = (i: number, patch: Partial<(typeof pages)[number]>) =>
    setPages((list) => list.map((p, n) => (n === i ? { ...p, ...patch } : p)));

  const move = (i: number, dir: -1 | 1) =>
    setPages((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = () =>
    run(
      'pages',
      () =>
        updateStProposalContent(proposalId, {
          customPages: pages.map(({ text, ...p }) => ({
            ...p,
            title: p.title.trim(),
            eyebrow: p.eyebrow.trim(),
            body: text
              .split(/\n\s*\n/)
              .map((s) => s.trim())
              .filter(Boolean),
          })),
        }),
      'Pages saved.',
    );

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Your own pages</h2>
        <p className="mt-1 text-sm text-ink-soft">
          A blank page for anything the fixed sections do not cover — a welcome from the
          team, a note on the accommodation, a word about the school&apos;s curriculum
          links. Each one becomes a section of the online proposal and a slide of the PDF.
          About 200 words fits one slide; a longer page runs onto a second.
        </p>
      </section>

      {pages.length === 0 && (
        <p className="text-sm text-ink-soft">No pages yet. Add one below.</p>
      )}

      {pages.map((page, i) => (
        <section className="card p-6" key={page.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-lg text-ink">
              Page {i + 1}
              {page.title ? ` — ${page.title}` : ''}
            </h3>
            <div className="flex gap-2 text-sm">
              <button className="btn-outline !bg-white !px-3 !py-1.5" onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button
                className="btn-outline !bg-white !px-3 !py-1.5"
                onClick={() => move(i, 1)}
                disabled={i === pages.length - 1}
              >
                ↓
              </button>
              <button
                className="btn-outline !border-danger !bg-white !px-3 !py-1.5 !text-danger"
                onClick={() => {
                  if (confirm(`Remove "${page.title || `page ${i + 1}`}"? It is gone once you save.`))
                    setPages((list) => list.filter((_, n) => n !== i));
                }}
              >
                Remove
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Small line above the heading</label>
              <input
                className="field"
                value={page.eyebrow}
                placeholder="e.g. A word from the team"
                onChange={(e) => update(i, { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Heading</label>
              <input
                className="field"
                value={page.title}
                onChange={(e) => update(i, { title: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="field-label">The text</label>
            <textarea
              className="field min-h-[220px]"
              value={page.text}
              placeholder="Write as much as you like. Leave a blank line between paragraphs."
              onChange={(e) => update(i, { text: e.target.value })}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Where it goes</label>
              <select
                className="field"
                value={page.placement}
                onChange={(e) => update(i, { placement: e.target.value as CustomPage['placement'] })}
              >
                {PAGE_PLACEMENTS.map((p) => (
                  <option key={p} value={p}>
                    {PAGE_PLACEMENT_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Photograph (optional)</label>
              {images.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">
                  No photographs on this proposal yet — add some on the Photos tab.
                </p>
              ) : (
                <div className="mt-1 grid max-h-40 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-6">
                  {images.map((img) => {
                    const chosen = page.imageId === img.id;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        title={img.alt}
                        onClick={() => update(i, { imageId: chosen ? null : img.id })}
                        className={`relative overflow-hidden rounded-md border-2 transition ${
                          chosen ? 'border-teal' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.alt} className="h-14 w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-3">
        <button className="btn-outline !bg-white !py-2.5" onClick={() => setPages((l) => [...l, newPage()])}>
          + Add a page
        </button>
        <button className="btn-primary !py-2.5" disabled={busy !== null} onClick={save}>
          {busy === 'pages' ? 'Saving…' : 'Save pages'}
        </button>
      </div>
    </div>
  );
}
