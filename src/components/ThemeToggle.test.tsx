import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { useAppStore } from '../state/store';

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ theme: 'dark' });
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeToggle', () => {
  it('toggles the theme in the store and on the document root', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: /switch to light/i }));
    expect(useAppStore.getState().theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    // toggling back
    await userEvent.click(screen.getByRole('button', { name: /switch to dark/i }));
    expect(useAppStore.getState().theme).toBe('dark');
  });
});
