import type { SupplierBooking, SupplierPax } from '@/lib/rates/hotelbeds';

/** Everything the voucher prints, already resolved. Shared by the PDF and its tests. */
export type VoucherModel = {
  reference: string;
  agencyReference: string;
  status: string;
  issuedOn: string;
  holder: { name: string; surname: string };
  paxes: SupplierPax[];
  hotel: { name: string; category: string; address: string; city: string; postalCode: string; destination: string; phone: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: { name: string; board: string }[];
  rateComments: string;
  remark: string;
  cancellation: string;
  supplier: { name: string; vatNumber: string };
  agency: { name: string; phone: string; email: string; site: string };
};

export const AGENCY = {
  name: 'Premium Choice Staycations',
  phone: '+971 4 420 6965',
  email: 'info@premiumchoicetravel.com',
  site: 'premiumchoicestaycations.com',
};

function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(`${checkIn}T00:00:00Z`).getTime();
  const b = new Date(`${checkOut}T00:00:00Z`).getTime();
  const n = Math.round((b - a) / 86_400_000);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function cancellationLine(b: SupplierBooking, refundable: boolean | null, cancelBy: string | null) {
  const rate = b.hotel.rooms[0]?.rates[0];
  if (rate?.rateClass === 'NRF' || refundable === false) return 'Non-refundable';
  const first = rate?.cancellationPolicies?.map((p) => p.from).filter(Boolean).sort()[0] ?? cancelBy;
  return first ? `Free cancellation until ${first.slice(0, 16).replace('T', ' ')} (hotel local time)` : '';
}

/**
 * Build the voucher from a booking_requests row that carries a confirmed
 * supplier booking. Returns null when there is nothing to print.
 */
export function voucherModel(row: any): VoucherModel | null {
  const b = row?.supplier_booking as SupplierBooking | null;
  if (!row?.supplier_reference || !b) return null;
  const hotel = (row.supplier_hotel ?? {}) as Partial<{ name: string; category: string; address: string; city: string; postalCode: string; destination: string; phone: string }>;
  const paxes: SupplierPax[] = Array.isArray(row.paxes) && row.paxes.length ? row.paxes : b.hotel.rooms.flatMap((r) => r.paxes);
  const comments = Array.from(
    new Set([row.rate_comments, ...b.hotel.rooms.flatMap((r) => r.rates.map((x) => x.rateComments))].map((c) => String(c ?? '').trim()).filter(Boolean)),
  ).join('\n');
  return {
    reference: row.supplier_reference,
    agencyReference: `PCS-${row.id}`,
    status: row.supplier_status || b.status,
    issuedOn: new Date().toISOString().slice(0, 10),
    holder: { name: row.holder_name || b.holder.name, surname: row.holder_surname || b.holder.surname },
    paxes,
    hotel: {
      name: hotel.name || b.hotel.name || row.hotel_name,
      category: hotel.category || b.hotel.categoryName || '',
      address: hotel.address || '',
      city: hotel.city || '',
      postalCode: hotel.postalCode || '',
      destination: hotel.destination || b.hotel.destinationName || row.emirate || '',
      phone: hotel.phone || '',
    },
    checkIn: b.hotel.checkIn || row.check_in,
    checkOut: b.hotel.checkOut || '',
    nights: b.hotel.checkIn && b.hotel.checkOut ? nightsBetween(b.hotel.checkIn, b.hotel.checkOut) : Number(row.nights) || 1,
    rooms: b.hotel.rooms.length
      ? b.hotel.rooms.map((r) => ({ name: r.name, board: r.rates[0]?.boardName ?? row.board ?? '' }))
      : [{ name: row.room_name ?? '', board: row.board ?? '' }],
    rateComments: comments,
    remark: String(row.supplier_remark ?? b.remark ?? '').trim(),
    cancellation: cancellationLine(b, row.refundable ?? null, row.cancel_by ?? null),
    supplier: { name: b.hotel.supplier?.name ?? '', vatNumber: b.hotel.supplier?.vatNumber ?? '' },
    agency: AGENCY,
  };
}
