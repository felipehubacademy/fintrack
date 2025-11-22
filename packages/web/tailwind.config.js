/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // Breakpoints padronizados para mobile-first
        'sm': '640px',   // Mobile large
        'md': '768px',   // Tablet portrait
        'lg': '1024px',  // Tablet landscape / Desktop small
        'xl': '1280px',  // Desktop medium
        '2xl': '1536px', // Desktop large
      },
      colors: {
        'flight-blue': '#207DFF',
        'deep-sky': '#0D2C66',
        'feather-blue': '#8FCBFF',
        'spring-accent': '#5FFFA7',
        'fog-mist': '#E9EEF5',
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

