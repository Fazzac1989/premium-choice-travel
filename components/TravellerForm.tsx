'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveTraveller, type TravellerState } from '@/lib/traveller-actions';
import type { Traveller } from '@/lib/travellers';

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? 'Saving…' : label}
    </button>
  );
}

/**
 * Add or edit one traveller.
 *
 * Passport fields sit behind a disclosure and say plainly that they are
 * optional until a booking needs them — asking for a passport number to save a
 * child's name is both unnecessary and off-putting.
 */
export default function TravellerForm({
  traveller,
  onDone,
}: {
  traveller?: Traveller;
  onDone?: () => void;
}) {
  const [state, formAction] = useFormState<TravellerState, FormData>(saveTraveller, null);
  const [showPassport, setShowPassport] = useState(Boolean(traveller?.passportNumber || traveller?.passportExpiry));

  if (state?.ok && onDone) onDone();

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-white p-6">
      {traveller && <input type="hidden" name="id" value={traveller.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Full name, exactly as in the passport *</label>
          <input
            name="full_name"
            required
            defaultValue={traveller?.fullName}
            className="field"
            placeholder="e.g. SARAH JANE WHITFIELD"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Including middle names. A booking in the wrong spelling usually has to be reissued.
          </p>
        </div>
        <div>
          <label className="field-label">Who is this?</label>
          <input name="label" defaultValue={traveller?.label} className="field" placeholder="Me · Partner · Youngest" />
        </div>
        <div>
          <label className="field-label">Date of birth</label>
          <input type="date" name="date_of_birth" defaultValue={traveller?.dateOfBirth} className="field" />
        </div>
        <div>
          <label className="field-label">Nationality</label>
          <input name="nationality" defaultValue={traveller?.nationality} className="field" placeholder="e.g. British" />
        </div>
        <div>
          <label className="field-label">Anything we should know</label>
          <input
            name="notes"
            defaultValue={traveller?.notes}
            className="field"
            placeholder="Dietary, mobility, frequent flyer…"
          />
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-sand p-4">
        {!showPassport ? (
          <button
            type="button"
            onClick={() => setShowPassport(true)}
            className="text-sm font-semibold text-teal-deep hover:underline"
          >
            + Add passport details
          </button>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Passport</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="field-label">Number</label>
                <input
                  name="passport_number"
                  defaultValue={traveller?.passportNumber}
                  className="field"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="field-label">Expires</label>
                <input type="date" name="passport_expiry" defaultValue={traveller?.passportExpiry} className="field" />
              </div>
              <div>
                <label className="field-label">Issued by</label>
                <input
                  name="passport_country"
                  defaultValue={traveller?.passportCountry}
                  className="field"
                  placeholder="e.g. United Kingdom"
                />
              </div>
            </div>
          </>
        )}
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          Optional. You only need these when a booking is being made, and we would rather hold
          them for the shortest time we can. Ask us any time and we will delete them.
        </p>
      </div>

      {state && !state.ok && <p className="mt-3 text-sm text-red-600">{state.message}</p>}
      {state?.ok && <p className="mt-3 text-sm text-teal-deep">{state.message}</p>}

      <div className="mt-5">
        <SaveButton label={traveller ? 'Save changes' : 'Add traveller'} />
      </div>
    </form>
  );
}
