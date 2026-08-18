'use client';

import ListEditor from '@/components/admin/ListEditor';
import SectionsEditor from '@/components/admin/SectionsEditor';
import type { GuideSection } from '@/lib/types';

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Ajman', 'Umm Al Quwain', 'Multi-emirate'];
const TEE_STATUSES = ['unknown', 'requested', 'confirmed'];

/** Brand-specific structured fields, stored in packages.details (jsonb). */
export default function BrandDetailsFields({
  brand,
  details,
  onChange,
}: {
  brand: string;
  details: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}) {
  const set = (k: string, v: any) => onChange({ ...details, [k]: v });

  if (brand === 'golf') {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Rounds of golf</label>
            <input type="number" min={0} className="field" value={details.rounds ?? ''} onChange={(e) => set('rounds', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Tee-time status</label>
            <select className="field" value={details.teeTimeStatus ?? 'unknown'} onChange={(e) => set('teeTimeStatus', e.target.value)}>
              {TEE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Handicap requirement</label>
            <input className="field" value={details.handicap ?? ''} onChange={(e) => set('handicap', e.target.value)} placeholder="e.g. certificate required / none" />
          </div>
          <div>
            <label className="field-label">Buggies</label>
            <input className="field" value={details.buggies ?? ''} onChange={(e) => set('buggies', e.target.value)} placeholder="included / extra / unknown" />
          </div>
          <div>
            <label className="field-label">Caddies</label>
            <input className="field" value={details.caddies ?? ''} onChange={(e) => set('caddies', e.target.value)} placeholder="available / unknown" />
          </div>
          <div>
            <label className="field-label">Club carriage note</label>
            <input className="field" value={details.clubCarriage ?? ''} onChange={(e) => set('clubCarriage', e.target.value)} placeholder="e.g. check airline sports baggage" />
          </div>
        </div>
        <SectionsEditor
          label="Courses"
          hint="One entry per course — access status in the notes"
          items={(details.courses ?? []) as GuideSection[]}
          onChange={(v) => set('courses', v)}
          headingPlaceholder="Course name"
          bodyPlaceholder="Notes: round day, access status (unknown until verified)…"
        />
        <ListEditor
          label="Non-golfer activities"
          items={(details.nonGolfer ?? []) as string[]}
          onChange={(v) => set('nonGolfer', v)}
          placeholder="e.g. Spa day, old-town walk"
        />
      </div>
    );
  }

  if (brand === 'cruises') {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Cruise region</label>
            <input className="field" value={details.cruiseRegion ?? ''} onChange={(e) => set('cruiseRegion', e.target.value)} placeholder="e.g. Arabian Gulf" />
          </div>
          <div>
            <label className="field-label">Embarkation</label>
            <input className="field" value={details.embarkation ?? ''} onChange={(e) => set('embarkation', e.target.value)} placeholder="e.g. Dubai" />
          </div>
          <div>
            <label className="field-label">Disembarkation</label>
            <input className="field" value={details.disembarkation ?? ''} onChange={(e) => set('disembarkation', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Cruise type</label>
            <input className="field" value={details.cruiseType ?? ''} onChange={(e) => set('cruiseType', e.target.value)} placeholder="ocean / river / expedition" />
          </div>
          <div>
            <label className="field-label">Sea days</label>
            <input type="number" min={0} className="field" value={details.seaDays ?? ''} onChange={(e) => set('seaDays', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Ship / line note</label>
            <input className="field" value={details.shipNote ?? ''} onChange={(e) => set('shipNote', e.target.value)} placeholder="Route inspiration — line confirmed at quote stage" />
          </div>
        </div>
        <ListEditor
          label="Possible ports"
          hint="Actual routing always matches the selected sailing"
          items={(details.ports ?? []) as string[]}
          onChange={(v) => set('ports', v)}
          placeholder="e.g. Santorini"
        />
      </div>
    );
  }

  if (brand === 'staycations') {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="field-label">Emirate</label>
          <select className="field" value={details.emirate ?? ''} onChange={(e) => set('emirate', e.target.value)}>
            <option value="">— select —</option>
            {EMIRATES.map((em) => <option key={em} value={em}>{em}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Staycation type</label>
          <input className="field" value={details.staycationType ?? ''} onChange={(e) => set('staycationType', e.target.value)} placeholder="beach / desert / city / adventure / wellness" />
        </div>
        <div>
          <label className="field-label">Resort note</label>
          <input className="field" value={details.resortNote ?? ''} onChange={(e) => set('resortNote', e.target.value)} placeholder="named only when supplier access verified" />
        </div>
      </div>
    );
  }

  return null;
}
