'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { importStProposal, type ImportResult } from '@/lib/admin/st-proposal-import';

/**
 * Import a proposal document.
 *
 * A Word file is read here, in the browser, and only its text is sent. That is
 * not an optimisation: a real proposal came to 9MB of embedded images around
 * ten thousand characters of text, and a serverless request body is capped at
 * about 4.5MB. The upload was rejected by the platform before any of our code
 * ran, so there was nothing to report and the form simply did nothing.
 *
 * Sending the text instead makes that request about ten kilobytes, and the
 * server path is unchanged — it already accepted pasted text.
 */

/** What we can read here rather than sending. */
const READS_LOCALLY = /\.(docx|txt|md|rtf)$/i;

export default function StProposalImport() {
  const router = useRouter();
  const [state, formAction] = useFormState<ImportResult | null, FormData>(importStProposal, null);
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [readFile, setReadFile] = useState<{ name: string; chars: number } | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setReadError(null);
    setReadFile(null);
    if (!file) return;

    if (!READS_LOCALLY.test(file.name)) {
      // A PDF still goes to the server, which can read it — but only if the
      // platform will carry it.
      if (file.size > 4 * 1024 * 1024) {
        setReadError(
          `${file.name} is ${(file.size / 1048576).toFixed(1)}MB. Files over about 4MB cannot be uploaded — open it in Word and save as .docx, which is read here in the browser at any size, or paste the text below.`,
        );
      }
      return;
    }

    setReading(true);
    try {
      let value = '';
      if (/\.docx$/i.test(file.name)) {
        // The browser build; the Node one cannot run here.
        const mammoth = await import('mammoth/mammoth.browser');
        const result = await (mammoth as any).extractRawText({ arrayBuffer: await file.arrayBuffer() });
        value = result.value ?? '';
      } else {
        value = await file.text();
      }
      value = value.trim();
      if (!value) {
        setReadError(
          `${file.name} had no readable text in it — if the content is a picture or a scan, paste the text instead.`,
        );
      } else {
        setText(value);
        setReadFile({ name: file.name, chars: value.length });
      }
    } catch (err: any) {
      setReadError(`Could not read ${file.name}: ${err?.message ?? 'unknown error'}`);
    } finally {
      setReading(false);
    }
  }

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
            // Once the text has been read here there is nothing to upload, so
            // the input drops its name and the file never leaves the browser.
            name={readFile ? undefined : 'file'}
            accept=".docx,.doc,.pdf,.txt,.md,.rtf,.pages"
            onChange={onPick}
            className="field !py-2"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Word (.docx), .txt, .md and .rtf are read here in the browser, at any size. A PDF is
            read on the server and has to be under about 4MB. An old .doc needs saving as .docx.
          </p>

          {reading && <p className="mt-2 text-sm text-ink-soft">Reading the document…</p>}
          {readFile && (
            <p className="mt-2 rounded-xl bg-teal/10 px-4 py-3 text-sm text-teal-deep">
              Read {readFile.chars.toLocaleString()} characters from <b>{readFile.name}</b>. It is
              in the box below — check it looks right, then import.
            </p>
          )}
          {readError && (
            <p className="mt-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{readError}</p>
          )}
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
          <label className="field-label">The text to import</label>
          <textarea
            name="text"
            className="field min-h-[200px]"
            placeholder="Paste the proposal, or upload a document above…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
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
