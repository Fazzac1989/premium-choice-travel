import 'server-only';

/** Vouchers for requests booked before the platform; platform stays use the platform's voucher. */
export { renderVoucherPdf as renderVoucher, voucherFilename } from '@/lib/trips/legacy-voucher';
export { voucherModel } from '@/lib/voucher-model';
