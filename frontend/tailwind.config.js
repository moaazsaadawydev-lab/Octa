/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-app)',
        theme: {
          app: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          subtle: 'var(--bg-subtle)',
          panel: 'var(--bg-panel)',
          border: 'var(--border-color)',
          main: 'var(--text-main)',
          muted: 'var(--text-muted)',
        },
        surface: {
          950: '#0f0f0f',
          900: '#181818',
          850: '#1a1a1a',
          800: '#1E1E1E',
          750: '#222222',
          700: '#242424',
          650: '#282828',
          600: '#2D2D2D',
          500: '#383838',
          400: '#4a4a4a',
        },
        border: {
          subtle: '#2a2a2a',
          DEFAULT: '#333333',
          strong: '#444444',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Cascadia Code',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}


