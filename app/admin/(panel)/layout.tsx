import Image from 'next/image';
import Link from 'next/link';
import { signOut } from '@/lib/admin/actions';
import AdminNav from '@/components/admin/AdminNav';

export const metadata = { title: 'Admin — Premium Choice Travel' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-sand">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-ink text-white">
        <div className="border-b border-white/10 px-6 py-5">
          <Link href="/admin">
            <Image src="/images/logo-white.png" alt="Premium Choice Travel" width={150} height={39} className="h-9 w-auto" />
          </Link>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/50">Admin console</p>
        </div>
        <AdminNav />
        <div className="border-t border-white/10 p-4">
          <Link href="/" target="_blank" className="block rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            ↗ View website
          </Link>
          <form action={signOut}>
            <button type="submit" className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="ml-60 min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
