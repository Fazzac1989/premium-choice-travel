import type { Seasonality } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 12-month suitability strip: Best / Good / Possible / Less suitable. */
export default function SeasonalityBar({ seasonality }: { seasonality: Seasonality }) {
  const band = (m: number) =>
    seasonality.best.includes(m)
      ? { cls: 'bg-teal text-white', label: 'Best' }
      : seasonality.good.includes(m)
        ? { cls: 'bg-teal/40 text-ink', label: 'Good' }
        : seasonality.possible.includes(m)
          ? { cls: 'bg-sand text-ink-soft', label: 'Possible' }
          : { cls: 'bg-line/50 text-ink-soft/60', label: 'Less suitable' };

  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {MONTHS.map((name, idx) => {
          const b = band(idx + 1);
          return (
            <div key={name} className={`rounded-lg px-1 py-2.5 text-center ${b.cls}`} title={`${name}: ${b.label}`}>
              <span className="text-[11px] font-bold">{name}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal" /> Best</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal/40" /> Good</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sand" /> Possible</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-line/50" /> Less suitable</span>
        <span className="ml-auto italic">Seasons are guidance, never a weather guarantee.</span>
      </div>
    </div>
  );
}
