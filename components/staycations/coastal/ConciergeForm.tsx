'use client';

import { useEffect, useMemo, useState } from 'react';
import EnquiryForm from '@/components/EnquiryForm';
import { readLocalEnquiries } from '@/lib/pwa/local-enquiries';

/**
 * A message to a specialist, attached to a stay.
 *
 * Choosing the trip first is what makes the reply useful — the specialist
 * opens the request rather than asking which hotel you mean. It reuses the
 * enquiry form the rest of the group runs on, so the message lands in the
 * same inbox with the same spam protection.
 */
export default function ConciergeForm({
  accountTrips,
  preselect,
}: {
  accountTrips: { reference: string; label: string }[];
  preselect?: string;
}) {
  const [local, setLocal] = useState<{ reference: string; label: string }[]>([]);
  const [choice, setChoice] = useState(preselect ?? '');

  useEffect(() => {
    setLocal(
      readLocalEnquiries().map((e) => ({
        reference: `${e.hotelName} · ${e.checkIn}`,
        label: `${e.hotelName} — ${e.checkIn}`,
      })),
    );
  }, []);

  const options = useMemo(() => {
    const seen = new Set<string>();
    return [...accountTrips, ...local].filter((o) => {
      if (seen.has(o.reference)) return false;
      seen.add(o.reference);
      return true;
    });
  }, [accountTrips, local]);

  const subject = choice ? `Concierge · ${choice}` : 'Concierge · general question';

  return (
    <div>
      {options.length > 0 && (
        <label className="mb-4 block">
          <span className="cc-label">Which stay is this about?</span>
          <select value={choice} onChange={(e) => setChoice(e.target.value)} className="cc-field mt-1">
            <option value="">A general question</option>
            {options.map((o) => (
              <option key={o.reference} value={o.reference}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Re-mounting on change keeps the hidden subject and the form in step. */}
      <EnquiryForm key={subject} brand="staycations" packageTitle={subject} compact />
    </div>
  );
}
