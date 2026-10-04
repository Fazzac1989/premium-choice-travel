import { NextResponse } from 'next/server';
import { tripLifecycle } from '@/lib/corporate/workspace/budget';
import { demoSnapshot } from '@/lib/corporate/workspace/demo';
import { currentApproval, tripStage, STAGE_LABELS } from '@/lib/corporate/workspace/rules';

export const dynamic = 'force-dynamic';

/**
 * Finance export: one row per trip, coded the way the client reports, with the
 * lifecycle amounts in separate columns so the sheet sums without double
 * counting. Only the fictional demo company: the real export is in the platform workspace.
 */
export async function GET(request: Request, { params }: { params: { brand: string } }) {
  if (params.brand !== 'corporate') return new NextResponse('Not found', { status: 404 });
  const url = new URL(request.url);
  const now = new Date();

  if (url.searchParams.get('demo') !== '1') return new NextResponse('Not found', { status: 404 });
  const s = demoSnapshot(now);

  const amount = (minor: number) => (minor / 100).toFixed(2);
  const cell = (v: string | number | null | undefined) => {
    const t = v === null || v === undefined ? '' : String(v);
    // Quote everything; neutralise spreadsheet formulas.
    return `"${(/^[=+\-@]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`;
  };
  const head = [
    'Trip', 'Traveller', 'Entity', 'Cost centre', 'Cost centre name', 'Client', 'Billable', 'Purpose', 'From', 'To',
    'Depart', 'Return', 'Stage', 'Approved by', 'Approved amount', 'Invoiced net', 'Booked not invoiced',
    'Approved not booked', 'Awaiting approval', 'Currency',
  ];
  const rows = s.trips.map((t) => {
    const l = tripLifecycle(s, t, now);
    const cc = s.costCentres.find((c) => c.id === t.costCentreId);
    const a = currentApproval(s, t.id);
    return [
      t.ref, s.members.find((m) => m.id === t.travellerMemberId)?.fullName, s.entities.find((e) => e.id === t.entityId)?.name,
      cc?.code, cc?.name, cc?.clientName, cc ? (cc.billable ? 'Yes' : 'No') : '', t.purpose, t.origin, t.destination,
      t.departOn, t.returnOn, STAGE_LABELS[tripStage(s, t, now)], a ? s.members.find((m) => m.id === a.approverMemberId)?.fullName : '',
      a ? amount(a.amountMinor) : '', amount(l.incurred), amount(l.committed), amount(l.reserved), amount(l.proposed),
      s.company.billingCurrency,
    ];
  });
  const csv = [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const name = `${s.company.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-travel-${now.toISOString().slice(0, 10)}.csv`;
  return new NextResponse('﻿' + csv, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name}"` },
  });
}
