import { notFound } from 'next/navigation';
import { getStQuote, stQuoteClientUrl } from '@/lib/pcst';
import StQuoteEditor from '@/components/admin/StQuoteEditor';

export const dynamic = 'force-dynamic';

export default async function StQuotePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const quote = await getStQuote(id);
  if (!quote) notFound();

  return <StQuoteEditor quote={quote} clientUrl={stQuoteClientUrl(quote)} />;
}
