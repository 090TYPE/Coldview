import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from './TopBar';

describe('TopBar view toggle', () => {
  it('switches to activity when the Activity tab is clicked', async () => {
    const onView = vi.fn();
    render(
      <TopBar wallets={[]} onAdd={vi.fn()} onRemove={vi.fn()} apiKey="" onApiKey={vi.fn()} view="portfolio" onView={onView} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /activity/i }));
    expect(onView).toHaveBeenCalledWith('activity');
  });
});
