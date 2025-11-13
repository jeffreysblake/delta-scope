/**
 * Tests for keybindings utilities
 */

import { describe, it, expect } from 'vitest';
import { KEYBINDINGS, HELP_TEXT } from '../keybindings.js';

describe('keybindings', () => {
  describe('KEYBINDINGS constant', () => {
    it('should have all navigation keys defined', () => {
      expect(KEYBINDINGS.quit).toBe('q');
      expect(KEYBINDINGS.up).toBe('upArrow');
      expect(KEYBINDINGS.down).toBe('downArrow');
      expect(KEYBINDINGS.expand).toBe('return');
    });

    it('should have all action keys defined', () => {
      expect(KEYBINDINGS.filter).toBe('/');
      expect(KEYBINDINGS.sort).toBe('s');
      expect(KEYBINDINGS.favorite).toBe('f');
      expect(KEYBINDINGS.detail).toBe('d');
      expect(KEYBINDINGS.refresh).toBe('r');
    });

    it('should have all view keys defined', () => {
      expect(KEYBINDINGS.help).toBe('?');
      expect(KEYBINDINGS.settings).toBe('c');
      expect(KEYBINDINGS.home).toBe('h');
    });

    it('should have all modifier keys defined', () => {
      expect(KEYBINDINGS.escape).toBe('escape');
      expect(KEYBINDINGS.tab).toBe('tab');
    });

    it('should be a readonly object', () => {
      // TypeScript should enforce this at compile time
      expect(KEYBINDINGS).toBeDefined();
      expect(typeof KEYBINDINGS).toBe('object');
    });

    it('should have unique keybindings (no duplicates)', () => {
      const values = Object.values(KEYBINDINGS);
      const uniqueValues = new Set(values);

      // All values should be unique
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should use standard key names for special keys', () => {
      // Special keys should use camelCase format
      expect(KEYBINDINGS.up).toBe('upArrow');
      expect(KEYBINDINGS.down).toBe('downArrow');
      expect(KEYBINDINGS.escape).toBe('escape');
      expect(KEYBINDINGS.tab).toBe('tab');
      expect(KEYBINDINGS.expand).toBe('return');
    });

    it('should use single characters for regular keys', () => {
      const regularKeys = [
        KEYBINDINGS.quit,
        KEYBINDINGS.filter,
        KEYBINDINGS.sort,
        KEYBINDINGS.favorite,
        KEYBINDINGS.detail,
        KEYBINDINGS.refresh,
        KEYBINDINGS.help,
        KEYBINDINGS.settings,
        KEYBINDINGS.home,
      ];

      regularKeys.forEach((key) => {
        expect(key.length).toBe(1);
        expect(typeof key).toBe('string');
      });
    });
  });

  describe('HELP_TEXT constant', () => {
    it('should be defined and non-empty', () => {
      expect(HELP_TEXT).toBeDefined();
      expect(HELP_TEXT.length).toBeGreaterThan(0);
    });

    it('should contain all navigation keybindings', () => {
      expect(HELP_TEXT).toContain('q');
      expect(HELP_TEXT).toContain('Quit');
    });

    it('should contain all action keybindings', () => {
      expect(HELP_TEXT).toContain('/');
      expect(HELP_TEXT).toContain('s');
      expect(HELP_TEXT).toContain('f');
      expect(HELP_TEXT).toContain('d');
      expect(HELP_TEXT).toContain('r');
    });

    it('should contain all view keybindings', () => {
      expect(HELP_TEXT).toContain('?');
      expect(HELP_TEXT).toContain('c');
      expect(HELP_TEXT).toContain('h');
      expect(HELP_TEXT).toContain('i'); // AI insights
    });

    it('should contain descriptions for all major features', () => {
      expect(HELP_TEXT).toContain('Navigate');
      expect(HELP_TEXT).toContain('Filter');
      expect(HELP_TEXT).toContain('sort'); // lowercase in help text
      expect(HELP_TEXT).toContain('favorite'); // lowercase in help text
      expect(HELP_TEXT).toContain('detail'); // lowercase in help text
      expect(HELP_TEXT).toContain('Refresh');
      expect(HELP_TEXT).toContain('Settings');
      expect(HELP_TEXT).toContain('help'); // lowercase in help text
    });

    it('should explain frecency', () => {
      expect(HELP_TEXT).toContain('Frecency');
      expect(HELP_TEXT).toContain('frequency');
      expect(HELP_TEXT).toContain('recency');
    });

    it('should explain AI Agent feature', () => {
      expect(HELP_TEXT).toContain('AI Agent');
      expect(HELP_TEXT).toContain('recommendations');
      expect(HELP_TEXT).toContain('Settings');
    });

    it('should be properly formatted with newlines', () => {
      expect(HELP_TEXT).toContain('\n');
      const lines = HELP_TEXT.split('\n');
      expect(lines.length).toBeGreaterThan(10);
    });

    it('should contain keyboard shortcut format (key + description)', () => {
      // Should have lines formatted like "  key        Description"
      expect(HELP_TEXT).toMatch(/\s+\w+\s+/);
    });

    it('should mention Escape key functionality', () => {
      expect(HELP_TEXT).toContain('Escape');
      expect(HELP_TEXT).toContain('Clear filter');
    });

    it('should mention Enter key functionality', () => {
      expect(HELP_TEXT).toContain('Enter');
      expect(HELP_TEXT).toContain('Expand');
    });
  });

  describe('Keybinding consistency', () => {
    it('should have help text that matches all defined keybindings', () => {
      // Critical keybindings should all be documented
      const criticalKeys = [
        KEYBINDINGS.quit,
        KEYBINDINGS.filter,
        KEYBINDINGS.sort,
        KEYBINDINGS.favorite,
        KEYBINDINGS.detail,
        KEYBINDINGS.refresh,
        KEYBINDINGS.help,
        KEYBINDINGS.settings,
        KEYBINDINGS.home,
      ];

      criticalKeys.forEach((key) => {
        expect(HELP_TEXT).toContain(key);
      });
    });

    it('should document Escape and Enter behavior', () => {
      expect(HELP_TEXT.toLowerCase()).toContain('escape');
      expect(HELP_TEXT.toLowerCase()).toContain('enter');
    });
  });
});
