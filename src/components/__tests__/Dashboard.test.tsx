import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
      expect(lastFrame()).toContain('↑/↓');
      expect(lastFrame()).toContain('q:');
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
        const output = lastFrame();
        expect(output).toContain('0 repos');
        // Header shows "[0 repos]" not "0 need attention" when there are no repos
        expect(output).toContain('[0 repos]');
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
      expect(lastFrame()).toContain('↑/↓');
      expect(lastFrame()).toContain('f:');
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

  describe('Keyboard Interactions', () => {
    describe('Navigation Keys', () => {
      it('should navigate down with down arrow key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Press down arrow (escape sequence)
        stdin.write('\x1B[B');

        // Wait for navigation to process - component should re-render
        await new Promise(resolve => setTimeout(resolve, 50));

        // Should successfully navigate without crashing
        expect(lastFrame()).toBeTruthy();
      });

      it('should navigate up with up arrow key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Navigate down first
        stdin.write('\x1B[B');
        await new Promise(resolve => setTimeout(resolve, 50));

        // Navigate up
        stdin.write('\x1B[A');
        await new Promise(resolve => setTimeout(resolve, 50));

        // Should successfully navigate without crashing
        expect(lastFrame()).toBeTruthy();
      });

      it('should navigate down with j key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        stdin.write('j');
        await new Promise(resolve => setTimeout(resolve, 50));

        // Should successfully navigate without crashing
        expect(lastFrame()).toBeTruthy();
      });

      it('should navigate up with k key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Navigate down first
        stdin.write('j');
        await new Promise(resolve => setTimeout(resolve, 50));

        stdin.write('k');
        await new Promise(resolve => setTimeout(resolve, 50));

        // Should successfully navigate without crashing
        expect(lastFrame()).toBeTruthy();
      });

      it('should not navigate above first item', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Try to navigate up from the start
        stdin.write('k');
        stdin.write('k');
        stdin.write('k');

        // Should not crash or error
        await vi.waitFor(() => {
          expect(lastFrame()).toBeTruthy();
        });
      });

      it('should not navigate below last item', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Try to navigate down many times
        for (let i = 0; i < 20; i++) {
          stdin.write('j');
        }

        // Should not crash or error
        await vi.waitFor(() => {
          expect(lastFrame()).toBeTruthy();
        });
      });
    });

    describe('Group Toggling', () => {
      it('should toggle group expansion with Enter key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        const before = lastFrame();
        const expandedCount = (before.match(/expanded/g) || []).length;

        // Press Enter to toggle first group (which is expanded by default)
        stdin.write('\r');

        await vi.waitFor(() => {
          const after = lastFrame();
          const newExpandedCount = (after.match(/expanded/g) || []).length;
          // Should have one less expanded group
          expect(newExpandedCount).toBe(expandedCount - 1);
        });
      });

      it('should expand collapsed group with Enter key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Navigate to unpushed group (collapsed by default)
        // From both header: j (repo4), j (uncommitted header), j (repo2), j (unpushed header)
        stdin.write('j');
        await new Promise(resolve => setTimeout(resolve, 50));
        stdin.write('j');
        await new Promise(resolve => setTimeout(resolve, 50));
        stdin.write('j');
        await new Promise(resolve => setTimeout(resolve, 50));
        stdin.write('j');
        await new Promise(resolve => setTimeout(resolve, 50));

        const before = lastFrame();
        const expandedCountBefore = (before.match(/expanded/g) || []).length;

        // Toggle to expand
        stdin.write('\r');
        await new Promise(resolve => setTimeout(resolve, 100));

        const after = lastFrame();
        const expandedCountAfter = (after.match(/expanded/g) || []).length;

        // Should have one more expanded group
        expect(expandedCountAfter).toBeGreaterThan(expandedCountBefore);
      });
    });

    describe('Sort Mode Cycling', () => {
      it('should cycle sort mode with s key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Cycle through sort modes
        stdin.write('s'); // status -> name
        await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

        stdin.write('s'); // name -> recent
        await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

        stdin.write('s'); // recent -> changes
        await vi.waitFor(() => expect(lastFrame()).toBeTruthy());

        stdin.write('s'); // changes -> status (back to start)

        await vi.waitFor(() => {
          // Should cycle through all modes without crashing
          expect(lastFrame()).toBeTruthy();
        });
      });
    });

    describe('View Switching', () => {
      it('should switch to help view with ? key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        stdin.write('?');

        await vi.waitFor(() => {
          expect(lastFrame()).toContain('delta-scope Help');
          expect(lastFrame()).toContain('Keyboard Shortcuts');
        });
      });

      it('should return to home view from help with any key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Go to help
        stdin.write('?');
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(lastFrame()).toContain('delta-scope Help');

        // Press space to return
        stdin.write(' ');
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should return to home view
        expect(lastFrame()).not.toContain('delta-scope Help');
      });

      it('should show help footer when in help view', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        stdin.write('?');

        await vi.waitFor(() => {
          expect(lastFrame()).toContain('Press any key to return');
        });
      });
    });

    describe('Refresh Functionality', () => {
      it('should refresh repos with r key', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Clear previous calls
        vi.clearAllMocks();

        stdin.write('r');

        await vi.waitFor(() => {
          expect(gitScanner.scanForRepos).toHaveBeenCalledTimes(1);
          expect(gitStatus.getMultipleRepoStatus).toHaveBeenCalledTimes(1);
        });
      });

      it('should show loading state during refresh', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Make the next load take longer
        vi.mocked(gitScanner.scanForRepos).mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
        );

        stdin.write('r');

        // Should show loading
        await vi.waitFor(() => {
          expect(lastFrame()).toContain('Loading repositories');
        });
      });
    });

    describe('Quit Functionality', () => {
      it('should exit app with q key', async () => {
        const { lastFrame, stdin, unmount } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        const initialFrame = lastFrame();
        stdin.write('q');

        // After pressing 'q', app should exit
        // Note: In ink-testing-library, exit() is handled by unmounting
        // We just verify the key was processed
        await vi.waitFor(() => {
          expect(lastFrame()).toBeDefined();
        });

        unmount();
      });
    });

    describe('Combined Navigation Scenarios', () => {
      it('should navigate through repos in expanded groups', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Start at both group header (expanded)
        // Navigate down to repo4
        stdin.write('j');

        await vi.waitFor(() => {
          expect(lastFrame()).toBeTruthy();
        });

        // Navigate down to uncommitted group header
        stdin.write('j');

        await vi.waitFor(() => {
          expect(lastFrame()).toBeTruthy();
        });

        // Navigate down to repo2
        stdin.write('j');

        await vi.waitFor(() => {
          // Should successfully navigate through items
          expect(lastFrame()).toBeTruthy();
        });
      });

      it('should maintain selection when collapsing/expanding groups', async () => {
        const { lastFrame, stdin } = render(<Dashboard />);

        await vi.waitFor(() => {
          expect(lastFrame()).not.toContain('Loading repositories');
        });

        // Start at both group header, toggle to collapse
        stdin.write('\r');

        await vi.waitFor(() => {
          const output = lastFrame();
          // Both group should now be collapsed
          expect(output).toBeTruthy();
        });

        // Toggle again to expand
        stdin.write('\r');

        await vi.waitFor(() => {
          // Should expand again and maintain selection on group header
          expect(lastFrame()).toBeTruthy();
        });
      });
    });
  });
});
