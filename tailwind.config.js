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
      },
    },
  },
  plugins: [],
}
