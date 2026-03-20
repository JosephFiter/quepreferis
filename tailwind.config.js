/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base': 'var(--bg-base)',
        'panel': 'var(--bg-panel)',
        'primary': 'var(--color-primary)',
        'secondary': 'var(--color-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'border-color': 'var(--border-color)'
      },
    },
  },
  plugins: [],
}
