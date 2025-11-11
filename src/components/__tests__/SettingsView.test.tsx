import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { SettingsView } from '../SettingsView.js';
import type { AppConfig } from '../../types/index.js';

const mockConfig: AppConfig = {
  basePaths: ['/home/user/projects', '/home/user/git'],
  excludePatterns: [
    'node_modules',
    'dist',
    'build',
    '.venv',
    'venv',
    'target',
    '.cargo',
    '.npm',
    '.cache',
  ],
  theme: 'dark',
  refreshInterval: 60,
  favorites: ['/home/user/projects/delta-scope', '/home/user/projects/vibes-director'],
  maxDepth: 5,
  showHidden: false,
};

describe('SettingsView', () => {
  describe('Header', () => {
    it('should render Settings header', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      expect(lastFrame()).toContain('Settings');
    });
  });

  describe('General Section', () => {
    it('should render General section header', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      expect(lastFrame()).toContain('[General]');
    });

    it('should display all base paths', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('Base Paths:');
      expect(output).toContain('/home/user/projects');
      expect(output).toContain('/home/user/git');
    });

    it('should display first 5 exclude patterns', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('Exclude Patterns:');
      expect(output).toContain('node_modules');
      expect(output).toContain('dist');
      expect(output).toContain('build');
      expect(output).toContain('.venv');
      expect(output).toContain('venv');
    });

    it('should show truncation message for long exclude patterns', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('... and 4 more');
    });

    it('should not show truncation for short exclude patterns', () => {
      const shortConfig = {
        ...mockConfig,
        excludePatterns: ['node_modules', 'dist'],
      };
      const { lastFrame } = render(<SettingsView config={shortConfig} />);
      const output = lastFrame();
      expect(output).not.toContain('... and');
    });

    it('should display max depth', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('Max Depth:');
      expect(output).toContain('5');
    });

    it('should display show hidden setting', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('Show Hidden:');
      expect(output).toContain('No');
    });

    it('should display Yes for show hidden when true', () => {
      const configWithHidden = { ...mockConfig, showHidden: true };
      const { lastFrame } = render(<SettingsView config={configWithHidden} />);
      const output = lastFrame();
      expect(output).toContain('Show Hidden:');
      expect(output).toContain('Yes');
    });
  });

  describe('UI Section', () => {
    it('should render UI section header', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      expect(lastFrame()).toContain('[UI]');
    });

    it('should display theme', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('Theme:');
      expect(output).toContain('dark');
    });

    it('should display refresh interval', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('Refresh Interval:');
      expect(output).toContain('60s');
    });
  });

  describe('Favorites Section', () => {
    it('should render Favorites section header', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      expect(lastFrame()).toContain('[Favorites]');
      expect(lastFrame()).toContain('(Read-only)');
    });

    it('should display all favorites when <= 5', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('★');
      expect(output).toContain('/home/user/projects/delta-scope');
      expect(output).toContain('/home/user/projects/vibes-director');
    });

    it('should show empty message when no favorites', () => {
      const noFavConfig = { ...mockConfig, favorites: [] };
      const { lastFrame } = render(<SettingsView config={noFavConfig} />);
      const output = lastFrame();
      expect(output).toContain('No favorites yet');
    });

    it('should truncate favorites when > 5', () => {
      const manyFavs = Array.from({ length: 10 }, (_, i) => `/home/user/repo${i}`);
      const manyFavConfig = { ...mockConfig, favorites: manyFavs };
      const { lastFrame } = render(<SettingsView config={manyFavConfig} />);
      const output = lastFrame();
      expect(output).toContain('/home/user/repo0');
      expect(output).toContain('/home/user/repo4');
      expect(output).toContain('... and 5 more');
    });
  });

  describe('Footer', () => {
    it('should display close instructions when read-only', () => {
      const { lastFrame } = render(<SettingsView config={mockConfig} />);
      const output = lastFrame();
      expect(output).toContain('Press Escape or c to close');
    });

    it('should display edit shortcuts when onConfigChange provided', () => {
      const mockOnChange = vi.fn();
      const { lastFrame } = render(<SettingsView config={mockConfig} onConfigChange={mockOnChange} />);
      const output = lastFrame();
      expect(output).toContain('Press Escape or c to close');
      expect(output).toContain('d: MaxDepth');
      expect(output).toContain('i: Interval');
      expect(output).toContain('h: Hidden');
      expect(output).toContain('t: Theme');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single base path', () => {
      const singlePathConfig = { ...mockConfig, basePaths: ['/home/user/projects'] };
      const { lastFrame } = render(<SettingsView config={singlePathConfig} />);
      const output = lastFrame();
      expect(output).toContain('/home/user/projects');
    });

    it('should handle minimal config', () => {
      const minimalConfig: AppConfig = {
        basePaths: [],
        excludePatterns: [],
        theme: 'light',
        refreshInterval: 10,
        favorites: [],
        maxDepth: 1,
        showHidden: true,
      };
      const { lastFrame } = render(<SettingsView config={minimalConfig} />);
      const output = lastFrame();
      expect(output).toContain('Settings');
      expect(output).toContain('light');
      expect(output).toContain('10s');
      expect(output).toContain('Yes');
    });
  });
});
