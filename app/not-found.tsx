import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sand px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">This page has wandered off the map</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        The page you’re looking for doesn’t exist — but the world is full of better places.
      </p>
      <Link href="/" className="btn-primary mt-8">Back to the beach</Link>
    </main>
  );
}
