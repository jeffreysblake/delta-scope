import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { DebugPanel } from '../DebugPanel.js';
import type { DebugInfo } from '../../types/index.js';

describe('DebugPanel', () => {
  const mockDebugInfo: DebugInfo = {
    view: 'home',
    selectedIndex: 5,
    repoCount: 42,
    filterActive: false,
    lastKeypress: 'r',
    renderTime: 15,
  };

  it('should render DEBUG MODE header', () => {
    const { lastFrame } = render(<DebugPanel info={mockDebugInfo} />);

    expect(lastFrame()).toContain('DEBUG MODE');
  });

  it('should display current view', () => {
    const { lastFrame } = render(<DebugPanel info={mockDebugInfo} />);

    expect(lastFrame()).toContain('View: home');
  });

  it('should display selected index', () => {
    const { lastFrame } = render(<DebugPanel info={mockDebugInfo} />);

    expect(lastFrame()).toContain('Selected Index: 5');
  });

  it('should display repo count', () => {
    const { lastFrame } = render(<DebugPanel info={mockDebugInfo} />);

    expect(lastFrame()).toContain('Repo Count: 42');
  });

  it('should display filter status', () => {
    const { lastFrame } = render(<DebugPanel info={mockDebugInfo} />);

    expect(lastFrame()).toContain('Filter Active: No');
  });

  it('should show filter active when true', () => {
    const activeFilterInfo = { ...mockDebugInfo, filterActive: true };
    const { lastFrame } = render(<DebugPanel info={activeFilterInfo} />);

    expect(lastFrame()).toContain('Filter Active: Yes');
  });

  it('should display last keypress', () => {
    const { lastFrame } = render(<DebugPanel info={mockDebugInfo} />);

    expect(lastFrame()).toContain('Last Keypress: r');
  });

  it('should handle empty last keypress', () => {
    const noKeypressInfo = { ...mockDebugInfo, lastKeypress: '' };
    const { lastFrame } = render(<DebugPanel info={noKeypressInfo} />);

    expect(lastFrame()).toContain('Last Keypress: none');
  });

  it('should display render time', () => {
    const { lastFrame } = render(<DebugPanel info={mockDebugInfo} />);

    expect(lastFrame()).toContain('Render Time: 15ms');
  });
});
