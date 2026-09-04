import 'server-only';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import VoucherDoc from '@/lib/pdf/voucher-doc';
import { voucherModel } from '@/lib/voucher-model';

export { voucherModel } from '@/lib/voucher-model';

export function voucherFilename(row: any) {
  const hotel = String(row?.hotel_name ?? 'hotel').replace(/[^\w\s-]/g, '').trim();
  return `Voucher ${row?.supplier_reference ?? ''} - ${hotel}.pdf`;
}

/** The voucher PDF for a confirmed booking request, or null when nothing is confirmed. */
export async function renderVoucher(row: any): Promise<Buffer | null> {
  const v = voucherModel(row);
  if (!v) return null;
  return renderToBuffer(createElement(VoucherDoc, { v }) as any);
}
