import { notFound } from 'next/navigation';
import { getQuoteById, quoteTotal } from '@/lib/quotes';
import { getPayments, summarise } from '@/lib/payments';
import { listPaymentLinks } from '@/lib/payments/links';
import { mswipeConfig } from '@/lib/payments/mswipe';
import QuoteEditor from '@/components/admin/QuoteEditor';
import PaymentSchedule from '@/components/admin/PaymentSchedule';
import PaymentLinks from '@/components/admin/PaymentLinks';

export const dynamic = 'force-dynamic';

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const quote = await getQuoteById(id);
  if (!quote) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const payments = await getPayments(id);
  const total = quoteTotal(quote.lines);
  const links = await listPaymentLinks(id);
  const gateway = mswipeConfig();

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
          quoteTotal={total}
          payments={payments}
          travelDate={quote.validity ?? ''}
        />
      </div>
      <div className="mt-6">
        <PaymentLinks
          quoteId={id}
          quoteRef={quote.ref}
          currency={quote.currency}
          configured={Boolean(gateway)}
          environment={gateway?.env ?? null}
          links={links}
          payments={payments}
          client={{
            name: quote.clientName ?? '',
            email: quote.clientEmail ?? '',
            phone: quote.clientPhone ?? '',
          }}
          outstanding={summarise(payments, total).outstanding}
        />
      </div>
    </>
  );
}
