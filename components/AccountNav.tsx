import Link from 'next/link';

/**
 * The account area's own navigation.
 *
 * Travellers used to be reachable only from a card halfway down the account
 * page, which is not findable. The main site header stays as it is — a signed
 * out visitor has no use for a Travellers link — and the sections announce
 * themselves once someone is inside their account.
 */
export default function AccountNav({ current }: { current: 'overview' | 'travellers' }) {
  const items = [
    { key: 'overview', href: '/account', label: 'Overview' },
    { key: 'travellers', href: '/account/travellers', label: 'Who is travelling' },
  ] as const;

  return (
    <nav className="mt-6 flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={current === i.key ? 'page' : undefined}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            current === i.key ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
