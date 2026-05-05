/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#7ED87A',
          light: '#B8EDB5',
        },
        bg: {
          app: '#090910',
          card: '#11112a',
          cardAlt: '#16162e',
        },
        border: '#2a2a4a',
        regime: {
          trending: '#7ED87A',
          meanReverting: '#00ccff',
          volatile: '#f5c542',
          illiquid: '#ff4455',
        },
        signal: {
          bullish: '#7ED87A',
          bearish: '#ff4455',
          neutral: '#f5c542',
        },
        text: {
          primary: '#ddddf0',
          secondary: '#7777aa',
          muted: '#555570',
          mono: '#7ED87A',
        }
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
