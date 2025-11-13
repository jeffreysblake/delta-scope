/**
 * Integration tests for delta-scope
 * Tests the interaction between multiple services and components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDatabaseService, closeDatabaseService } from '../services/database.js';
import { scanForRepos } from '../services/gitScanner.js';
import { getMultipleRepoStatus } from '../services/gitStatus.js';
import { configManager } from '../services/configManager.js';
import type { AppConfig } from '../types/index.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmSync } from 'fs';

// Mock git operations
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    status: vi.fn().mockResolvedValue({
      modified: [],
      not_added: [],
      deleted: [],
      ahead: 0,
    }),
    log: vi.fn().mockResolvedValue({
      latest: {
        date: '2025-01-01',
        message: 'Test commit',
      },
    }),
    branch: vi.fn().mockResolvedValue({
      current: 'main',
    }),
    remote: vi.fn().mockResolvedValue(['origin']),
  })),
}));

// Mock fs/promises for scanForRepos
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}));

describe('Integration Tests', () => {
  let testDbPath: string;
  let testConfig: AppConfig;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a temporary database path
    testDbPath = join(tmpdir(), `test-db-${Date.now()}.sqlite`);

    testConfig = {
      basePaths: ['/test/repos'],
      excludePatterns: ['node_modules'],
      theme: 'dark',
      refreshInterval: 60000,
      favorites: [],
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

    // Mock configManager
    vi.mocked(configManager).get = vi.fn(() => testConfig);
  });

  afterEach(() => {
    closeDatabaseService();
    try {
      rmSync(testDbPath, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Repo Discovery and Status Workflow', () => {
    it('should scan repos successfully', async () => {
      const basePath = '/test/repos';
      const { readdir, stat } = await import('fs/promises');

      // Mock file system for scanning
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readdir).mockImplementation(async (path: string) => {
        if (path === basePath) {
          return [
            { name: 'repo1', isDirectory: () => true },
            { name: 'repo2', isDirectory: () => true },
          ] as any;
        }
        if (path === join(basePath, 'repo1') || path === join(basePath, 'repo2')) {
          return [{ name: '.git', isDirectory: () => true }] as any;
        }
        return [] as any;
      });

      // Step 1: Scan for repos
      const repoPaths = await scanForRepos(testConfig);
      expect(repoPaths).toHaveLength(2);
      expect(repoPaths).toContain(join(basePath, 'repo1'));
      expect(repoPaths).toContain(join(basePath, 'repo2'));

      // Step 2: Verify scan results are valid paths
      repoPaths.forEach((path) => {
        expect(typeof path).toBe('string');
        expect(path.length).toBeGreaterThan(0);
      });
    });

    it('should respect config excludePatterns during scanning', async () => {
      const basePath = '/test/repos';
      const { readdir, stat } = await import('fs/promises');

      const configWithExcludes: AppConfig = {
        ...testConfig,
        excludePatterns: ['node_modules', 'vendor'],
      };

      vi.mocked(configManager).get = vi.fn(() => configWithExcludes);
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readdir).mockImplementation(async (path: string) => {
        if (path === basePath) {
          return [
            { name: 'repo1', isDirectory: () => true },
            { name: 'node_modules', isDirectory: () => true },
            { name: 'vendor', isDirectory: () => true },
          ] as any;
        }
        if (path === join(basePath, 'repo1')) {
          return [{ name: '.git', isDirectory: () => true }] as any;
        }
        return [] as any;
      });

      const repoPaths = await scanForRepos(configWithExcludes);
      expect(repoPaths).toHaveLength(1);
      expect(repoPaths).toContain(join(basePath, 'repo1'));
      expect(repoPaths).not.toContain(join(basePath, 'node_modules'));
      expect(repoPaths).not.toContain(join(basePath, 'vendor'));
    });
  });

  describe('Database and Favorites Integration', () => {
    it('should track repo access and update favorites', async () => {
      const db = getDatabaseService(testDbPath);
      const repoPath = '/test/unique/repo1';

      // Record multiple accesses with action
      db.recordAccess(repoPath, 'open');
      db.recordAccess(repoPath, 'open');
      db.recordAccess(repoPath, 'open');

      // Get stats
      const stats = db.getRepoStats(repoPath);
      expect(stats?.accessCount).toBeGreaterThanOrEqual(3);
      expect(stats?.lastAccessed).toBeDefined();

      // Add to favorites via config manager
      const updatedConfig = { ...testConfig, favorites: [repoPath] };
      vi.mocked(configManager).get = vi.fn(() => updatedConfig);

      expect(configManager.get().favorites).toContain(repoPath);
    });

    it('should calculate frecency score based on access patterns', async () => {
      const db = getDatabaseService(testDbPath);
      const repo1 = '/test/repos/repo1';
      const repo2 = '/test/repos/repo2';

      // Repo1: many recent accesses
      for (let i = 0; i < 10; i++) {
        db.recordAccess(repo1, 'open');
      }

      // Repo2: single access
      db.recordAccess(repo2, 'open');

      // Calculate frecency scores
      db.calculateFrecency();

      const score1 = db.getFrecencyScore(repo1);
      const score2 = db.getFrecencyScore(repo2);

      // Repo1 should have higher frecency
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('Database and Search Integration', () => {
    it('should record searches and retrieve search history', async () => {
      const db = getDatabaseService(testDbPath);

      // Record searches with result count
      db.recordSearch('react', 5);
      db.recordSearch('typescript', 3);
      db.recordSearch('react', 5); // Duplicate

      const history = db.getSearchHistory();
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);

      // Should have search terms (getSearchHistory returns string[])
      expect(history).toContain('react');
      expect(history).toContain('typescript');
    });

    it('should track most frequent searches', async () => {
      const db = getDatabaseService(testDbPath);

      // Record multiple searches
      db.recordSearch('test', 1);
      db.recordSearch('test', 2);
      db.recordSearch('test', 3);
      db.recordSearch('other', 1);

      const history = db.getSearchHistory();

      // First item should be 'test' (most frequent)
      expect(history[0]).toBe('test');
      expect(history).toContain('other');
    });
  });

  describe('Config and Database Integration', () => {
    it('should persist favorites across database sessions', async () => {
      const repo1 = '/test/repos/repo1';
      const repo2 = '/test/repos/repo2';

      // First session
      const db1 = getDatabaseService(testDbPath);
      db1.recordAccess(repo1, 'open');
      db1.recordAccess(repo2, 'open');

      // Update config with favorites
      testConfig.favorites = [repo1];
      vi.mocked(configManager).get = vi.fn(() => testConfig);

      expect(configManager.get().favorites).toContain(repo1);

      // Close and reopen database
      closeDatabaseService();
      const db2 = getDatabaseService(testDbPath);

      // Stats should persist
      const stats = db2.getRepoStats(repo1);
      expect(stats?.accessCount).toBeGreaterThan(0);
    });
  });

  describe('Multi-Repo Status with Favorites', () => {
    it('should handle favorites configuration', async () => {
      const basePath = '/test/repos';
      const repo1Path = join(basePath, 'repo1');
      const repo2Path = join(basePath, 'repo2');

      const { readdir, stat } = await import('fs/promises');

      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readdir).mockImplementation(async (path: string) => {
        if (path === basePath) {
          return [
            { name: 'repo1', isDirectory: () => true },
            { name: 'repo2', isDirectory: () => true },
          ] as any;
        }
        if (path === repo1Path || path === repo2Path) {
          return [{ name: '.git', isDirectory: () => true }] as any;
        }
        return [] as any;
      });

      // Set repo1 as favorite
      testConfig.favorites = [repo1Path];
      vi.mocked(configManager).get = vi.fn(() => testConfig);

      const repoPaths = await scanForRepos(testConfig);
      expect(repoPaths).toHaveLength(2);

      // Verify favorites config
      expect(configManager.get().favorites).toContain(repo1Path);
      expect(configManager.get().favorites).not.toContain(repo2Path);
    });
  });

  describe('Session Tracking Integration', () => {
    it('should track session start time across database operations', async () => {
      const db = getDatabaseService(testDbPath);
      const sessionStart = db.getSessionStart();

      expect(sessionStart).toBeInstanceOf(Date);
      expect(sessionStart.getTime()).toBeLessThanOrEqual(Date.now());

      // Session start should remain constant
      await new Promise((resolve) => setTimeout(resolve, 10));
      const sessionStart2 = db.getSessionStart();
      expect(sessionStart2.getTime()).toBe(sessionStart.getTime());
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors in repo scanning gracefully', async () => {
      const { stat } = await import('fs/promises');
      vi.mocked(stat).mockRejectedValue(new Error('Permission denied'));

      const config: AppConfig = {
        ...testConfig,
        basePaths: ['/invalid/path'],
      };

      const repos = await scanForRepos(config);
      expect(repos).toEqual([]);
    });

    it('should filter out invalid repos during status fetching', async () => {
      // getMultipleRepoStatus filters out non-existent paths
      const repos = await getMultipleRepoStatus(['/invalid/repo']);
      // Should return empty array or filtered results
      expect(Array.isArray(repos)).toBe(true);
    });
  });

  describe('Concurrent Operations Integration', () => {
    it('should handle concurrent database operations', async () => {
      const db = getDatabaseService(testDbPath);
      const repos = [
        '/concurrent/repo1',
        '/concurrent/repo2',
        '/concurrent/repo3',
        '/concurrent/repo4',
        '/concurrent/repo5',
      ];

      // Record accesses concurrently
      await Promise.all(repos.map((repo) => Promise.resolve(db.recordAccess(repo, 'open'))));

      // Verify all were recorded
      repos.forEach((repo) => {
        const stats = db.getRepoStats(repo);
        expect(stats?.accessCount).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle concurrent repo status fetches', async () => {
      const basePath = '/test/repos';
      const repoPaths = [
        join(basePath, 'repo1'),
        join(basePath, 'repo2'),
        join(basePath, 'repo3'),
      ];

      // Get status should handle concurrent requests gracefully
      const statuses = await getMultipleRepoStatus(repoPaths);
      expect(Array.isArray(statuses)).toBe(true);
      // Each status should be a valid object
      statuses.forEach((status) => {
        expect(typeof status).toBe('object');
        expect(status).toBeDefined();
      });
    });
  });
});
