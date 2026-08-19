import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  formatMoney,
  lineTotal,
  perPerson,
  quoteTotal,
  travellerCount,
  type Quote,
} from '@/lib/quote-math';

/**
 * A quote, rebuilt as a sales presentation.
 *
 * The quote PDF is a document — it is read. This is a deck: landscape slides,
 * one idea each, image-led, meant to be projected or walked through on a screen
 * with the client in the room. Same numbers, different job, so nothing here
 * invents content the quote does not already carry.
 */

const INK = '#16242E';
const INK_SOFT = '#425964';
const TEAL = '#19BAAB';
const TEAL_DEEP = '#12897E';
const LINE = '#DDE1E4';
const PAPER = '#FFFFFF';

/** 16:9 rather than A4 landscape, so it fills a screen without letterboxing. */
const SLIDE = { width: 960, height: 540 };

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', color: INK, backgroundColor: PAPER },

  /* full-bleed image slide */
  fill: { position: 'absolute', top: 0, left: 0, width: SLIDE.width, height: SLIDE.height, objectFit: 'cover' },
  scrim: { position: 'absolute', top: 0, left: 0, width: SLIDE.width, height: SLIDE.height, backgroundColor: INK, opacity: 0.62 },
  coverBody: { position: 'absolute', top: 0, left: 0, width: SLIDE.width, height: SLIDE.height, padding: 64, justifyContent: 'flex-end' },
  coverEyebrow: { fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: TEAL, marginBottom: 14 },
  coverTitle: { fontSize: 42, color: '#FFFFFF', lineHeight: 1.12, marginBottom: 18, maxWidth: 700 },
  coverSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  /* standard slide */
  slide: { padding: 64, height: '100%' },
  eyebrow: { fontSize: 10, letterSpacing: 2.6, textTransform: 'uppercase', color: TEAL_DEEP, marginBottom: 10 },
  h1: { fontSize: 32, marginBottom: 26, lineHeight: 1.15 },
  lead: { fontSize: 13, color: INK_SOFT, lineHeight: 1.6, maxWidth: 620, marginBottom: 20 },

  /* headline stat row */
  statRow: { flexDirection: 'row', marginTop: 6 },
  stat: { marginRight: 52 },
  statValue: { fontSize: 30, color: INK, marginBottom: 4 },
  statLabel: { fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: INK_SOFT },

  /* day cards */
  dayRow: { flexDirection: 'row', marginBottom: 14 },
  dayNum: { width: 74, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: TEAL_DEEP, paddingTop: 3 },
  dayBody: { flex: 1, borderLeftWidth: 2, borderLeftColor: LINE, paddingLeft: 16, paddingBottom: 4 },
  dayTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  dayText: { fontSize: 10.5, color: INK_SOFT, lineHeight: 1.5 },

  /* two-column lists */
  cols: { flexDirection: 'row' },
  col: { flex: 1, paddingRight: 28 },
  listRow: { flexDirection: 'row', marginBottom: 7 },
  mark: { width: 16, color: TEAL_DEEP, fontSize: 11 },
  markOut: { width: 16, color: INK_SOFT, fontSize: 11 },
  listText: { flex: 1, fontSize: 11, color: INK_SOFT, lineHeight: 1.45 },

  /* pricing */
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: LINE },
  priceDesc: { flex: 1, paddingRight: 16, fontSize: 11, color: INK_SOFT },
  priceAmt: { width: 130, textAlign: 'right', fontSize: 11 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 2, borderTopColor: INK, marginTop: 6 },
  totalLabel: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  totalAmt: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headline: { backgroundColor: INK, borderRadius: 4, padding: 26, marginTop: 24, alignItems: 'center' },
  headlineValue: { fontSize: 34, color: TEAL, marginBottom: 6 },
  headlineLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#FFFFFF' },

  /* gallery slide */
  galleryRow: { flexDirection: 'row', height: 300, marginTop: 8 },
  galleryImg: { flex: 1, height: '100%', objectFit: 'cover', borderRadius: 3, marginRight: 8 },

  term: { flexDirection: 'row', marginBottom: 6 },
  termNum: { width: 20, fontSize: 9.5, color: TEAL_DEEP, fontFamily: 'Helvetica-Oblique' },
  termText: { flex: 1, fontSize: 9.5, color: INK_SOFT, lineHeight: 1.45 },

  footer: {
    position: 'absolute', bottom: 26, left: 64, right: 64,
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 9, color: INK_SOFT,
  },
  logo: { height: 30, width: 121, marginBottom: 26 },
});

function Footer({ quote }: { quote: Quote }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {quote.ref} · Premium Choice Travel
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/** Split a list into slide-sized chunks so nothing overflows a fixed-height page. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default function QuoteDeck({ quote, siteUrl }: { quote: Quote; siteUrl: string }) {
  const total = quoteTotal(quote.lines);
  const pp = perPerson(quote);
  const travellers = travellerCount(quote);
  const money = (n: number) => formatMoney(quote.currency, n);

  const cover = quote.heroImage ?? quote.images[0] ?? null;
  const gallery = quote.images.filter((img) => img !== cover).slice(0, 3);
  const dayGroups = chunk(quote.itinerary, 5);

  const stats = [
    quote.travelDates ? { value: quote.travelDates, label: 'When' } : null,
    travellers > 0 ? { value: String(travellers), label: 'Travellers' } : null,
    quote.itinerary.length ? { value: `${quote.itinerary.length} days`, label: 'Duration' } : null,
  ].filter((x): x is { value: string; label: string } => Boolean(x));

  return (
    <Document title={`${quote.title} — ${quote.ref}`} author="Premium Choice Travel">
      {/* 1 — Cover */}
      <Page size={SLIDE} style={s.page}>
        {cover ? (
          <>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={cover} style={s.fill} />
            <View style={s.scrim} />
          </>
        ) : (
          <View style={[s.fill, { backgroundColor: INK }]} />
        )}
        <View style={s.coverBody}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={`${siteUrl}/images/logo-white.png`} style={s.logo} />
          <Text style={s.coverEyebrow}>Proposal · {quote.ref}</Text>
          <Text style={s.coverTitle}>{quote.title}</Text>
          <Text style={s.coverSub}>
            {[quote.clientName, quote.travelDates].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
      </Page>

      {/* 2 — At a glance */}
      <Page size={SLIDE} style={s.page}>
        <View style={s.slide}>
          <Text style={s.eyebrow}>At a glance</Text>
          <Text style={s.h1}>{quote.title}</Text>
          {quote.notes ? <Text style={s.lead}>{quote.notes}</Text> : null}

          <View style={s.statRow}>
            {stats.map((st) => (
              <View key={st.label} style={s.stat}>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {gallery.length > 0 && (
            <View style={s.galleryRow}>
              {gallery.map((src, i) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={i} src={src} style={s.galleryImg} />
              ))}
            </View>
          )}
        </View>
        <Footer quote={quote} />
      </Page>

      {/* 3 — The journey, five days a slide */}
      {dayGroups.map((group, gi) => (
        <Page key={gi} size={SLIDE} style={s.page}>
          <View style={s.slide}>
            <Text style={s.eyebrow}>The journey</Text>
            <Text style={s.h1}>
              {dayGroups.length > 1 ? `Day by day (${gi + 1}/${dayGroups.length})` : 'Day by day'}
            </Text>
            {group.map((day, i) => (
              <View key={i} style={s.dayRow}>
                <Text style={s.dayNum}>{day.label}</Text>
                <View style={s.dayBody}>
                  <Text style={s.dayTitle}>{day.title}</Text>
                  <Text style={s.dayText}>{day.description}</Text>
                </View>
              </View>
            ))}
          </View>
          <Footer quote={quote} />
        </Page>
      ))}

      {/* 4 — What's included */}
      {(quote.inclusions.length > 0 || quote.exclusions.length > 0) && (
        <Page size={SLIDE} style={s.page}>
          <View style={s.slide}>
            <Text style={s.eyebrow}>What you get</Text>
            <Text style={s.h1}>Included &amp; not included</Text>
            <View style={s.cols}>
              <View style={s.col}>
                <Text style={[s.statLabel, { marginBottom: 12 }]}>Included</Text>
                {quote.inclusions.map((item, i) => (
                  <View key={i} style={s.listRow}>
                    <Text style={s.mark}>✓</Text>
                    <Text style={s.listText}>{item}</Text>
                  </View>
                ))}
              </View>
              {quote.exclusions.length > 0 && (
                <View style={s.col}>
                  <Text style={[s.statLabel, { marginBottom: 12 }]}>Not included</Text>
                  {quote.exclusions.map((item, i) => (
                    <View key={i} style={s.listRow}>
                      <Text style={s.markOut}>—</Text>
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

      {/* 5 — Investment */}
      <Page size={SLIDE} style={s.page}>
        <View style={s.slide}>
          <Text style={s.eyebrow}>Investment</Text>
          <Text style={s.h1}>Your quote</Text>

          {quote.lines.map((l, i) => (
            <View key={i} style={s.priceRow}>
              <Text style={s.priceDesc}>
                {l.description}
                {l.qty > 1 ? `  ×${l.qty}` : ''}
              </Text>
              <Text style={s.priceAmt}>{money(lineTotal(l))}</Text>
            </View>
          ))}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmt}>{money(total)}</Text>
          </View>

          {pp !== null && travellers > 0 && (
            <View style={s.headline}>
              <Text style={s.headlineValue}>{money(pp)}</Text>
              <Text style={s.headlineLabel}>per person, based on {travellers} travelling</Text>
            </View>
          )}

          {quote.validity ? (
            <Text style={[s.dayText, { marginTop: 16 }]}>Valid until {quote.validity}.</Text>
          ) : null}
        </View>
        <Footer quote={quote} />
      </Page>

      {/* 6 — Next steps */}
      <Page size={SLIDE} style={s.page}>
        <View style={s.slide}>
          <Text style={s.eyebrow}>Next steps</Text>
          <Text style={s.h1}>Ready when you are</Text>
          <Text style={s.lead}>
            Review this proposal online, where you can accept it or send us a message with any
            changes. Nothing is confirmed and no payment is taken until you say so.
          </Text>
          <Text style={[s.statLabel, { marginBottom: 18 }]}>
            {siteUrl.replace('https://', '')}/quotes/{quote.publicToken}
          </Text>

          {quote.terms.length > 0 && (
            <>
              <Text style={[s.statLabel, { marginBottom: 10 }]}>Booking terms</Text>
              {quote.terms.slice(0, 8).map((t, i) => (
                <View key={i} style={s.term}>
                  <Text style={s.termNum}>{i + 1}.</Text>
                  <Text style={s.termText}>{t}</Text>
                </View>
              ))}
            </>
          )}
        </View>
        <Footer quote={quote} />
      </Page>
    </Document>
  );
}
