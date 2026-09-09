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
      ink: '#16242E',
      'ink-soft': '#425964',
      teal: '#19BAAB',
      'teal-deep': '#12897E',
      'teal-hover': '#14A396',
      sand: '#F6F4EF',
      line: 'rgba(22,36,46,.14)',
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
