import { NextResponse } from 'next/server';
import { ownedBooking } from '@/lib/trips/portal';
import { renderVoucher, voucherFilename } from '@/lib/voucher';
import { platformPdf } from '@/lib/platform/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A customer's own voucher.
 *
 * The same PDF the specialist sends, fetched by the person it belongs to.
 * `ownedBooking` is the whole of the security here: it refuses any id that is
 * not on the signed-in account, so changing the number in the address bar
 * returns nothing rather than somebody else's stay.
 *
 * It opens inline so a phone shows it and a laptop can print it.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const booking = await ownedBooking(Number(params.id));
  if (!booking) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // a stay booked through the platform: its voucher is the platform's, in the brand's name
  if (booking.platform_booking_id) {
    try {
      const pdf = await platformPdf(`/v1/bookings/${booking.platform_booking_id}/voucher`);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${booking.supplier_reference ?? 'voucher'}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (e: any) {
      console.error('[trip voucher]', e?.message);
      return NextResponse.json({ ok: false, error: 'Your voucher is not ready yet. Please try again in a minute.' }, { status: 503 });
    }
  }

  try {
    const pdf = await renderVoucher(booking);
    if (!pdf) {
      return NextResponse.json(
        { ok: false, error: 'This stay is not confirmed with the hotel yet, so there is no voucher.' },
        { status: 409 },
      );
    }
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${voucherFilename(booking)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('[trip voucher]', e?.message);
    return NextResponse.json({ ok: false, error: 'We could not build that voucher. Please call us.' }, { status: 500 });
  }
}
