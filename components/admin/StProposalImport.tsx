'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { importStProposal, type ImportResult } from '@/lib/admin/st-proposal-import';

/**
 * Import a proposal document.
 *
 * The form posts to the action rather than calling it from an onSubmit
 * handler with a hand-built FormData. That is how the trip importer next door
 * works, and the hand-built version did not carry the uploaded file through —
 * a Word document simply never arrived, and the importer reported that nothing
 * had been given to it.
 *
 * The result is always a draft, and the warnings are shown before the editor
 * opens rather than after: what the document did not say is the part that
 * matters, and it is easy to miss once you are looking at a filled-in form.
 */
export default function StProposalImport() {
  const router = useRouter();
  const [state, formAction] = useFormState<ImportResult | null, FormData>(importStProposal, null);

  // Keep the proposals list in step once one has been created.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (state?.ok) {
    return (
      <div className="card p-6">
        <h2 className="font-serif text-xl text-ink">Imported as a draft</h2>

        {state.warnings.length > 0 ? (
          <>
            <p className="mt-3 text-sm text-ink-soft">
              These are the things the document did not say. Nothing has been guessed — fill them
              in before the proposal goes anywhere.
            </p>
            <ul className="mt-3 space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-ink">
              {state.warnings.map((w, i) => (
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
            onClick={() => router.push(`/admin/school-trips/proposals/${state.id}`)}
          >
            Open it in the studio
          </button>
          <button
            className="btn-outline !bg-white !py-2.5"
            onClick={() => router.push('/admin/school-trips/proposals/import')}
          >
            Import another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="card p-6">
      <div className="grid gap-5">
        <div>
          <label className="field-label">Upload a document</label>
          <input
            type="file"
            name="file"
            // Deliberately wide. A picker that greys out the file someone is
            // holding looks broken; the server explains what it cannot read.
            accept=".docx,.doc,.pdf,.txt,.md,.rtf,.pages"
            className="field !py-2"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Word (.docx), PDF, .txt, .md or .rtf. An old .doc needs saving as .docx first, and a
            scanned PDF has no text to read.
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

      {state && !state.ok && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>
      )}

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <>
      <button className="btn-primary mt-5 !py-2.5" disabled={pending}>
        {pending ? 'Reading the document…' : 'Import as a draft'}
      </button>
      <p className="mt-3 text-xs text-ink-soft">This can take up to a minute for a long document.</p>
    </>
  );
}
