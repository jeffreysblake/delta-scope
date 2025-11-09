import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Footer } from '../Footer.js';

describe('Footer', () => {
  it('should render keyboard shortcuts for home view', () => {
    const { lastFrame } = render(<Footer view="home" />);

    expect(lastFrame()).toContain('Navigate');
    expect(lastFrame()).toContain('Expand');
    expect(lastFrame()).toContain('Filter');
    expect(lastFrame()).toContain('Sort');
    expect(lastFrame()).toContain('Favorite');
    expect(lastFrame()).toContain('Details');
    expect(lastFrame()).toContain('Refresh');
    expect(lastFrame()).toContain('Help');
    expect(lastFrame()).toContain('Quit');
  });

  it('should show different message for help view', () => {
    const { lastFrame } = render(<Footer view="help" />);

    expect(lastFrame()).toContain('Press any key to return');
  });

  it('should render keyboard shortcuts for settings view', () => {
    const { lastFrame } = render(<Footer view="settings" />);

    // Settings view shows same shortcuts as home for now
    expect(lastFrame()).toContain('Navigate');
  });

  it('should render keyboard shortcuts for detail view', () => {
    const { lastFrame } = render(<Footer view="detail" />);

    // Detail view shows same shortcuts as home for now
    expect(lastFrame()).toContain('Navigate');
  });
});
