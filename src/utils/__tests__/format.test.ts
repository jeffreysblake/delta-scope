import { describe, it, expect } from 'vitest';
import {
  truncatePath,
  formatNumber,
  formatRelativeTime,
  formatCompactNumber,
  padString,
  progressBar,
  diffBar,
} from '../format.js';

describe('format utilities', () => {
  describe('truncatePath', () => {
    it('should not truncate paths shorter than maxWidth', () => {
      const path = '/home/user/project';
      expect(truncatePath(path, 50)).toBe(path);
    });

    it('should truncate long paths preserving first and last segments', () => {
      const path = '/media/decisiv/models/tooling/spiders/hrequests';
      const truncated = truncatePath(path, 40);
      expect(truncated).toContain('/media');
      expect(truncated).toContain('hrequests');
      expect(truncated).toContain('...');
      expect(truncated.length).toBeLessThanOrEqual(40);
    });

    it('should handle paths with few segments', () => {
      const path = '/home/user';
      expect(truncatePath(path, 5)).toBe('/h...');
    });

    it('should preserve parent directory when possible', () => {
      const path = '/media/decisiv/models/tooling/spiders/hrequests';
      const truncated = truncatePath(path, 50);
      expect(truncated).toContain('spiders');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with comma separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(42)).toBe('42');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "never" for null dates', () => {
      expect(formatRelativeTime(null)).toBe('never');
    });

    it('should return "just now" for recent times', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 mins ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hrs ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should handle singular forms', () => {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 min ago');
    });
  });

  describe('formatCompactNumber', () => {
    it('should not compact numbers under 1000', () => {
      expect(formatCompactNumber(500)).toBe('500');
    });

    it('should format thousands with K', () => {
      expect(formatCompactNumber(1500)).toBe('1.5K');
      expect(formatCompactNumber(10000)).toBe('10K');
    });

    it('should format millions with M', () => {
      expect(formatCompactNumber(1500000)).toBe('1.5M');
    });

    it('should remove trailing zeros', () => {
      expect(formatCompactNumber(2000)).toBe('2K');
    });
  });

  describe('padString', () => {
    it('should pad string to the right by default', () => {
      expect(padString('hi', 5)).toBe('hi   ');
    });

    it('should pad string to the left when specified', () => {
      expect(padString('hi', 5, 'right')).toBe('   hi');
    });

    it('should truncate strings longer than width', () => {
      expect(padString('hello world', 5)).toBe('hello');
    });
  });

  describe('progressBar', () => {
    it('should create a full bar for 100%', () => {
      expect(progressBar(1, 10)).toBe('██████████');
    });

    it('should create an empty bar for 0%', () => {
      expect(progressBar(0, 10)).toBe('░░░░░░░░░░');
    });

    it('should create a partial bar', () => {
      expect(progressBar(0.5, 10)).toBe('█████░░░░░');
    });
  });

  describe('diffBar', () => {
    it('should show all additions', () => {
      expect(diffBar(100, 0, 6)).toBe('▓▓▓▓▓▓');
    });

    it('should show all deletions', () => {
      expect(diffBar(0, 100, 6)).toBe('░░░░░░');
    });

    it('should show proportional mix', () => {
      expect(diffBar(50, 50, 6)).toBe('▓▓▓░░░');
    });

    it('should handle no changes', () => {
      expect(diffBar(0, 0, 6)).toBe('──────');
    });
  });
});
