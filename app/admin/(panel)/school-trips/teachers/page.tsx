import Link from 'next/link';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import StTeachersManager, { type TeacherRow } from '@/components/admin/StTeachersManager';

export const dynamic = 'force-dynamic';

export default async function StTeachersPage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const db = pcstClient();
  const { data, error } = await db
    .from('portal_teachers')
    .select('id, name, email, school_name, status, invited_at, accepted_at, last_seen_at')
    .order('name');

  if (error) {
    return (
      <p className="card p-10 text-sm text-danger">
        The teacher portal is unavailable until the{' '}
        <code>20260815000000_teacher_portal.sql</code> migration has been run against the School
        Trips database.
      </p>
    );
  }

  // How many open quotes each teacher can see, matched on the quote's email.
  const { data: quotes } = await db.from('quotes').select('teacher_email, status');
  const counts = new Map<string, number>();
  for (const q of quotes ?? []) {
    const email = (q.teacher_email ?? '').toLowerCase();
    if (!email || !['published', 'accepted'].includes(q.status)) continue;
    counts.set(email, (counts.get(email) ?? 0) + 1);
  }

  const rows: TeacherRow[] = (data ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    schoolName: t.school_name,
    status: t.status,
    invitedAt: t.invited_at,
    acceptedAt: t.accepted_at,
    lastSeenAt: t.last_seen_at,
    quoteCount: counts.get(t.email.toLowerCase()) ?? 0,
  }));

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Teachers</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          The portal is invite-only. Send a teacher their link and they see the quotes addressed to
          their email, and can accept one — which notifies you and takes no payment. They sign in at{' '}
          {PCST_SITE_URL.replace('https://', '')}/portal.
        </p>
      </div>

      <StTeachersManager rows={rows} />
    </>
  );
}
