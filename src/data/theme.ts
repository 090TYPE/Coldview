export type Theme = 'dark' | 'light';

const KEY = 'coldview:theme';

export function loadTheme(): Theme {
  return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme);
}

// Drives the CSS variables in index.css via the [data-theme] selector.
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
