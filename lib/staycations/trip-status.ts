import type { IconName } from '@/components/staycations/coastal/Icon';

/**
 * What a request looks like to the customer.
 *
 * The platform already has a working state model on `booking_requests`
 * (new → quoted → confirmed → closed, plus what the supplier said), so this
 * describes those states rather than inventing a parallel set. A stay counts
 * as confirmed only when a supplier reference exists: a specialist marking
 * something confirmed by hand is still "confirming" until the hotel agrees.
 */
export type TripTone = 'ok' | 'wait' | 'quiet' | 'err';

export type TripStatus = {
  key: string;
  label: string;
  tone: TripTone;
  icon: IconName;
  /** One line telling the customer what is happening, and who is doing it. */
  detail: string;
};

export function tripStatus(row: {
  status?: string | null;
  supplier_reference?: string | null;
  supplier_cancelled_at?: string | null;
}): TripStatus {
  if (row.supplier_cancelled_at) {
    return {
      key: 'cancelled',
      label: 'Cancelled',
      tone: 'quiet',
      icon: 'info',
      detail: 'This booking was cancelled with the hotel.',
    };
  }
  if (row.supplier_reference) {
    return {
      key: 'confirmed',
      label: 'Confirmed',
      tone: 'ok',
      icon: 'check',
      detail: 'The hotel has confirmed your stay. Your voucher was emailed to you.',
    };
  }
  switch (row.status) {
    case 'confirmed':
      return {
        key: 'confirmation_pending',
        label: 'Confirming',
        tone: 'wait',
        icon: 'clock',
        detail: 'Agreed with you and going to the hotel now. It is not booked until they confirm.',
      };
    case 'quoted':
      return {
        key: 'quote_ready',
        label: 'Quote ready',
        tone: 'wait',
        icon: 'clock',
        detail: 'A specialist has priced this and is waiting for your decision.',
      };
    case 'closed':
      return {
        key: 'closed',
        label: 'Closed',
        tone: 'quiet',
        icon: 'info',
        detail: 'Nothing further is happening with this request.',
      };
    default:
      return {
        key: 'checking_availability',
        label: 'With a specialist',
        tone: 'wait',
        icon: 'clock',
        detail: 'We are checking the rooms and the price for your dates.',
      };
  }
}

/** The class for a status badge, matching the palette's status colours. */
export function badgeClass(tone: TripTone): string {
  return tone === 'ok' ? 'cc-badge-ok' : tone === 'wait' ? 'cc-badge-wait' : tone === 'err' ? 'cc-badge-err' : 'cc-badge-quiet';
}
