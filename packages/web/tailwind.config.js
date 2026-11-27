/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

// Launch design tokens. Light values on :root, dark values under `.dark`
// (class strategy) so existing light pages are unaffected until dark mode
// is turned on deliberately. Stored as RGB channels so opacity modifiers
// such as bg-brand-500/10 keep working.
const TOKENS = {
  'brand-500': ['#1F5BFF', '#4C7DFF'],
  'brand-50': ['#EEF3FF', '#111A33'],
  'ink-900': ['#0B1220', '#F4F6FA'],
  'ink-500': ['#5B6475', '#9AA3B2'],
  surface: ['#FFFFFF', '#0B0F17'],
  'surface-2': ['#F5F7FB', '#141A24'],
  positive: ['#12B76A', '#32D583'],
  warning: ['#F79009', '#FDB022'],
  negative: ['#F04438', '#F97066'],
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
const vars = (idx) => Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [`--color-${k}`, rgb(v[idx])]));
const token = (k) => `rgb(var(--color-${k}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      colors: {
        // Azulao Premium palette
        azulao: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#4D8AFF',
          500: '#1A6AFF',
          600: '#0047CC',
          700: '#003399',
          800: '#002266',
          900: '#001133',
        },
        accent: {
          50: '#FFF8E1',
          100: '#FFE0B2',
          200: '#FFD080',
          300: '#F5A623',
          400: '#CC8400',
          500: '#996300',
        },
        // Backward compat aliases
        'flight-blue': '#1A6AFF',
        'deep-sky': '#003399',
        'feather-blue': '#93C5FD',
        'spring-accent': '#F5A623',
        'fog-mist': '#EFF6FF',
        // Launch tokens
        brand: { 50: token('brand-50'), 500: token('brand-500'), DEFAULT: token('brand-500') },
        ink: { 500: token('ink-500'), 900: token('ink-900'), DEFAULT: token('ink-900') },
        surface: { DEFAULT: token('surface'), 2: token('surface-2') },
        positive: token('positive'),
        warning: token('warning'),
        negative: token('negative'),
        whatsapp: '#25D366',
      },
      borderRadius: {
        card: '12px',
        button: '999px',
      },
      keyframes: {
        fillLogo: {
          '0%': {
            clipPath: 'inset(100% 0 0 0)',
            opacity: '0.3'
          },
          '50%': {
            opacity: '1'
          },
          '100%': {
            clipPath: 'inset(0 0 0 0)',
            opacity: '1'
          }
        }
      },
      animation: {
        'fill-logo': 'fillLogo 1.5s ease-in-out infinite'
      }
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': vars(0), '.dark': vars(1) });
    }),
  ],
};
