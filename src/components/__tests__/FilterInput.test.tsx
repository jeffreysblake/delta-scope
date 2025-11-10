import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { FilterInput } from '../FilterInput.js';

describe('FilterInput', () => {
  describe('Rendering', () => {
    it('should render with empty value', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(<FilterInput value="" onChange={onChange} />);

      expect(lastFrame()).toContain('Filter:');
    });

    it('should render with provided value', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(<FilterInput value="test" onChange={onChange} />);

      expect(lastFrame()).toContain('Filter:');
      expect(lastFrame()).toContain('test');
    });

    it('should show match count when provided', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(
        <FilterInput value="test" onChange={onChange} matchCount={5} totalCount={10} />
      );

      expect(lastFrame()).toContain('Showing 5 of 10 repositories');
    });

    it('should not show match count when not provided', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(<FilterInput value="test" onChange={onChange} />);

      expect(lastFrame()).not.toContain('Showing');
      expect(lastFrame()).not.toContain('repositories');
    });
  });

  describe('Edge Cases', () => {
    it('should show 0 matches correctly', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(
        <FilterInput value="xyz" onChange={onChange} matchCount={0} totalCount={10} />
      );

      expect(lastFrame()).toContain('Showing 0 of 10 repositories');
    });

    it('should show all matches when filter matches everything', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(
        <FilterInput value="" onChange={onChange} matchCount={10} totalCount={10} />
      );

      expect(lastFrame()).toContain('Showing 10 of 10 repositories');
    });
  });

  describe('Props', () => {
    it('should accept onChange handler', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(<FilterInput value="" onChange={onChange} />);

      // Verify component renders with onChange prop
      expect(lastFrame()).toContain('Filter:');
      expect(onChange).toBeInstanceOf(Function);
    });

    it('should accept optional onSubmit handler', () => {
      const onChange = vi.fn();
      const onSubmit = vi.fn();
      const { lastFrame } = render(<FilterInput value="test" onChange={onChange} onSubmit={onSubmit} />);

      // Verify component renders with onSubmit prop
      expect(lastFrame()).toContain('Filter:');
      expect(onSubmit).toBeInstanceOf(Function);
    });
  });
});
