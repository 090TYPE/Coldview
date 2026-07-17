/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070a0e',
        grid: '#0d141b',
        panel: '#0b1218',
        border: '#16212b',
        muted: '#566b7a',
        text: '#c9d4dc',
        neon: '#22e6a4',
        blue: '#3aa0ff',
        amber: '#ffb020',
        violet: '#8a5cff',
        danger: '#ff5c72',
      },
      fontFamily: {
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
