'use client';

/**
 * Country name in flowing calligraphy, animated letter by letter as though
 * someone is writing it in front of you: each letter's outline draws itself,
 * then fills with ink. Decorative — pair with a screen-reader heading.
 * Respects prefers-reduced-motion (letters simply appear).
 */
export default function CalligraphyName({
  name,
  className = '',
}: {
  name: string;
  className?: string;
}) {
  const letters = Array.from(name);
  // Longer names write in slightly faster strokes so the wait stays pleasant.
  const perLetter = name.length > 14 ? 0.14 : 0.22;

  return (
    <span aria-hidden="true" className={`calligraphy block ${className}`}>
      <svg
        viewBox="0 0 1000 190"
        className="h-auto w-full overflow-visible"
        style={{ maxWidth: `${Math.max(260, Math.min(900, name.length * 52))}px` }}
      >
        <text
          x="0"
          y="140"
          textLength={name.length > 9 ? 980 : undefined}
          style={{
            fontFamily: 'var(--font-script), cursive',
            fontSize: name.length > 16 ? 96 : 128,
          }}
        >
          {letters.map((ch, i) => (
            <tspan
              key={i}
              className="cal-letter"
              style={{ animationDelay: `${0.25 + i * perLetter}s, ${0.55 + i * perLetter}s` }}
            >
              {ch === ' ' ? ' ' : ch}
            </tspan>
          ))}
        </text>
      </svg>

      <style jsx>{`
        .cal-letter {
          fill: currentColor;
          fill-opacity: 0;
          stroke: currentColor;
          stroke-width: 1.6;
          stroke-dasharray: 340;
          stroke-dashoffset: 340;
          stroke-linecap: round;
          stroke-linejoin: round;
          animation:
            cal-draw 0.9s ease forwards,
            cal-fill 0.7s ease forwards;
        }
        @keyframes cal-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes cal-fill {
          to {
            fill-opacity: 1;
            stroke-width: 0.4;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .cal-letter {
            animation: none;
            fill-opacity: 1;
            stroke-dashoffset: 0;
            stroke-width: 0;
          }
        }
      `}</style>
    </span>
  );
}
