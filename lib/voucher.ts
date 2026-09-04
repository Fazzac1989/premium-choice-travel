import 'server-only';

/** The app's entry point for vouchers — the implementation is shared with the test script. */
export { renderVoucherPdf as renderVoucher, voucherFilename } from '@/lib/rates/supplier-booking';
export { voucherModel } from '@/lib/voucher-model';
