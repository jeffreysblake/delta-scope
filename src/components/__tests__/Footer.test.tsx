import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Footer } from '../Footer.js';

describe('Footer', () => {

  it('should render keyboard shortcuts for home view', () => {
    const { lastFrame } = render(<Footer view="home" />);

    // Check key shortcuts are present (may be truncated due to terminal width)
    const output = lastFrame();
    expect(output).toContain('↑');
    expect(output).toContain('Enter');
    expect(output).toContain('d');
    expect(output).toContain('f');
    expect(output).toContain('/');
    expect(output).toContain('s');
    expect(output).toContain('r');
    expect(output).toContain('?');
    expect(output).toContain('q');
  });

  it('should show different message for help view', () => {
    const { lastFrame } = render(<Footer view="help" />);

    expect(lastFrame()).toContain('Press any key to return');
  });

  it('should render keyboard shortcuts for settings view', () => {
    const { lastFrame } = render(<Footer view="settings" />);

    // Settings view shows close shortcuts
    const output = lastFrame();
    expect(output).toContain('Esc/c');
    expect(output).toContain('Editing coming soon');
  });

  it('should render keyboard shortcuts for detail view', () => {
    const { lastFrame } = render(<Footer view="detail" />);

    // Detail view shows back shortcut
    const output = lastFrame();
    expect(output).toContain('Back');
    expect(output).toContain('Esc/h');
  });

  it('should render keyboard shortcuts for agent view', () => {
    const { lastFrame } = render(<Footer view="agent" />);

    const output = lastFrame();
    expect(output).toContain('Navigate');
    expect(output).toContain('Expand');
  });
});
