import type { Config } from 'tailwindcss';

// Brand tokens only — default Tailwind colors are intentionally not exposed.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      // Defined as channels so a section of the site can restate them and
      // every use follows, `bg-teal/10` included. The values live in
      // globals.css: :root holds the originals, .coastal the Coastal Calm
      // equivalents. The admin sits outside .coastal and never moves.
      ink: 'rgb(var(--c-ink) / <alpha-value>)',
      'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
      teal: 'rgb(var(--c-teal) / <alpha-value>)',
      'teal-deep': 'rgb(var(--c-teal-deep) / <alpha-value>)',
      'teal-hover': 'rgb(var(--c-teal-hover) / <alpha-value>)',
      sand: 'rgb(var(--c-sand) / <alpha-value>)',
      line: 'rgb(var(--c-line) / <alpha-value>)',
      danger: '#B4423C',

      // ── Coastal Calm — Premium Choice Staycations only ──────────
      // Additive: no other brand uses these, so nothing else moves.
      petrol: '#164B57',
      'petrol-deep': '#103B45',
      'sea-ink': '#183B46',
      'sea-soft': '#596D74',
      mist: '#EAF3F4',
      dune: '#E8DECD',
      shell: '#F7F8F6',
      'sea-line': '#DAE4E5',
      'ok-bg': '#E8F2ED',
      'ok-ink': '#256147',
      'wait-bg': '#FFF1D9',
      'wait-ink': '#885006',
      'err-bg': '#FCECE9',
      'err-ink': '#A43C31',

      // ── Premium Choice Holidays — online travel agent palette ───
      // Additive: only the Holidays brand uses these. Flame carries every
      // action, sun is the accent that survives a dark panel, and slate is
      // the ground under a headline.
      //
      // The lastminute.com pass (2026-10-09) swapped these for magenta on
      // aubergine and the founder sent it back the same day: the structure
      // it brought stayed, the pink did not. One palette, these names.
      flame: '#E0301E',
      'flame-deep': '#B82414',
      'flame-wash': '#FDEEEC',
      sun: '#FFC72C',
      'sun-deep': '#E8A800',
      'sun-wash': '#FFF7E3',
      slate: '#16202A',
      'slate-soft': '#55636F',
      cloud: '#F3F5F7',
      'cloud-line': '#E3E7EB',
      // The deal badge is green wherever it appears — a price that dropped
      // reads as a saving, not as another call to action.
      'deal-bg': '#E8F5EC',
      'deal-ink': '#1C7A3E',
      // ── Premium Choice Golf Holidays — the golf brand kit ───────
      // Navy is the wordmark, teal the kit's accent; fairway is that teal
      // deepened until white text on it passes AA, and carries every action.
      'golf-navy': '#17232D',
      'golf-navy-soft': '#2B3B48',
      'golf-teal': '#19BAAB',
      fairway: '#0E7A70',
      'fairway-deep': '#0A5F57',
      'fairway-wash': '#E7F5F3',
      'golf-mist': '#F3F6F7',
      'golf-line': '#E1E7EA',
    },
    fontFamily: {
      sans: ['var(--font-archivo)', 'sans-serif'],
      serif: ['var(--font-fraunces)', 'serif'],
      // Coastal Calm: Cormorant Garamond display, Inter interface.
      display: ['var(--font-cormorant)', 'Georgia', 'serif'],
      ui: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      // Premium Choice Holidays: one face, used at every weight.
      holiday: ['var(--font-figtree)', 'system-ui', 'Segoe UI', 'sans-serif'],
    },
    extend: {
      maxWidth: { site: '1240px' },
    },
  },
  plugins: [],
};

export default config;
