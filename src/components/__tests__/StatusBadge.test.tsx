import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { StatusBadge } from '../StatusBadge.js';

describe('StatusBadge', () => {
  it('should render status symbol', () => {
    const { lastFrame } = render(<StatusBadge status="clean" />);
    expect(lastFrame()).toContain('✓');
  });

  it('should render status label when showLabel is true', () => {
    const { lastFrame } = render(<StatusBadge status="uncommitted" showLabel />);
    expect(lastFrame()).toContain('⚠');
    expect(lastFrame()).toContain('Uncommitted Changes');
  });

  it('should render count when provided', () => {
    const { lastFrame } = render(<StatusBadge status="unpushed" showLabel count={5} />);
    expect(lastFrame()).toContain('⬆');
    expect(lastFrame()).toContain('Unpushed Commits');
    expect(lastFrame()).toContain('(5 repos)');
  });

  it('should handle all status types', () => {
    const statuses: Array<'clean' | 'uncommitted' | 'unpushed' | 'both'> = [
      'clean',
      'uncommitted',
      'unpushed',
      'both',
    ];

    statuses.forEach((status) => {
      const { lastFrame } = render(<StatusBadge status={status} />);
      expect(lastFrame()).toBeTruthy();
    });
  });
});
