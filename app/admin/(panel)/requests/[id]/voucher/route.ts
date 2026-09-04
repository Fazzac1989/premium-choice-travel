import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';
import { renderVoucher, voucherFilename } from '@/lib/voucher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The voucher PDF for a confirmed request — staff only. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'Not authorised' }, { status: 403 });
  }
  const db = createAdminClient();
  const { data: row } = await db.from('booking_requests').select('*').eq('id', Number(params.id)).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  try {
    const pdf = await renderVoucher(row);
    if (!pdf) return NextResponse.json({ ok: false, error: 'Nothing confirmed for this request yet' }, { status: 409 });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${voucherFilename(row)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('[voucher pdf]', e?.message);
    return NextResponse.json({ ok: false, error: 'PDF generation failed' }, { status: 500 });
  }
}
