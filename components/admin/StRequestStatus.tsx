'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setStAppointmentStatus } from '@/lib/admin/st-misc-actions';

type Status = 'new' | 'contacted' | 'closed';

const STYLE: Record<Status, string> = {
  new: 'bg-teal/15 text-teal-deep',
  contacted: 'bg-ink/10 text-ink-soft',
  closed: 'bg-ink/5 text-ink-soft',
};

/** Mark an appointment request as handled, without leaving the list. */
export default function StRequestStatus({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState<Status>(
    (['new', 'contacted', 'closed'] as const).includes(status as Status) ? (status as Status) : 'new'
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: Status) {
    const previous = value;
    setValue(next); // optimistic: the select should not lag behind the click
    setBusy(true);
    setError(null);
    const res = await setStAppointmentStatus(id, next);
    setBusy(false);
    if (!res.ok) {
      setValue(previous);
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as Status)}
        className={`rounded-lg border border-line px-2 py-1 text-xs font-semibold outline-none focus:border-teal disabled:opacity-60 ${STYLE[value]}`}
        aria-label="Appointment status"
      >
        <option value="new">new</option>
        <option value="contacted">contacted</option>
        <option value="closed">closed</option>
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
