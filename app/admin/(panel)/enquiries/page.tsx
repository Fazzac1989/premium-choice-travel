import { createAdminClient } from '@/lib/supabase/admin';
import EnquiriesList from '@/components/admin/EnquiriesList';

export const dynamic = 'force-dynamic';

export default async function AdminEnquiriesPage() {
  const db = createAdminClient();
  const { data } = await db.from('enquiries').select('*').order('created_at', { ascending: false });

  return (
    <>
      <h1 className="font-serif text-3xl text-ink">Enquiries</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Everything sent through every website’s enquiry forms.
      </p>
      <div className="mt-8">
        <EnquiriesList enquiries={data ?? []} />
      </div>
    </>
  );
}
