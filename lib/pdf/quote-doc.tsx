import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  formatMoney,
  lineTotal,
  perPerson,
  quoteTotal,
  travellerCount,
  type Quote,
} from '@/lib/quote-math';
import type { Payment } from '@/lib/payments-shared';

const INK = '#16242E';
const INK_SOFT = '#425964';
const TEAL = '#19BAAB';
const TEAL_DEEP = '#12897E';
const LINE = '#DDE1E4';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: INK, paddingBottom: 64 },
  cover: { backgroundColor: INK, color: '#FFFFFF', padding: 48, minHeight: '100%' },
  coverLogos: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 56 },
  coverEyebrow: { fontSize: 9, letterSpacing: 2.4, textTransform: 'uppercase', color: TEAL, marginBottom: 12 },
  coverTitle: { fontSize: 30, fontFamily: 'Helvetica', lineHeight: 1.15, marginBottom: 28 },
  coverImage: { width: '100%', height: 240, objectFit: 'cover', borderRadius: 3, marginBottom: 32 },
  coverMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  coverMetaCell: { marginRight: 28, marginBottom: 12 },
  coverMetaLabel: { fontSize: 7.5, letterSpacing: 1.6, textTransform: 'uppercase', color: TEAL, marginBottom: 3 },
  coverMetaValue: { fontSize: 11, color: '#FFFFFF' },
  body: { padding: 48 },
  eyebrow: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: TEAL_DEEP, marginBottom: 6 },
  h2: { fontSize: 20, marginBottom: 18, color: INK },
  note: { fontSize: 10, color: INK_SOFT, lineHeight: 1.6, marginBottom: 24, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: TEAL },
  day: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LINE },
  dayLabel: { width: 70, fontSize: 10, color: TEAL_DEEP, fontFamily: 'Helvetica-Oblique' },
  dayContent: { flex: 1 },
  dayTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  dayText: { fontSize: 9.5, color: INK_SOFT, lineHeight: 1.5 },
  listItem: { flexDirection: 'row', marginBottom: 6 },
  listMark: { width: 16, color: TEAL_DEEP, fontFamily: 'Helvetica-Bold' },
  listText: { flex: 1, fontSize: 9.5, color: INK_SOFT, lineHeight: 1.5 },
  colRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  col: { flex: 1 },
  colTitle: { fontSize: 13, marginBottom: 10, color: INK },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: LINE },
  priceDesc: { flex: 1, paddingRight: 12, color: INK_SOFT },
  priceAmt: { width: 110, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 2, borderTopColor: INK, marginTop: 4 },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  pps: { backgroundColor: INK, color: '#FFFFFF', padding: 20, borderRadius: 3, marginTop: 24, alignItems: 'center' },
  ppsAmount: { fontSize: 22, color: TEAL, marginBottom: 4 },
  ppsLabel: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#FFFFFF' },
  term: { flexDirection: 'row', marginBottom: 8 },
  termNum: { width: 20, color: TEAL_DEEP, fontFamily: 'Helvetica-Oblique' },
  termText: { flex: 1, fontSize: 9, color: INK_SOFT, lineHeight: 1.5 },
  footer: {
    position: 'absolute', bottom: 24, left: 48, right: 48,
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 8, color: INK_SOFT, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8,
  },
  galleryRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  galleryImg: { flex: 1, height: 120, objectFit: 'cover', borderRadius: 3 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: '#E6E6E6' },
  payLabel: { fontSize: 11, color: INK },
  payWhen: { fontSize: 9, color: INK_SOFT, marginTop: 2 },
  payPaid: { fontSize: 9, color: TEAL, marginTop: 2 },
  payAmt: { fontSize: 11, color: INK },
  payNote: { fontSize: 8.5, color: INK_SOFT, marginTop: 12, lineHeight: 1.5 },
});

function longDate(d: string) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function Footer({ quote }: { quote: Quote }) {
  return (
    <View style={s.footer} fixed>
      <Text>{quote.ref} · Premium Choice Travel JLT · Dubai, UAE</Text>
      <Text>+971 4 420 6965 · info@premiumchoicetravel.com</Text>
    </View>
  );
}

export default function QuoteDoc({
  quote,
  siteUrl,
  payments = [],
}: {
  quote: Quote;
  siteUrl: string;
  /** The agreed instalments. The PDF is what gets forwarded to a partner, so
   *  it has to answer "how much now?" without them opening the link again. */
  payments?: Payment[];
}) {
  const total = quoteTotal(quote.lines);
  const pp = perPerson(quote);
  const travellers = travellerCount(quote);
  const gallery = quote.images.slice(0, 3);
  const paidSoFar = payments.filter((p) => p.paidAt).reduce((sum, p) => sum + p.amount, 0);
  const outstanding = payments.reduce((sum, p) => sum + p.amount, 0) - paidSoFar;

  return (
    <Document title={`${quote.title} — ${quote.ref}`} author="Premium Choice Travel">
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <View style={s.coverLogos}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={`${siteUrl}/images/logo-white.png`} style={{ height: 44, width: 169 }} />
          </View>
          <Text style={s.coverEyebrow}>Personal quote · {quote.ref}</Text>
          <Text style={s.coverTitle}>{quote.title}</Text>
          {quote.heroImage ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={quote.heroImage} style={s.coverImage} />
          ) : null}
          <View style={s.coverMetaRow}>
            {quote.clientName ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Prepared for</Text>
                <Text style={s.coverMetaValue}>{quote.clientName}</Text>
              </View>
            ) : null}
            {quote.travelDates ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Travel dates</Text>
                <Text style={s.coverMetaValue}>{quote.travelDates}</Text>
              </View>
            ) : null}
            {travellers > 0 ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Travellers</Text>
                <Text style={s.coverMetaValue}>
                  {quote.adults ? `${quote.adults} adult${quote.adults === 1 ? '' : 's'}` : ''}
                  {quote.children ? `${quote.adults ? ' + ' : ''}${quote.children} child${quote.children === 1 ? '' : 'ren'}` : ''}
                </Text>
              </View>
            ) : null}
            {quote.validity ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Valid until</Text>
                <Text style={s.coverMetaValue}>
                  {new Date(quote.validity).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Page>

      {/* Itinerary */}
      {quote.itinerary.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.body}>
            {quote.notes ? <Text style={s.note}>{quote.notes}</Text> : null}
            <Text style={s.eyebrow}>Day by day</Text>
            <Text style={s.h2}>Your itinerary</Text>
            {quote.itinerary.map((day, i) => (
              <View style={s.day} key={i} wrap={false}>
                <Text style={s.dayLabel}>{day.label}</Text>
                <View style={s.dayContent}>
                  {day.title ? <Text style={s.dayTitle}>{day.title}</Text> : null}
                  <Text style={s.dayText}>{day.description}</Text>
                </View>
              </View>
            ))}
            {gallery.length > 0 && (
              <View style={s.galleryRow}>
                {gallery.map((url, i) => (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image key={i} src={url} style={s.galleryImg} />
                ))}
              </View>
            )}
          </View>
          <Footer quote={quote} />
        </Page>
      )}

      {/* Inclusions / exclusions */}
      {(quote.inclusions.length > 0 || quote.exclusions.length > 0) && (
        <Page size="A4" style={s.page}>
          <View style={s.body}>
            <Text style={s.eyebrow}>The details</Text>
            <Text style={s.h2}>What’s covered</Text>
            <View style={s.colRow}>
              {quote.inclusions.length > 0 && (
                <View style={s.col}>
                  <Text style={s.colTitle}>Included</Text>
                  {quote.inclusions.map((item, i) => (
                    <View style={s.listItem} key={i} wrap={false}>
                      <Text style={s.listMark}>•</Text>
                      <Text style={s.listText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              {quote.exclusions.length > 0 && (
                <View style={s.col}>
                  <Text style={s.colTitle}>Not included</Text>
                  {quote.exclusions.map((item, i) => (
                    <View style={s.listItem} key={i} wrap={false}>
                      <Text style={s.listMark}>—</Text>
                      <Text style={s.listText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          <Footer quote={quote} />
        </Page>
      )}

      {/* Investment */}
      <Page size="A4" style={s.page}>
        <View style={s.body}>
          <Text style={s.eyebrow}>The numbers</Text>
          <Text style={s.h2}>Your investment</Text>
          {quote.lines.map((l, i) => (
            <View style={s.priceRow} key={i}>
              <Text style={s.priceDesc}>
                {l.description}
                {l.qty !== 1 ? `  (× ${l.qty})` : ''}
              </Text>
              <Text style={s.priceAmt}>{formatMoney(quote.currency, lineTotal(l))}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={[s.priceAmt, s.totalLabel]}>{formatMoney(quote.currency, total)}</Text>
          </View>
          {pp !== null && (
            <View style={s.pps}>
              <Text style={s.ppsAmount}>{formatMoney(quote.currency, pp)}</Text>
              <Text style={s.ppsLabel}>Per person</Text>
            </View>
          )}

          {payments.length > 0 && (
            <View style={{ marginTop: 28 }}>
              <Text style={s.eyebrow}>The plan</Text>
              <Text style={s.h2}>How you pay</Text>
              {payments.map((p) => (
                <View style={s.payRow} key={p.id}>
                  <View>
                    <Text style={s.payLabel}>{p.label}</Text>
                    {p.paidAt ? (
                      <Text style={s.payPaid}>Received, thank you</Text>
                    ) : (
                      <Text style={s.payWhen}>
                        {p.dueDate ? `Due ${longDate(p.dueDate)}` : 'Due on confirmation'}
                      </Text>
                    )}
                  </View>
                  <Text style={s.payAmt}>{formatMoney(quote.currency, p.amount)}</Text>
                </View>
              ))}
              {outstanding > 0 && paidSoFar > 0 && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Still to pay</Text>
                  <Text style={[s.priceAmt, s.totalLabel]}>
                    {formatMoney(quote.currency, outstanding)}
                  </Text>
                </View>
              )}
              <Text style={s.payNote}>
                We will send payment details when you are ready to go ahead. No payment is taken
                from this document.
              </Text>
            </View>
          )}
        </View>
        <Footer quote={quote} />
      </Page>

      {/* Terms */}
      {quote.terms.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.body}>
            <Text style={s.eyebrow}>The small print</Text>
            <Text style={s.h2}>Terms & conditions</Text>
            {quote.terms.map((t, i) => (
              <View style={s.term} key={i}>
                <Text style={s.termNum}>{i + 1}.</Text>
                <Text style={s.termText}>{t}</Text>
              </View>
            ))}
          </View>
          <Footer quote={quote} />
        </Page>
      )}
    </Document>
  );
}
