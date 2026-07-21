import { useAppStore } from '../state/store';

export function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className="text-[13px] w-8 h-8 rounded-full border border-border text-muted hover:border-neon hover:text-neon"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
