import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Footer } from '../Footer.js';

describe('Footer', () => {
  it('should render keyboard shortcuts for home view', () => {
    const { lastFrame } = render(<Footer view="home" />);

    // All working shortcuts including new features
    const output = lastFrame();
    expect(output).toContain('↑/↓');
    expect(output).toContain('Enter');
    expect(output).toContain('d:');
    expect(output).toContain('f:');
    expect(output).toContain('/: Filter');
    expect(output).toContain('s:');
    expect(output).toContain('r:');
    expect(output).toContain('?:');
    expect(output).toContain('q:');
  });

  it('should show different message for help view', () => {
    const { lastFrame } = render(<Footer view="help" />);

    expect(lastFrame()).toContain('Press any key to return');
  });

  it('should render keyboard shortcuts for settings view', () => {
    const { lastFrame } = render(<Footer view="settings" />);

    // Settings view shows same shortcuts as home for now
    const output = lastFrame();
    expect(output).toContain('↑/↓');
    expect(output).toContain('f:');
    expect(output).toContain('/');
  });

  it('should render keyboard shortcuts for detail view', () => {
    const { lastFrame } = render(<Footer view="detail" />);

    // Detail view shows back shortcut
    expect(lastFrame()).toContain('Back');
    expect(lastFrame()).toContain('Esc/h');
  });
});
