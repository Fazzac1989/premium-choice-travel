'use client';

import { useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { importPackage, type ImportState } from '@/lib/admin/import-actions';

function SubmitButton({ hasSource }: { hasSource: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || !hasSource} className="btn-primary w-full !py-4 disabled:opacity-50">
      {pending ? 'Claude is reading the document…' : 'Import with AI'}
    </button>
  );
}

export default function ImportForm() {
  const [state, formAction] = useFormState<ImportState, FormData>(importPackage, null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);

  return (
    <form action={formAction} className="card p-8">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && fileRef.current) {
            const dt = new DataTransfer();
            dt.items.add(f);
            fileRef.current.files = dt.files;
            setFileName(f.name);
          }
        }}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragOver ? 'border-teal bg-teal/5' : 'border-line hover:border-teal/60'
        }`}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" strokeLinecap="round" />
        </svg>
        <p className="mt-3 font-semibold text-ink">{fileName || 'Drop a Word document here, or click to choose'}</p>
        <p className="mt-1 text-xs text-ink-soft">.docx, .txt or .md · up to 8MB</p>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".docx,.txt,.md,.rtf"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
        />
      </div>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        or paste the text
        <span className="h-px flex-1 bg-line" />
      </div>

      <textarea
        name="text"
        rows={6}
        className="field"
        placeholder="Paste the package description here instead…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {state && !state.ok && <p className="mt-4 text-sm text-danger">{state.error}</p>}

      <div className="mt-6">
        <SubmitButton hasSource={Boolean(fileName || text.trim())} />
      </div>
      <p className="mt-3 text-center text-xs text-ink-soft">
        Claude reads the document, sorts it into the right brand section and opens a draft for
        your review — nothing is published until you say so.
      </p>
    </form>
  );
}
