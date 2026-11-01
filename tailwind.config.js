/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        minimal: {
          ink: '#0C0C09',
          surface: '#F4F4F1',
          secondary: '#312C85',
          border: '#E2E2DC',
          muted: '#6B6B66',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Open Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Inconsolata', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
