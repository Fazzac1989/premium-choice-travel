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
    },
    fontFamily: {
      sans: ['var(--font-archivo)', 'sans-serif'],
      serif: ['var(--font-fraunces)', 'serif'],
      // Coastal Calm: Cormorant Garamond display, Inter interface.
      display: ['var(--font-cormorant)', 'Georgia', 'serif'],
      ui: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
    },
    extend: {
      maxWidth: { site: '1240px' },
    },
  },
  plugins: [],
};

export default config;
