import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { VoucherModel } from '@/lib/voucher-model';

/**
 * The hotel voucher — what the guest shows at reception.
 *
 * Its content is dictated by the supplier's certification: hotel name and
 * address, the holder and one name per room, children's ages, the supplier
 * booking reference, dates, room and board, rate comments, and the
 * "payable through" line naming the supplier and its VAT number. No price:
 * the guest has already paid us, and a figure here would only confuse the
 * front desk.
 */

const INK = '#16242E';
const INK_SOFT = '#425964';
const TEAL = '#19BAAB';
const TEAL_DEEP = '#12897E';
const LINE = '#DDE1E4';
const SAND = '#F6F4EF';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: INK, padding: 44, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 14, marginBottom: 20 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: INK },
  brandSub: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: TEAL_DEEP, marginBottom: 3 },
  docTitle: { fontSize: 9, letterSpacing: 2.4, textTransform: 'uppercase', color: INK_SOFT, textAlign: 'right' },
  ref: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: TEAL_DEEP, textAlign: 'right', marginTop: 3 },
  status: { fontSize: 8, color: INK_SOFT, textAlign: 'right', marginTop: 2 },
  hotelName: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  hotelMeta: { fontSize: 10, color: INK_SOFT, lineHeight: 1.5 },
  grid: { flexDirection: 'row', gap: 14, marginTop: 18 },
  cell: { flex: 1, backgroundColor: SAND, borderRadius: 4, padding: 12 },
  label: { fontSize: 7.5, letterSpacing: 1.6, textTransform: 'uppercase', color: TEAL_DEEP, marginBottom: 4 },
  value: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  valueSmall: { fontSize: 10 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: TEAL_DEEP, marginBottom: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 6 },
  rowLabel: { width: 150, color: INK_SOFT },
  rowValue: { flex: 1 },
  note: { fontSize: 9.5, lineHeight: 1.5, color: INK },
  payable: { marginTop: 22, borderWidth: 1, borderColor: INK, borderRadius: 4, padding: 12 },
  payableText: { fontSize: 9.5, lineHeight: 1.5 },
  footer: { position: 'absolute', left: 44, right: 44, bottom: 26, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
  footerText: { fontSize: 7.5, color: INK_SOFT },
});

export default function VoucherDoc({ v }: { v: VoucherModel }) {
  const guests = v.paxes.length ? v.paxes : [{ type: 'AD' as const, name: v.holder.name, surname: v.holder.surname }];
  return (
    <Document title={`Voucher ${v.reference} — ${v.hotel.name}`} author={v.agency.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brandSub}>Premium Choice</Text>
            <Text style={s.brand}>Staycations</Text>
          </View>
          <View>
            <Text style={s.docTitle}>Hotel voucher</Text>
            <Text style={s.ref}>{v.reference}</Text>
            <Text style={s.status}>{v.status === 'CONFIRMED' ? 'Confirmed' : v.status} · our ref {v.agencyReference}</Text>
          </View>
        </View>

        <Text style={s.hotelName}>{v.hotel.name}</Text>
        <Text style={s.hotelMeta}>
          {[v.hotel.category, v.hotel.address, [v.hotel.city, v.hotel.postalCode].filter(Boolean).join(' '), v.hotel.destination]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {v.hotel.phone ? <Text style={s.hotelMeta}>Tel {v.hotel.phone}</Text> : null}

        <View style={s.grid}>
          <View style={s.cell}>
            <Text style={s.label}>Check-in</Text>
            <Text style={s.value}>{v.checkIn}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.label}>Check-out</Text>
            <Text style={s.value}>{v.checkOut}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.label}>Nights</Text>
            <Text style={s.value}>{v.nights}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.label}>Rooms</Text>
            <Text style={s.value}>{v.rooms.length || 1}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Booking</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Lead guest</Text>
            <Text style={s.rowValue}>{`${v.holder.name} ${v.holder.surname}`.trim()}</Text>
          </View>
          {v.rooms.map((r, i) => (
            <View key={i} style={s.row}>
              <Text style={s.rowLabel}>Room {v.rooms.length > 1 ? i + 1 : ''}</Text>
              <Text style={s.rowValue}>{[r.name, r.board].filter(Boolean).join(' · ')}</Text>
            </View>
          ))}
          <View style={s.row}>
            <Text style={s.rowLabel}>Guests</Text>
            <View style={s.rowValue}>
              {guests.map((p, i) => (
                <Text key={i}>
                  {`${p.name} ${p.surname}`.trim() || (p.type === 'CH' ? 'Child' : 'Adult')}
                  {p.type === 'CH' ? ` — child${p.age != null ? `, age ${p.age}` : ''}` : ''}
                </Text>
              ))}
            </View>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Supplier reference</Text>
            <Text style={s.rowValue}>{v.reference}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Agency reference</Text>
            <Text style={s.rowValue}>{v.agencyReference}</Text>
          </View>
          {v.cancellation ? (
            <View style={s.row}>
              <Text style={s.rowLabel}>Cancellation</Text>
              <Text style={s.rowValue}>{v.cancellation}</Text>
            </View>
          ) : null}
        </View>

        {v.rateComments ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Please note</Text>
            <Text style={s.note}>{v.rateComments}</Text>
          </View>
        ) : null}

        {v.remark ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Requests passed to the hotel</Text>
            <Text style={s.note}>{v.remark}</Text>
          </View>
        ) : null}

        <View style={s.payable}>
          <Text style={s.payableText}>
            Payable through {v.supplier.name || 'the supplier named on the booking'}, acting as agent for the service
            operating company, details of which can be provided upon request.
            {v.supplier.vatNumber ? ` VAT: ${v.supplier.vatNumber}.` : ''} Reference: {v.reference}.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.note}>
            Please present this voucher at check-in. Questions before or during your stay: {v.agency.phone} ·{' '}
            {v.agency.email}
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{v.agency.name} · {v.agency.site}</Text>
          <Text style={s.footerText}>Issued {v.issuedOn}</Text>
        </View>
      </Page>
    </Document>
  );
}
