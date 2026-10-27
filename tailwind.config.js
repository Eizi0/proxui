/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        proxmox: {
          50: '#fef5ec',
          100: '#fde8d3',
          200: '#fbd0a5',
          300: '#f8b06d',
          400: '#f58433',
          500: '#f26522',
          600: '#e34d13',
          700: '#bc3712',
          800: '#962d16',
          900: '#792715',
        },
        // Fond graphite sombre, type outil d'administration mature
        // (Xen Orchestra, etc.) — distinct du slate Tailwind par défaut.
        graphite: {
          950: '#0a0c10',
          900: '#0d0f14',
          850: '#11141b',
          800: '#161a22',
          700: '#1a1e27',
          600: '#1f232c',
          500: '#262b36',
          400: '#4b5162',
          300: '#5c6475',
          200: '#8b93a3',
          100: '#c7cbd4',
          50: '#e7e9ee',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
