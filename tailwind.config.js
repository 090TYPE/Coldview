/** @type {import('tailwindcss').Config} */

// Colors reference CSS variables (see src/index.css) so a single [data-theme]
// switch re-themes the whole app. The rgb(var(--x) / <alpha-value>) form keeps
// Tailwind opacity modifiers (e.g. bg-neon/10) working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        grid: token('grid'),
        panel: token('panel'),
        border: token('border'),
        muted: token('muted'),
        text: token('text'),
        heading: token('heading'),
        row: token('row'),
        neon: token('neon'),
        blue: token('blue'),
        amber: token('amber'),
        violet: token('violet'),
        danger: token('danger'),
      },
      fontFamily: {
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
