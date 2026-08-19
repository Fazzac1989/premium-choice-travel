'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  createStPortalTrip,
  deleteStPortalTrip,
  purgeStTripData,
  setStTripStatus,
  setStTripTeachers,
} from '@/lib/admin/st-planning-actions';

export type TeacherOption = { id: number; name: string; email: string; schoolName: string };

export type PlanningTrip = {
  id: number;
  title: string;
  schoolName: string;
  travelDates: string | null;
  departureDate: string | null;
  paperworkDue: string | null;
  status: 'planning' | 'ready' | 'travelling' | 'completed';
  dataPurgedAt: string | null;
  teacherIds: number[];
  studentCount: number;
  completeCount: number;
  outstanding: number;
  withDietary: number;
  withMedical: number;
  gaps: { label: string; count: number }[];
};

type AcceptedQuote = {
  id: number;
  ref: string;
  title: string;
  schoolName: string | null;
  travelDates: string | null;
  teacherEmail: string | null;
};

const STATUSES = ['planning', 'ready', 'travelling', 'completed'] as const;

const d = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

const EMPTY_FORM = {
  quoteId: '',
  title: '',
  schoolName: '',
  travelDates: '',
  departureDate: '',
  paperworkDue: '',
  teacherIds: [] as number[],
};

function TeacherChip({
  label,
  sub,
  on,
  disabled,
  onClick,
}: {
  label: string;
  sub?: string;
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
        on ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-teal'
      }`}
    >
      {label}
      {sub && <span className="ml-1.5 opacity-60">{sub}</span>}
    </button>
  );
}

export default function StPlanningManager({
  trips,
  teachers,
  acceptedQuotes,
}: {
  trips: PlanningTrip[];
  teachers: TeacherOption[];
  acceptedQuotes: AcceptedQuote[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function act(id: number, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(id);
    setError(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Something went wrong.');
    else router.refresh();
  }

  function fillFromQuote(quoteId: string) {
    const q = acceptedQuotes.find((x) => String(x.id) === quoteId);
    if (!q) return setForm((f) => ({ ...f, quoteId }));

    const match = teachers.find((t) => t.email.toLowerCase() === (q.teacherEmail ?? '').toLowerCase());
    setForm((f) => ({
      ...f,
      quoteId,
      title: q.title,
      schoolName: q.schoolName ?? '',
      travelDates: q.travelDates ?? '',
      teacherIds: match ? [match.id] : f.teacherIds,
    }));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy('new');
    setError(null);
    const res = await createStPortalTrip({
      quoteId: form.quoteId ? Number(form.quoteId) : null,
      title: form.title,
      schoolName: form.schoolName,
      travelDates: form.travelDates,
      departureDate: form.departureDate || null,
      paperworkDue: form.paperworkDue || null,
      teacherIds: form.teacherIds,
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setForm(EMPTY_FORM);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onCreate} className="card mt-8 grid gap-4 p-6">
        <p className="eyebrow">Open a planning workspace</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="field-label">From an accepted quote (optional)</span>
            <select className="field" value={form.quoteId} onChange={(e) => fillFromQuote(e.target.value)}>
              <option value="">— none —</option>
              {acceptedQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.ref} — {q.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Trip title</span>
            <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label>
            <span className="field-label">School</span>
            <input className="field" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required />
          </label>
          <label>
            <span className="field-label">Travel dates (as written)</span>
            <input className="field" value={form.travelDates} onChange={(e) => setForm({ ...form, travelDates: e.target.value })} placeholder="12–16 October 2026" />
          </label>
          <label>
            <span className="field-label">Departure date</span>
            <input type="date" className="field" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} />
          </label>
          <label>
            <span className="field-label">Paperwork due</span>
            <input type="date" className="field" value={form.paperworkDue} onChange={(e) => setForm({ ...form, paperworkDue: e.target.value })} />
          </label>
        </div>

        <div>
          <span className="field-label">Teachers who can open it</span>
          <div className="flex flex-wrap gap-2">
            {teachers.length === 0 && <span className="text-sm text-ink-soft">Invite a teacher first.</span>}
            {teachers.map((t) => {
              const on = form.teacherIds.includes(t.id);
              return (
                <TeacherChip
                  key={t.id}
                  label={t.name}
                  on={on}
                  onClick={() =>
                    setForm({
                      ...form,
                      teacherIds: on ? form.teacherIds.filter((x) => x !== t.id) : [...form.teacherIds, t.id],
                    })
                  }
                />
              );
            })}
          </div>
        </div>

        <button className="btn-primary !py-2.5 justify-self-start" disabled={busy !== null}>
          {busy === 'new' ? 'Creating…' : 'Open workspace'}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      {trips.length === 0 ? (
        <p className="card mt-8 p-10 text-center text-sm text-ink-soft">No workspaces yet.</p>
      ) : (
        <div className="mt-8 grid gap-4">
          {trips.map((t) => {
            const pct = t.studentCount ? Math.round((t.completeCount / t.studentCount) * 100) : 0;
            return (
              <div key={t.id} className="card">
                <div className="grid gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-serif text-xl text-ink">{t.title}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {t.schoolName}
                        {t.travelDates ? ` · ${t.travelDates}` : ''}
                        {t.paperworkDue ? ` · paperwork due ${d(t.paperworkDue)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-teal"
                        value={t.status}
                        disabled={busy !== null || Boolean(t.dataPurgedAt)}
                        onChange={(e) => act(t.id, () => setStTripStatus(t.id, e.target.value as any))}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        className="text-xs font-semibold text-teal-deep hover:underline"
                        onClick={() => setOpen(open === t.id ? null : t.id)}
                      >
                        {open === t.id ? 'Close' : 'Teachers'}
                      </button>
                    </div>
                  </div>

                  {t.dataPurgedAt ? (
                    <p className="rounded-lg bg-sand p-3 text-sm text-ink-soft">
                      Student records were removed on {d(t.dataPurgedAt)}. Nothing personal is stored
                      for this trip.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-ink/10">
                          <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-ink-soft">
                          <strong className="text-ink">
                            {t.completeCount}/{t.studentCount}
                          </strong>{' '}
                          complete
                        </span>
                        {t.withDietary > 0 && (
                          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs">{t.withDietary} dietary</span>
                        )}
                        {t.withMedical > 0 && (
                          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                            {t.withMedical} medical
                          </span>
                        )}
                      </div>

                      {t.gaps.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                          {t.gaps.map((g) => (
                            <span key={g.label}>
                              <strong className="text-ink">{g.count}</strong> missing{' '}
                              {g.label.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4">
                        <button
                          className="text-xs font-semibold text-ink-soft hover:text-teal-deep disabled:opacity-50"
                          disabled={busy !== null || t.studentCount === 0}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Permanently delete all ${t.studentCount} student records and documents for "${t.title}"?\n\nThis is how passport and medical data stops being held once the trip is over. It cannot be undone.`
                              )
                            ) {
                              act(t.id, () => purgeStTripData(t.id));
                            }
                          }}
                        >
                          Delete student data
                        </button>
                        <button
                          className="text-xs font-semibold text-ink-soft hover:text-danger disabled:opacity-50"
                          disabled={busy !== null}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete the whole workspace for "${t.title}", including all student data?`
                              )
                            ) {
                              act(t.id, () => deleteStPortalTrip(t.id));
                            }
                          }}
                        >
                          Delete workspace
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {open === t.id && (
                  <div className="border-t border-line bg-sand p-5">
                    <span className="field-label">Who can open this trip</span>
                    <div className="flex flex-wrap gap-2">
                      {teachers.map((tc) => {
                        const on = t.teacherIds.includes(tc.id);
                        return (
                          <TeacherChip
                            key={tc.id}
                            label={tc.name}
                            sub={tc.schoolName}
                            on={on}
                            disabled={busy !== null}
                            onClick={() =>
                              act(t.id, () =>
                                setStTripTeachers(
                                  t.id,
                                  on ? t.teacherIds.filter((x) => x !== tc.id) : [...t.teacherIds, tc.id]
                                )
                              )
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
