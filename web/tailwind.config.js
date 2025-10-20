/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
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

