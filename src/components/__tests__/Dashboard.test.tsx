import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Dashboard } from '../Dashboard.js';
import * as gitScanner from '../../services/gitScanner.js';
import * as gitStatus from '../../services/gitStatus.js';
import * as configManager from '../../services/configManager.js';
import type { GitRepo, AppConfig } from '../../types/index.js';

// Mock useInput hook to avoid stdin.ref issues in tests
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(), // Mock useInput to do nothing in tests
  };
});

// Mock all service dependencies
vi.mock('../../services/gitScanner.js');
vi.mock('../../services/gitStatus.js');
vi.mock('../../services/configManager.js');

describe('Dashboard', () => {
  const mockConfig: AppConfig = {
    basePaths: ['/home/user/repos'],
    excludePatterns: ['node_modules', '.git'],
    theme: 'dark',
    refreshInterval: 60000,
    favorites: [],
    maxDepth: 3,
    showHidden: false,
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
      isFavorite: false,
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
      lastCommitMessage: 'Add feature',
      remotes: ['origin'],
      isFavorite: false,
    },
    {
      path: '/home/user/repos/repo3',
      name: 'repo3',
      branch: 'dev',
      status: 'unpushed',
      linesAdded: 20,
      linesDeleted: 10,
      uncommittedFiles: 0,
      unpushedCommits: 2,
      lastCommitDate: new Date('2025-01-03'),
      lastCommitMessage: 'Bug fix',
      remotes: ['origin'],
      isFavorite: false,
    },
    {
      path: '/home/user/repos/repo4',
      name: 'repo4',
      branch: 'feature',
      status: 'both',
      linesAdded: 15,
      linesDeleted: 8,
      uncommittedFiles: 2,
      unpushedCommits: 1,
      lastCommitDate: new Date('2025-01-04'),
      lastCommitMessage: 'WIP',
      remotes: ['origin'],
      isFavorite: true,
    },
  ];

  beforeEach(() => {
    // Setup default mocks
    vi.mocked(configManager.configManager.get).mockReturnValue(mockConfig);
    vi.mocked(gitScanner.scanForRepos).mockResolvedValue([
      '/home/user/repos/repo1',
      '/home/user/repos/repo2',
      '/home/user/repos/repo3',
      '/home/user/repos/repo4',
    ]);
    vi.mocked(gitStatus.getMultipleRepoStatus).mockResolvedValue(mockRepos);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should show loading state initially', () => {
      const { lastFrame } = render(<Dashboard />);
      expect(lastFrame()).toContain('Loading repositories');
    });

    it('should render header with zero repos during loading', () => {
      const { lastFrame } = render(<Dashboard />);
      expect(lastFrame()).toContain('delta-scope');
      expect(lastFrame()).toContain('0 repos');
    });

    it('should render footer during loading', () => {
      const { lastFrame } = render(<Dashboard />);
      expect(lastFrame()).toContain('Navigate');
      expect(lastFrame()).toContain('Quit');
    });
  });

  describe('Successful Repo Loading', () => {
    it('should display repos after loading completes', async () => {
      const { lastFrame } = render(<Dashboard />);

      // Wait for async loading to complete
      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain('Loading repositories');
      });

      // repo2 and repo4 are visible (in expanded groups)
      // repo1 and repo3 are in collapsed groups
      expect(lastFrame()).toContain('repo2');
      expect(lastFrame()).toContain('repo4');
      expect(lastFrame()).toContain('4 repos');  // Check total count
    });

    it('should call scanForRepos with config', async () => {
      render(<Dashboard />);

      await vi.waitFor(() => {
        expect(gitScanner.scanForRepos).toHaveBeenCalledWith(mockConfig);
      });
    });

    it('should call getMultipleRepoStatus with scanned paths', async () => {
      render(<Dashboard />);

      await vi.waitFor(() => {
        expect(gitStatus.getMultipleRepoStatus).toHaveBeenCalledWith([
          '/home/user/repos/repo1',
          '/home/user/repos/repo2',
          '/home/user/repos/repo3',
          '/home/user/repos/repo4',
        ]);
      });
    });

    it('should display total repo count in header', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('4 repos');
      });
    });

    it('should display needs attention count', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        // repo2 (uncommitted) + repo4 (both) = 2 repos need attention
        expect(lastFrame()).toContain('2 need attention');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when scanning fails', async () => {
      vi.mocked(gitScanner.scanForRepos).mockRejectedValue(
        new Error('Permission denied')
      );

      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Error: Permission denied');
      });
    });

    it('should display error message when status check fails', async () => {
      vi.mocked(gitStatus.getMultipleRepoStatus).mockRejectedValue(
        new Error('Git not found')
      );

      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Error: Git not found');
      });
    });

    it('should handle unknown error types', async () => {
      vi.mocked(gitScanner.scanForRepos).mockRejectedValue('String error');

      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Error: Unknown error');
      });
    });
  });

  describe('Grouping and Sorting', () => {
    it('should group repos by status', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        // Should have all 4 status groups
        expect(output).toContain('⚡');  // both
        expect(output).toContain('⚠');   // uncommitted
        expect(output).toContain('⬆');   // unpushed
        expect(output).toContain('✓');   // clean
      });
    });

    it('should expand both and uncommitted groups by default', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        // Check that groups show expanded state
        expect(output).toContain('expanded');
      });
    });

    it('should show correct repo counts for each group', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        // both: 1 repo (repo4)
        // uncommitted: 1 repo (repo2)
        // unpushed: 1 repo (repo3)
        // clean: 1 repo (repo1)
        expect(output).toContain('1 repos');  // Format is "1 repos" not "(1)"
      });
    });

    it('should show repos from expanded groups', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        // Both and uncommitted groups are expanded by default
        // So their repos should be visible
        expect(output).toContain('repo2');  // in uncommitted group
        expect(output).toContain('repo4');  // in both group
      });
    });

    it('should show collapsed state for unpushed and clean groups', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        // unpushed and clean groups are collapsed by default
        expect(output).toContain('collapsed');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty repo list', async () => {
      vi.mocked(gitScanner.scanForRepos).mockResolvedValue([]);
      vi.mocked(gitStatus.getMultipleRepoStatus).mockResolvedValue([]);

      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('0 repos');
        expect(lastFrame()).toContain('0 need attention');
      });
    });

    it('should handle repos with no last commit', async () => {
      // Use uncommitted status so the group is expanded by default
      const reposWithoutCommits: GitRepo[] = [
        {
          ...mockRepos[1], // repo2 with uncommitted status
          lastCommitDate: null,
          lastCommitMessage: null,
        },
      ];

      vi.mocked(gitStatus.getMultipleRepoStatus).mockResolvedValue(
        reposWithoutCommits
      );

      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('repo2');  // repo2 is in uncommitted (expanded)
      });
    });

    it('should handle single status group', async () => {
      // Use 'both' status so repos are visible (group expanded by default)
      const singleStatusRepos: GitRepo[] = [
        { ...mockRepos[3], name: 'repo-both-1' },
        { ...mockRepos[3], name: 'repo-both-2', path: '/home/user/repos/repo-both-2' },
      ];

      vi.mocked(gitStatus.getMultipleRepoStatus).mockResolvedValue(
        singleStatusRepos
      );

      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        expect(output).toContain('⚡');  // both status
        expect(output).toContain('2 repos');
        expect(output).toContain('repo-both-1');  // Repos visible in expanded group
      });
    });

    it('should handle repos with very long names', async () => {
      const longNameRepo: GitRepo = {
        ...mockRepos[1], // Use uncommitted status so group is expanded
        name: 'a-very-long-repository-name-that-might-cause-wrapping-issues-in-the-terminal',
      };

      vi.mocked(gitStatus.getMultipleRepoStatus).mockResolvedValue([
        longNameRepo,
      ]);

      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('a-very-long-repository-name');
      });
    });
  });

  describe('Service Integration', () => {
    it('should handle slow repository scanning', async () => {
      vi.mocked(gitScanner.scanForRepos).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(['/home/user/repos/repo2']), 50))
      );
      vi.mocked(gitStatus.getMultipleRepoStatus).mockResolvedValue([mockRepos[1]]); // uncommitted (expanded)

      const { lastFrame } = render(<Dashboard />);

      // Should show loading initially
      expect(lastFrame()).toContain('Loading repositories');

      // Wait for loading to complete
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('repo2');  // repo2 is visible in expanded group
      });
    });

    it('should handle slow status checking', async () => {
      vi.mocked(gitStatus.getMultipleRepoStatus).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([mockRepos[3]]), 50))  // both (expanded)
      );

      const { lastFrame } = render(<Dashboard />);

      // Should show loading initially
      expect(lastFrame()).toContain('Loading repositories');

      // Wait for loading to complete
      await vi.waitFor(() => {
        const output = lastFrame();
        expect(output).toContain('1 repos');  // Check count instead since repos are visible
        expect(output).toContain('⚡');  // both status symbol
      });
    });
  });

  describe('Display States', () => {
    it('should show different status symbols correctly', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        expect(output).toContain('⚡');  // both
        expect(output).toContain('⚠');   // uncommitted
        expect(output).toContain('⬆');   // unpushed
        expect(output).toContain('✓');   // clean
      });
    });

    it('should display repo metadata correctly', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        // Check for repo names
        expect(output).toContain('repo2');
        expect(output).toContain('repo4');
      });
    });
  });

  describe('Component Structure', () => {
    it('should render Header component', () => {
      const { lastFrame } = render(<Dashboard />);
      expect(lastFrame()).toContain('delta-scope');
    });

    it('should render Footer component', () => {
      const { lastFrame } = render(<Dashboard />);
      expect(lastFrame()).toContain('Navigate');
    });

    it('should render RepoList after loading', async () => {
      const { lastFrame } = render(<Dashboard />);

      await vi.waitFor(() => {
        const output = lastFrame();
        // RepoList should show status badges
        expect(output).toMatch(/⚡|⚠|⬆|✓/);
      });
    });

    it('should not render DebugPanel by default', () => {
      const { lastFrame } = render(<Dashboard />);
      const output = lastFrame();
      // Debug panel only shows in DEV mode
      expect(output).not.toContain('selectedIndex');
    });
  });
});
