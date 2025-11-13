/**
 * Tests for color utilities
 */

import { describe, it, expect } from 'vitest';
import {
  COLORS,
  STATUS_SYMBOLS,
  STATUS_LABELS,
  getStatusColor,
  getStatusSymbol,
  getStatusLabel,
} from '../colors.js';
import type { RepoStatus } from '../../types/index.js';

describe('colors', () => {
  describe('COLORS constant', () => {
    it('should have all status colors defined', () => {
      expect(COLORS.clean).toBe('green');
      expect(COLORS.uncommitted).toBe('yellow');
      expect(COLORS.unpushed).toBe('blue');
      expect(COLORS.both).toBe('red');
    });

    it('should have all UI element colors defined', () => {
      expect(COLORS.border).toBe('cyan');
      expect(COLORS.header).toBe('magenta');
      expect(COLORS.text).toBe('white');
      expect(COLORS.dimmed).toBe('gray');
      expect(COLORS.highlight).toBe('cyan');
      expect(COLORS.error).toBe('red');
      expect(COLORS.warning).toBe('yellow');
      expect(COLORS.success).toBe('green');
    });

    it('should have favorite color defined', () => {
      expect(COLORS.favorite).toBe('magenta');
    });

    it('should be a readonly object', () => {
      // TypeScript should enforce this at compile time
      expect(COLORS).toBeDefined();
      expect(typeof COLORS).toBe('object');
    });
  });

  describe('STATUS_SYMBOLS constant', () => {
    it('should have symbols for all statuses', () => {
      expect(STATUS_SYMBOLS.clean).toBe('✓');
      expect(STATUS_SYMBOLS.uncommitted).toBe('⚠');
      expect(STATUS_SYMBOLS.unpushed).toBe('⬆');
      expect(STATUS_SYMBOLS.both).toBe('⚡');
    });

    it('should return unicode symbols', () => {
      Object.values(STATUS_SYMBOLS).forEach((symbol) => {
        expect(symbol).toBeTruthy();
        expect(typeof symbol).toBe('string');
        expect(symbol.length).toBeGreaterThan(0);
      });
    });
  });

  describe('STATUS_LABELS constant', () => {
    it('should have labels for all statuses', () => {
      expect(STATUS_LABELS.clean).toBe('All Clean');
      expect(STATUS_LABELS.uncommitted).toBe('Uncommitted Changes');
      expect(STATUS_LABELS.unpushed).toBe('Unpushed Commits');
      expect(STATUS_LABELS.both).toBe('Uncommitted + Unpushed');
    });

    it('should return descriptive labels', () => {
      Object.values(STATUS_LABELS).forEach((label) => {
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for clean status', () => {
      expect(getStatusColor('clean')).toBe('green');
    });

    it('should return correct color for uncommitted status', () => {
      expect(getStatusColor('uncommitted')).toBe('yellow');
    });

    it('should return correct color for unpushed status', () => {
      expect(getStatusColor('unpushed')).toBe('blue');
    });

    it('should return correct color for both status', () => {
      expect(getStatusColor('both')).toBe('red');
    });

    it('should handle all valid RepoStatus values', () => {
      const statuses: RepoStatus[] = ['clean', 'uncommitted', 'unpushed', 'both'];
      statuses.forEach((status) => {
        const color = getStatusColor(status);
        expect(color).toBeTruthy();
        expect(typeof color).toBe('string');
      });
    });
  });

  describe('getStatusSymbol', () => {
    it('should return correct symbol for clean status', () => {
      expect(getStatusSymbol('clean')).toBe('✓');
    });

    it('should return correct symbol for uncommitted status', () => {
      expect(getStatusSymbol('uncommitted')).toBe('⚠');
    });

    it('should return correct symbol for unpushed status', () => {
      expect(getStatusSymbol('unpushed')).toBe('⬆');
    });

    it('should return correct symbol for both status', () => {
      expect(getStatusSymbol('both')).toBe('⚡');
    });

    it('should handle all valid RepoStatus values', () => {
      const statuses: RepoStatus[] = ['clean', 'uncommitted', 'unpushed', 'both'];
      statuses.forEach((status) => {
        const symbol = getStatusSymbol(status);
        expect(symbol).toBeTruthy();
        expect(typeof symbol).toBe('string');
      });
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct label for clean status', () => {
      expect(getStatusLabel('clean')).toBe('All Clean');
    });

    it('should return correct label for uncommitted status', () => {
      expect(getStatusLabel('uncommitted')).toBe('Uncommitted Changes');
    });

    it('should return correct label for unpushed status', () => {
      expect(getStatusLabel('unpushed')).toBe('Unpushed Commits');
    });

    it('should return correct label for both status', () => {
      expect(getStatusLabel('both')).toBe('Uncommitted + Unpushed');
    });

    it('should handle all valid RepoStatus values', () => {
      const statuses: RepoStatus[] = ['clean', 'uncommitted', 'unpushed', 'both'];
      statuses.forEach((status) => {
        const label = getStatusLabel(status);
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should return descriptive human-readable labels', () => {
      const statuses: RepoStatus[] = ['clean', 'uncommitted', 'unpushed', 'both'];
      statuses.forEach((status) => {
        const label = getStatusLabel(status);
        // Labels should be capitalized and contain spaces or be single words
        expect(label).toMatch(/^[A-Z]/);
      });
    });
  });
});
