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

  describe('Search Suggestions', () => {
    it('should show suggestions when value is provided', () => {
      const onChange = vi.fn();
      const suggestions = ['delta-scope', 'delta-app', 'my-project'];
      const { lastFrame } = render(
        <FilterInput value="delta" onChange={onChange} suggestions={suggestions} />
      );

      const output = lastFrame();
      expect(output).toContain('Recent searches:');
      expect(output).toContain('delta-scope');
      expect(output).toContain('delta-app');
    });

    it('should not show suggestions when value is empty', () => {
      const onChange = vi.fn();
      const suggestions = ['delta-scope', 'delta-app'];
      const { lastFrame } = render(
        <FilterInput value="" onChange={onChange} suggestions={suggestions} />
      );

      expect(lastFrame()).not.toContain('Recent searches:');
    });

    it('should filter suggestions based on current value', () => {
      const onChange = vi.fn();
      const suggestions = ['delta-scope', 'my-project', 'delta-app'];
      const { lastFrame } = render(
        <FilterInput value="delta" onChange={onChange} suggestions={suggestions} />
      );

      const output = lastFrame();
      expect(output).toContain('delta-scope');
      expect(output).toContain('delta-app');
      expect(output).not.toContain('my-project');
    });

    it('should not show current value in suggestions', () => {
      const onChange = vi.fn();
      const suggestions = ['delta', 'delta-scope'];
      const { lastFrame } = render(
        <FilterInput value="delta" onChange={onChange} suggestions={suggestions} />
      );

      const output = lastFrame();
      // Should show delta-scope but not the exact match "delta"
      expect(output).toContain('delta-scope');
      // The "delta" text will appear in the input, but not as a suggestion
      const suggestionLines = output.split('\n').filter(line => line.includes('‣'));
      expect(suggestionLines).toHaveLength(1); // Only delta-scope
    });

    it('should limit suggestions to 5', () => {
      const onChange = vi.fn();
      const suggestions = ['proj1', 'proj2', 'proj3', 'proj4', 'proj5', 'proj6', 'proj7'];
      const { lastFrame } = render(
        <FilterInput value="proj" onChange={onChange} suggestions={suggestions} />
      );

      const output = lastFrame();
      const suggestionLines = output.split('\n').filter(line => line.includes('‣'));
      expect(suggestionLines.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty suggestions array', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(
        <FilterInput value="test" onChange={onChange} suggestions={[]} />
      );

      expect(lastFrame()).not.toContain('Recent searches:');
    });

    it('should handle undefined suggestions', () => {
      const onChange = vi.fn();
      const { lastFrame } = render(<FilterInput value="test" onChange={onChange} />);

      expect(lastFrame()).not.toContain('Recent searches:');
    });
  });
});
