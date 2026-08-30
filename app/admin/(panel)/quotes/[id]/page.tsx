import { notFound } from 'next/navigation';
import { getQuoteById, quoteTotal } from '@/lib/quotes';
import { getPayments } from '@/lib/payments';
import QuoteEditor from '@/components/admin/QuoteEditor';
import PaymentSchedule from '@/components/admin/PaymentSchedule';

export const dynamic = 'force-dynamic';

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const quote = await getQuoteById(id);
  if (!quote) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const payments = await getPayments(id);

  // The schedule is its own form: saving one must not depend on the other
  // being valid, and a specialist recording a received deposit should not have
  // to re-save the whole quote to do it.
  return (
    <>
      <QuoteEditor quote={quote} siteUrl={siteUrl} />
      <div className="mt-6">
        <PaymentSchedule
          quoteId={id}
          currency={quote.currency}
          quoteTotal={quoteTotal(quote.lines)}
          payments={payments}
          travelDate={quote.validity ?? ''}
        />
      </div>
    </>
  );
}
