import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { HelpView } from '../HelpView.js';

describe('HelpView', () => {
  it('should render help title', () => {
    const { lastFrame } = render(<HelpView />);

    expect(lastFrame()).toContain('delta-scope Help');
  });

  it('should render keyboard shortcuts', () => {
    const { lastFrame } = render(<HelpView />);

    const output = lastFrame();

    // Check for main shortcuts
    expect(output).toContain('Navigate');
    expect(output).toContain('Expand');
    expect(output).toContain('Filter');
    expect(output).toContain('Sort');
    expect(output).toContain('Favorite');
    expect(output).toContain('Details');
    expect(output).toContain('Refresh');
    expect(output).toContain('Quit');
  });

  it('should show return instructions', () => {
    const { lastFrame } = render(<HelpView />);

    expect(lastFrame()).toContain('Press any key to return');
  });

  it('should explain sort modes', () => {
    const { lastFrame } = render(<HelpView />);

    expect(lastFrame()).toContain('name');
    expect(lastFrame()).toContain('status');
    expect(lastFrame()).toContain('recent');
    expect(lastFrame()).toContain('changes');
  });
});
