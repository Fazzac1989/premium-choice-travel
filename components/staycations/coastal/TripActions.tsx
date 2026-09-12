'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import Icon from './Icon';
import { sendTripRequest } from '@/lib/trips/actions';
import type { ChangeRequest, TripPayment } from '@/lib/trips/portal';

/**
 * What a customer can do about one stay.
 *
 * Three of the four buttons open the same form with different words, because
 * they are the same thing underneath: a message to a specialist. The voucher
 * and the payment link are the only two that act on their own, and both are
 * just a link to something that already exists.
 *
 * The cancellation form deliberately shows what cancelling costs *before* the
 * text box, not after it.
 */

type Kind = 'amend' | 'cancel' | 'question';

const FORM: Record<Kind, { title: string; hint: string; placeholder: string; cta: string }> = {
  amend: {
    title: 'Change this stay',
    hint: 'Different dates, another room, an extra night, more guests — tell us what you need and a specialist will price it and come back to you.',
    placeholder: 'We would like to arrive a day later…',
    cta: 'Send change request',
  },
  cancel: {
    title: 'Cancel this stay',
    hint: 'This sends a cancellation request to your specialist. Nothing is cancelled until they confirm what it costs with you.',
    placeholder: 'Our plans have changed because…',
    cta: 'Send cancellation request',
  },
  question: {
    title: 'Ask about this stay',
    hint: 'Anything at all — check-in times, a cot, connecting rooms, a quiet floor. A specialist in Dubai answers personally.',
    placeholder: 'Could you ask the hotel about…',
    cta: 'Send message',
  },
};

export default function TripActions({
  bookingId,
  confirmed,
  cancelled,
  cancellationText,
  payment,
  history,
}: {
  bookingId: number;
  confirmed: boolean;
  cancelled: boolean;
  cancellationText: string;
  payment: TripPayment;
  history: ChangeRequest[];
}) {
  const [open, setOpen] = useState<Kind | null>(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const openForm = (kind: Kind) => {
    setOpen(open === kind ? null : kind);
    setResult(null);
  };

  const submit = () => {
    if (!open) return;
    const data = new FormData();
    data.set('booking_id', String(bookingId));
    data.set('kind', open);
    data.set('message', message);
    start(async () => {
      const res = await sendTripRequest(data);
      setResult({ ok: res.ok, text: res.message });
      if (res.ok) {
        setMessage('');
        setOpen(null);
      }
    });
  };

  const tab = (kind: Kind, label: string, icon: 'calendar' | 'chat' | 'close') => (
    <button
      type="button"
      onClick={() => openForm(kind)}
      aria-expanded={open === kind}
      className={`cc-btn-quiet !min-h-[44px] !px-4 text-[15px] ${open === kind ? '!border-petrol !bg-mist' : ''}`}
    >
      <Icon name={icon} size={17} />
      {label}
    </button>
  );

  return (
    <div className="mt-4 border-t border-sea-line pt-4">
      {/* Money first: it is the thing a customer most often opens this for. */}
      <div className="flex flex-wrap items-center gap-2">
        {payment.paid ? (
          <span className="cc-badge-ok">
            <Icon name="check" size={14} />
            Paid
          </span>
        ) : payment.payUrl ? (
          <a href={payment.payUrl} target="_blank" rel="noopener noreferrer" className="cc-btn-primary !min-h-[44px] !px-5 text-[15px]">
            Pay {payment.currency} {payment.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </a>
        ) : null}

        {confirmed && !cancelled && (
          <a
            href={`/api/trips/${bookingId}/voucher`}
            target="_blank"
            rel="noopener noreferrer"
            className="cc-btn-quiet !min-h-[44px] !px-4 text-[15px]"
          >
            <Icon name="document" size={17} />
            Voucher
          </a>
        )}

        {!cancelled && tab('amend', 'Change', 'calendar')}
        {!cancelled && tab('question', 'Ask', 'chat')}
        <a href="tel:+97144206965" className="cc-btn-quiet !min-h-[44px] !px-4 text-[15px]">
          <Icon name="phone" size={17} />
          Call
        </a>
        {!cancelled && (
          <button
            type="button"
            onClick={() => openForm('cancel')}
            aria-expanded={open === 'cancel'}
            className={`min-h-[44px] rounded-[10px] px-3 text-[15px] font-medium text-sea-soft underline decoration-sea-line underline-offset-4 hover:text-err-ink ${
              open === 'cancel' ? 'text-err-ink' : ''
            }`}
          >
            Cancel this stay
          </button>
        )}
      </div>

      {payment.note && !payment.payUrl && <p className="cc-support mt-2">{payment.note}</p>}
      {payment.payUrl && payment.expiresAt && (
        <p className="cc-support mt-2">
          The link is valid until {new Date(payment.expiresAt).toUTCString().replace('GMT', 'UTC')}. Your card details
          go to our payment provider, never to us.
        </p>
      )}

      {open && (
        <div className="mt-4 rounded-[10px] border border-sea-line bg-shell p-4">
          <h4 className="cc-h4 text-[19px] leading-[25px]">{FORM[open].title}</h4>
          {open === 'cancel' && (
            <p className="mt-2 rounded-[8px] bg-wait-bg px-3 py-2 text-[14px] leading-[20px] text-wait-ink">
              {cancellationText}
            </p>
          )}
          <p className="cc-support mt-2">{FORM[open].hint}</p>
          <label className="mt-3 block">
            <span className="cc-label">Your message</span>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={FORM[open].placeholder}
              className="cc-field mt-1 py-3"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={submit} disabled={pending} className="cc-btn-primary !min-h-[44px] !px-5 text-[15px]">
              {pending ? 'Sending…' : FORM[open].cta}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                setMessage('');
              }}
              className="cc-btn-quiet !min-h-[44px] !px-4 text-[15px]"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {result && (
        <p
          role="status"
          className={`mt-3 rounded-[8px] px-3 py-2 text-[14px] leading-[20px] ${
            result.ok ? 'bg-ok-bg text-ok-ink' : 'bg-err-bg text-err-ink'
          }`}
        >
          {result.text}
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-4 border-t border-sea-line pt-3">
          <h4 className="cc-label">What you have asked us</h4>
          <ul className="mt-2 space-y-2">
            {history.map((h) => (
              <li key={h.id} className="text-[14px] leading-[20px]">
                <span className="font-medium text-sea-ink">
                  {h.kind === 'cancel' ? 'Cancellation' : h.kind === 'amend' ? 'Change' : 'Question'}
                </span>{' '}
                <span className="text-sea-soft">
                  · {String(h.createdAt).slice(0, 10)} ·{' '}
                  {h.status === 'new' ? 'with a specialist' : h.status === 'done' ? 'dealt with' : h.status}
                </span>
                <p className="text-sea-soft">{h.message}</p>
                {h.staffNote && <p className="mt-0.5 text-petrol">Our reply: {h.staffNote}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!confirmed && !cancelled && (
        <p className="cc-support mt-3">
          A voucher appears here as soon as your specialist confirms this stay with the hotel.
        </p>
      )}

      <p className="cc-support mt-3">
        <Link href="/account/travellers" className="font-semibold text-petrol">
          Saved travellers
        </Link>{' '}
        · we use the passport spellings you keep there.
      </p>
    </div>
  );
}
