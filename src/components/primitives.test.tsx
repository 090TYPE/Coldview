import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel, Label, PrivacyNote } from './primitives';

describe('primitives', () => {
  it('Panel renders children', () => {
    render(<Panel><span>hi</span></Panel>);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });
  it('Label renders uppercase-styled text', () => {
    render(<Label>total</Label>);
    expect(screen.getByText('total')).toBeInTheDocument();
  });
  it('PrivacyNote states data stays local', () => {
    render(<PrivacyNote />);
    expect(screen.getByText(/never leave/i)).toBeInTheDocument();
  });
});
