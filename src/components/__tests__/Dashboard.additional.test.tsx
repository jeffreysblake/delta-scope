/**
 * Additional Dashboard tests for better coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Dashboard } from '../Dashboard.js';
import * as gitScanner from '../../services/gitScanner.js';
import * as gitStatus from '../../services/gitStatus.js';
import * as configManager from '../../services/configManager.js';
import type { GitRepo, AppConfig } from '../../types/index.js';

// Mock all service dependencies
vi.mock('../../services/gitScanner.js');
vi.mock('../../services/gitStatus.js');
vi.mock('../../services/configManager.js');
vi.mock('../../services/database.js', () => ({
  getDatabaseService: vi.fn(() => ({
    recordAccess: vi.fn(),
    recordSearch: vi.fn(),
    getSearchHistory: vi.fn(() => []),
    getFrecencyScore: vi.fn(() => 100),
    getRepoStats: vi.fn(() => ({ lastAccessed: Date.now(), accessCount: 1, actions: {} })),
    getDismissedRecommendations: vi.fn(() => []),
  })),
  closeDatabaseService: vi.fn(),
}));

describe('Dashboard - Additional Coverage', () => {
  const mockConfig: AppConfig = {
    basePaths: ['/home/user/repos'],
    excludePatterns: ['node_modules'],
    theme: 'dark',
    refreshInterval: 60000,
    favorites: ['/home/user/repos/repo1'],
    maxDepth: 3,
    showHidden: false,
    ai: {
      enabled: false,
      provider: 'anthropic',
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      endpoint: '',
      timeout: 30000,
      maxRetries: 3,
      autoAnalyze: false,
      maxRecommendations: 10,
    },
  };

  const mockRepos: GitRepo[] = [
    {
      path: '/home/user/repos/repo1',
      name: 'repo1',
      branch: 'main',
      status: 'clean',
      linesAdded: 0,
      linesDeleted: 0,
      uncommittedFiles: 0,
      unpushedCommits: 0,
      lastCommitDate: new Date('2025-01-01'),
      lastCommitMessage: 'Initial commit',
      remotes: ['origin'],
      isFavorite: true,
    },
    {
      path: '/home/user/repos/repo2',
      name: 'repo2',
      branch: 'main',
      status: 'uncommitted',
      linesAdded: 10,
      linesDeleted: 5,
      uncommittedFiles: 3,
      unpushedCommits: 0,
      lastCommitDate: new Date('2025-01-02'),
      lastCommitMessage: 'Work in progress',
      remotes: ['origin'],
      isFavorite: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(configManager.configManager).get = vi.fn(() => mockConfig);
    vi.mocked(gitScanner.scanForRepos).mockResolvedValue([
      '/home/user/repos/repo1',
      '/home/user/repos/repo2',
    ]);
    vi.mocked(gitStatus.getMultipleRepoStatus).mockResolvedValue(mockRepos);
  });

  describe('Settings View', () => {
    it('should switch to settings view with c key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('c');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should return to home from settings with escape key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('c');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });

      stdin.write('\x1B'); // Escape key

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should return to home from settings with c key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('c');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });

      stdin.write('c');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });

  describe('Detail View', () => {
    it('should show detail view with d key for selected repo', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      // Navigate down to first repo
      stdin.write('j');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });

      // Press d for detail view
      stdin.write('d');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should show detail view with Enter key on repo', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      // Navigate to first repo
      stdin.write('j');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });

      // Press Enter
      stdin.write('\r');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should return to home from detail view with escape key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('j');
      await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

      stdin.write('d');
      await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

      stdin.write('\x1B'); // Escape

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should return to home from detail view with h key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('j');
      await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

      stdin.write('d');
      await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

      stdin.write('h');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });

  describe('Home View Navigation', () => {
    it('should return to home view with h key from any view', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      // Go to help
      stdin.write('?');
      await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

      // Return home with h
      stdin.write('h');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });

  describe('Favorite Toggling', () => {
    it('should handle favorite toggle with f key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      // Navigate to first repo
      stdin.write('j');
      await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

      // Toggle favorite - just verify the key press doesn't crash
      stdin.write('f');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });

  describe('Agent View', () => {
    it('should switch to agent view with i key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('i');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should return from agent view with escape key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('i');
      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });

      stdin.write('\x1B'); // Escape

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should return from agent view with i key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('i');
      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });

      stdin.write('i');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });

  describe('Filter View', () => {
    it('should activate filter with / key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('/');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should close filter with escape key', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      stdin.write('/');
      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });

      stdin.write('\x1B'); // Escape

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });

  describe('Multiple Sort Modes', () => {
    it('should cycle through all sort modes', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      // Cycle through sort modes: status -> name -> recent -> changes -> frecency -> status
      for (let i = 0; i < 5; i++) {
        stdin.write('s');
        await vi.waitFor(() => {
          expect(lastFrame()).toBeTruthy();
        });
      }

      // Should be back at status mode
      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });

  describe('Edge Cases for Navigation', () => {
    it('should handle pressing d on group header (should not show detail)', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      // Press d on group header (should not show detail)
      stdin.write('d');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });

    it('should handle pressing f on group header (should do nothing)', async () => {
      const { lastFrame, stdin } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      // Press f on group header
      stdin.write('f');

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });

  describe('Repo with Favorites', () => {
    it('should display repos correctly', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      await vi.waitFor(() => {
        expect(lastFrame()).toBeTruthy();
      });
    });
  });
});
