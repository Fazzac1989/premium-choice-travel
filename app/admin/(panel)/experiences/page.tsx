import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapDestination, mapExperience } from '@/lib/data';
import ExperienceForm from '@/components/admin/ExperienceForm';

export const dynamic = 'force-dynamic';

export default async function AdminExperiencesPage() {
  const db = createAdminClient();
  const [{ data: expRows, error }, { data: destRows }] = await Promise.all([
    db.from('experiences').select('*').order('sort_order'),
    db.from('destinations').select('*').order('name'),
  ]);
  const destinations = (destRows ?? []).map(mapDestination);
  const experiences = (expRows ?? []).map(mapExperience);
  const destName = (id: number | null) => destinations.find((d) => d.id === id)?.name ?? '—';

  return (
    <>
      <h1 className="font-serif text-3xl text-ink">Experiences</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Reusable experience cards — link them to journey stages and destination pages.
      </p>
      {error && (
        <p className="mt-4 rounded-xl bg-danger/10 p-4 text-sm text-danger">
          The experiences table isn’t migrated yet — paste supabase/RUN-ME.sql in the Supabase SQL editor.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {experiences.map((x) => (
          <details key={x.id} className="card group">
            <summary className="flex cursor-pointer items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-sand">
                {x.image && <Image src={x.image} alt="" fill sizes="80px" className="object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-ink">{x.title}</p>
                <p className="text-xs text-ink-soft">{destName(x.destinationId)}</p>
              </div>
              <span className="text-ink-soft transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="border-t border-line p-5">
              <ExperienceForm experience={x} destinations={destinations} />
            </div>
          </details>
        ))}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="font-serif text-xl text-ink">Add an experience</h2>
        <div className="mt-4">
          <ExperienceForm experience={null} destinations={destinations} />
        </div>
      </div>
    </>
  );
}
