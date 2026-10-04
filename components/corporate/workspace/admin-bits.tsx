/** Small pieces shared by the staff console's corporate pages. */

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>;
  if (ok) return <p className="mt-4 rounded-lg bg-teal/10 px-4 py-3 text-sm text-teal-deep">{ok}</p>;
  return null;
}

/** Every staff form names the client and where to come back to. */
export function Scope({ company, back }: { company: string; back: string }) {
  return (
    <>
      <input type="hidden" name="company" value={company} />
      <input type="hidden" name="back" value={back} />
    </>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="font-serif text-xl text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Details({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="mt-4 rounded-lg border border-line bg-sand/50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-teal-deep">{summary}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
