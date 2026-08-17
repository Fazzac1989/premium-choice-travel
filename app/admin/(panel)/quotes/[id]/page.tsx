import { notFound } from 'next/navigation';
import { getQuoteById } from '@/lib/quotes';
import QuoteEditor from '@/components/admin/QuoteEditor';

export const dynamic = 'force-dynamic';

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const quote = await getQuoteById(id);
  if (!quote) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return <QuoteEditor quote={quote} siteUrl={siteUrl} />;
}
