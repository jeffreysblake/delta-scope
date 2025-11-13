import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRepoName, scanForRepos } from '../gitScanner.js';
import { join } from 'path';
import type { AppConfig } from '../../types/index.js';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}));

describe('GitScanner', () => {
  describe('getRepoName', () => {
    it('should extract repo name from path', () => {
      const path = '/home/user/projects/my-repo';
      const name = getRepoName(path);
      expect(name).toBe('my-repo');
    });

    it('should handle paths with trailing slash', () => {
      const path = '/home/user/projects/my-repo/';
      const name = getRepoName(path);
      // Trailing slash results in empty string as last element
      expect(name).toBe(path); // Falls back to original path
    });

    it('should handle root paths', () => {
      const path = '/';
      const name = getRepoName(path);
      // Root path results in empty string
      expect(name).toBe(path); // Falls back to original path
    });

    it('should handle simple paths', () => {
      const path = 'my-repo';
      const name = getRepoName(path);
      expect(name).toBe('my-repo');
    });

    it('should handle paths with backslashes (fallback to full path)', () => {
      const path = 'C:\\Users\\user\\projects\\my-repo';
      const name = getRepoName(path);
      // getRepoName splits on '/' so Windows paths return the whole string
      expect(name).toBe(path);
    });

    it('should handle paths with dots', () => {
      const path = '/home/user/projects/my.repo.name';
      const name = getRepoName(path);
      expect(name).toBe('my.repo.name');
    });

    it('should handle paths with special characters', () => {
      const path = '/home/user/projects/my-repo_v2';
      const name = getRepoName(path);
      expect(name).toBe('my-repo_v2');
    });
  });

  describe('scanForRepos', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return empty array when no base paths configured', async () => {
      const config: AppConfig = {
        basePaths: [],
        excludePatterns: [],
        theme: 'dark',
        refreshInterval: 60,
        favorites: [],
        maxDepth: 5,
        showHidden: false,
      };

      const repos = await scanForRepos(config);
      expect(repos).toEqual([]);
    });

    it('should return empty array when base path does not exist', async () => {
      const { stat } = await import('fs/promises');
      vi.mocked(stat).mockRejectedValue(new Error('ENOENT'));

      const config: AppConfig = {
        basePaths: ['/nonexistent/path'],
        excludePatterns: [],
        theme: 'dark',
        refreshInterval: 60,
        favorites: [],
        maxDepth: 5,
        showHidden: false,
      };

      const repos = await scanForRepos(config);
      expect(repos).toEqual([]);
    });

    it('should find git repositories in base path', async () => {
      const basePath = '/test/projects';
      const { readdir, stat } = await import('fs/promises');

      // Mock filesystem structure:
      // /test/projects/
      //   repo1/.git
      //   repo2/.git
      //   not-a-repo/

      vi.mocked(stat).mockResolvedValue({} as any);

      vi.mocked(readdir).mockImplementation(async (path: string) => {
        if (path === basePath) {
          return [
            { name: 'repo1', isDirectory: () => true },
            { name: 'repo2', isDirectory: () => true },
            { name: 'not-a-repo', isDirectory: () => true },
          ] as any;
        }
        if (path === join(basePath, 'repo1')) {
          return [{ name: '.git', isDirectory: () => true }] as any;
        }
        if (path === join(basePath, 'repo2')) {
          return [{ name: '.git', isDirectory: () => true }] as any;
        }
        if (path === join(basePath, 'not-a-repo')) {
          return [{ name: 'file.txt', isDirectory: () => false }] as any;
        }
        return [] as any;
      });

      const config: AppConfig = {
        basePaths: [basePath],
        excludePatterns: [],
        theme: 'dark',
        refreshInterval: 60,
        favorites: [],
        maxDepth: 5,
        showHidden: false,
      };

      const repos = await scanForRepos(config);

      expect(repos.length).toBe(2);
      expect(repos).toContain(join(basePath, 'repo1'));
      expect(repos).toContain(join(basePath, 'repo2'));
      expect(repos).not.toContain(join(basePath, 'not-a-repo'));
    });

    it('should respect excludePatterns', async () => {
      const basePath = '/test/projects';
      const { readdir, stat } = await import('fs/promises');

      vi.mocked(stat).mockResolvedValue({} as any);

      vi.mocked(readdir).mockImplementation(async (path: string) => {
        if (path === basePath) {
          return [
            { name: 'node_modules', isDirectory: () => true },
            { name: 'repo1', isDirectory: () => true },
          ] as any;
        }
        if (path === join(basePath, 'repo1')) {
          return [{ name: '.git', isDirectory: () => true }] as any;
        }
        return [] as any;
      });

      const config: AppConfig = {
        basePaths: [basePath],
        excludePatterns: ['node_modules'],
        theme: 'dark',
        refreshInterval: 60,
        favorites: [],
        maxDepth: 5,
        showHidden: false,
      };

      const repos = await scanForRepos(config);

      expect(repos).toContain(join(basePath, 'repo1'));
      expect(repos).not.toContain(join(basePath, 'node_modules'));
    });

    it('should respect maxDepth setting', async () => {
      const basePath = '/test/projects';
      const { readdir, stat } = await import('fs/promises');

      vi.mocked(stat).mockResolvedValue({} as any);

      vi.mocked(readdir).mockImplementation(async (path: string) => {
        if (path === basePath) {
          return [
            { name: 'repo1', isDirectory: () => true },
            { name: 'nested', isDirectory: () => true },
          ] as any;
        }
        if (path === join(basePath, 'repo1')) {
          return [{ name: '.git', isDirectory: () => true }] as any;
        }
        if (path === join(basePath, 'nested')) {
          return [{ name: 'deep-repo', isDirectory: () => true }] as any;
        }
        return [] as any;
      });

      const config: AppConfig = {
        basePaths: [basePath],
        excludePatterns: [],
        theme: 'dark',
        refreshInterval: 60,
        favorites: [],
        maxDepth: 1, // Only scan one level deep
        showHidden: false,
      };

      const repos = await scanForRepos(config);

      // Should find repo1 but not nested/deep-repo
      expect(repos).toContain(join(basePath, 'repo1'));
      expect(repos).not.toContain(join(basePath, 'nested', 'deep-repo'));
    });

    it('should skip hidden directories when showHidden is false', async () => {
      const basePath = '/test/projects';
      const { readdir, stat } = await import('fs/promises');

      vi.mocked(stat).mockResolvedValue({} as any);

      vi.mocked(readdir).mockImplementation(async (path: string) => {
        if (path === basePath) {
          return [
            { name: '.hidden', isDirectory: () => true },
            { name: 'visible', isDirectory: () => true },
          ] as any;
        }
        if (path === join(basePath, 'visible')) {
          return [{ name: '.git', isDirectory: () => true }] as any;
        }
        return [] as any;
      });

      const config: AppConfig = {
        basePaths: [basePath],
        excludePatterns: [],
        theme: 'dark',
        refreshInterval: 60,
        favorites: [],
        maxDepth: 5,
        showHidden: false,
      };

      const repos = await scanForRepos(config);

      expect(repos).toContain(join(basePath, 'visible'));
      // .hidden should be skipped (except .git itself)
      expect(repos).not.toContain(join(basePath, '.hidden'));
    });
  });
});

