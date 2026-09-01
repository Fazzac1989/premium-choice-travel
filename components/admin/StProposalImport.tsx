'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { importStProposal } from '@/lib/admin/st-proposal-import';

/**
 * Import a proposal document.
 *
 * The result is always a draft, and the warnings are shown before the editor
 * opens rather than after — what the document did not say is the part that
 * matters, and it is easy to miss once you are looking at a filled-in form.
 */
export default function StProposalImport() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: number; warnings: string[] } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await importStProposal(new FormData(e.currentTarget));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setResult({ id: res.id, warnings: res.warnings });
  }

  if (result) {
    return (
      <div className="card p-6">
        <h2 className="font-serif text-xl text-ink">Imported as a draft</h2>

        {result.warnings.length > 0 ? (
          <>
            <p className="mt-3 text-sm text-ink-soft">
              These are the things the document did not say. Nothing has been guessed — fill them
              in before the proposal goes anywhere.
            </p>
            <ul className="mt-3 space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-ink">
              {result.warnings.map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">
            Everything expected was found. Read it through before sending it anyway.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="btn-primary !py-2.5"
            onClick={() => router.push(`/admin/school-trips/proposals/${result.id}`)}
          >
            Open it in the studio
          </button>
          <button className="btn-outline !bg-white !py-2.5" onClick={() => setResult(null)}>
            Import another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <div className="grid gap-5">
        <div>
          <label className="field-label">Upload a document</label>
          <input
            type="file"
            name="file"
            accept=".docx,.txt,.md,.rtf,.html,.htm"
            className="field !py-2"
          />
          <p className="mt-1 text-xs text-ink-soft">
            .docx, .txt, .md or .rtf. Old .doc files need saving as .docx first.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-ink-soft">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <div>
          <label className="field-label">Paste a link</label>
          <input type="url" name="url" className="field" placeholder="https://…" />
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-ink-soft">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <div>
          <label className="field-label">Paste the text</label>
          <textarea name="text" className="field min-h-[200px]" placeholder="Paste the proposal…" />
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <button className="btn-primary mt-5 !py-2.5" disabled={busy}>
        {busy ? 'Reading the document…' : 'Import as a draft'}
      </button>
      <p className="mt-3 text-xs text-ink-soft">
        This can take up to a minute for a long document.
      </p>
    </form>
  );
}
