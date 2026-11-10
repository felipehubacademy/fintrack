/** @type {import('tailwindcss').Config} */
module.exports = {
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
  plugins: [],
};
