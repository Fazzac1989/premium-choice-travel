export default function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-line text-ink-soft',
    review: 'bg-[#F2E4C4] text-[#8A6D1A]',
    sent: 'bg-teal/15 text-teal-deep',
    accepted: 'bg-teal text-white',
    declined: 'bg-danger/10 text-danger',
    expired: 'bg-line text-ink-soft',
    published: 'bg-teal/15 text-teal-deep',
    new: 'bg-teal/15 text-teal-deep',
    contacted: 'bg-line text-ink-soft',
    closed: 'bg-line text-ink-soft',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status] ?? 'bg-line text-ink-soft'}`}>
      {status}
    </span>
  );
}
