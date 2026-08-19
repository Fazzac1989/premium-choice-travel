import Link from 'next/link';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { MISSING_LABELS, missingFor, type PortalStudent } from '@/lib/st-portal';
import StPlanningManager, {
  type PlanningTrip,
  type TeacherOption,
} from '@/components/admin/StPlanningManager';

export const dynamic = 'force-dynamic';

export default async function StPlanningPage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const db = pcstClient();
  const tripsRes = await db
    .from('portal_trips')
    .select('*, portal_trip_teachers(teacher_id), portal_students(*)')
    .order('departure_date', { ascending: true, nullsFirst: false });

  if (tripsRes.error) {
    return (
      <p className="card p-10 text-sm text-danger">
        The planning workspace is unavailable until the{' '}
        <code>20260816000000_planning_workspace.sql</code> migration has been run against the School
        Trips database.
      </p>
    );
  }

  const [{ data: teachers }, { data: quotes }] = await Promise.all([
    db.from('portal_teachers').select('id, name, email, school_name').order('name'),
    db
      .from('quotes')
      .select('id, ref, title, school_name, travel_dates, teacher_email, status')
      .eq('status', 'accepted')
      .order('id', { ascending: false }),
  ]);

  const trips: PlanningTrip[] = (tripsRes.data ?? []).map((t: any) => {
    const students: PortalStudent[] = (t.portal_students ?? []).map((s: any) => ({
      id: s.id,
      fullName: s.full_name,
      dateOfBirth: s.date_of_birth,
      yearGroup: s.year_group,
      nationality: s.nationality,
      passportNumber: s.passport_number,
      passportExpiry: s.passport_expiry,
      passportFile: s.passport_file,
      consentFile: s.consent_file,
      dietary: s.dietary,
      medical: s.medical,
      emergencyContactName: s.emergency_contact_name,
      emergencyContactPhone: s.emergency_contact_phone,
      roomGroup: s.room_group,
      notes: s.notes,
    }));

    return {
      id: t.id,
      title: t.title,
      schoolName: t.school_name,
      travelDates: t.travel_dates,
      departureDate: t.departure_date,
      paperworkDue: t.paperwork_due,
      status: t.status,
      dataPurgedAt: t.data_purged_at,
      teacherIds: (t.portal_trip_teachers ?? []).map((x: any) => x.teacher_id),
      studentCount: students.length,
      completeCount: students.filter((s) => missingFor(s).length === 0).length,
      outstanding: students.reduce((n, s) => n + missingFor(s).length, 0),
      withDietary: students.filter((s) => s.dietary).length,
      withMedical: students.filter((s) => s.medical).length,
      gaps: (Object.keys(MISSING_LABELS) as (keyof typeof MISSING_LABELS)[])
        .map((k) => ({
          label: MISSING_LABELS[k],
          count: students.filter((s) => missingFor(s).includes(k)).length,
        }))
        .filter((g) => g.count > 0),
    };
  });

  const teacherOptions: TeacherOption[] = (teachers ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    schoolName: t.school_name,
  }));

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Trip planning</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Open a workspace so teachers can fill in their student list, passports, consent forms,
          rooming and dietary or medical details. You see the same data, and what is still missing.
        </p>
      </div>

      <StPlanningManager
        trips={trips}
        teachers={teacherOptions}
        acceptedQuotes={(quotes ?? []).map((q: any) => ({
          id: q.id,
          ref: q.ref,
          title: q.title,
          schoolName: q.school_name,
          travelDates: q.travel_dates,
          teacherEmail: q.teacher_email,
        }))}
      />
    </>
  );
}
