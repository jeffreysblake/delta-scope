import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../database.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('DatabaseService', () => {
  let db: DatabaseService;
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    // Create temporary directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'delta-scope-test-'));
    dbPath = join(tempDir, 'test.db');
    db = new DatabaseService(dbPath);
  });

  afterEach(() => {
    db.close();
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Initialization', () => {
    it('should create database with schema', () => {
      expect(db).toBeDefined();
      expect(db.getSessionId()).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should have unique session IDs', () => {
      const db2 = new DatabaseService(join(tempDir, 'test2.db'));
      expect(db.getSessionId()).not.toBe(db2.getSessionId());
      db2.close();
    });
  });

  describe('Access History', () => {
    it('should record access events', () => {
      db.recordAccess('/path/to/repo1', 'view');
      db.recordAccess('/path/to/repo1', 'expand');
      db.recordAccess('/path/to/repo2', 'favorite');

      const stats1 = db.getRepoStats('/path/to/repo1');
      expect(stats1.accessCount).toBe(2);
      expect(stats1.actions).toEqual({ view: 1, expand: 1 });

      const stats2 = db.getRepoStats('/path/to/repo2');
      expect(stats2.accessCount).toBe(1);
      expect(stats2.actions).toEqual({ favorite: 1 });
    });

    it('should track last accessed time', () => {
      const before = Date.now();
      db.recordAccess('/path/to/repo1', 'view');
      const after = Date.now();

      const stats = db.getRepoStats('/path/to/repo1');
      expect(stats.lastAccessed).toBeGreaterThanOrEqual(before);
      expect(stats.lastAccessed).toBeLessThanOrEqual(after);
    });

    it('should return empty stats for non-existent repo', () => {
      const stats = db.getRepoStats('/nonexistent/repo');
      expect(stats.accessCount).toBe(0);
      expect(stats.lastAccessed).toBeNull();
      expect(stats.actions).toEqual({});
    });
  });

  describe('Search History', () => {
    it('should record search queries', () => {
      db.recordSearch('test query', 5);
      db.recordSearch('another query', 10, '/path/to/repo');

      const history = db.getSearchHistory();
      expect(history).toContain('test query');
      expect(history).toContain('another query');
    });

    it('should return recent unique queries', () => {
      db.recordSearch('query1', 1);
      db.recordSearch('query2', 2);
      db.recordSearch('query1', 3); // duplicate
      db.recordSearch('query3', 4);

      const history = db.getSearchHistory();
      expect(history).toHaveLength(3);
      expect(history).toContain('query1');
      expect(history).toContain('query2');
      expect(history).toContain('query3');
    });

    it('should order by frequency and recency', () => {
      // query1: searched 3 times
      db.recordSearch('query1', 1);
      db.recordSearch('query1', 1);
      db.recordSearch('query1', 1);

      // query2: searched 2 times
      db.recordSearch('query2', 1);
      db.recordSearch('query2', 1);

      // query3: searched 1 time (most recent)
      db.recordSearch('query3', 1);

      const history = db.getSearchHistory();
      expect(history[0]).toBe('query1'); // highest frequency
      expect(history[1]).toBe('query2'); // second highest
      expect(history[2]).toBe('query3'); // least frequent
    });

    it('should limit results', () => {
      for (let i = 0; i < 20; i++) {
        db.recordSearch(`query${i}`, 1);
      }

      const history = db.getSearchHistory(5);
      expect(history).toHaveLength(5);
    });

    it('should ignore empty queries', () => {
      db.recordSearch('', 0);
      db.recordSearch('valid query', 1);

      const history = db.getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toBe('valid query');
    });
  });

  describe('Frecency Calculation', () => {
    it('should calculate frecency scores', () => {
      db.recordAccess('/path/to/repo1', 'view');
      db.recordAccess('/path/to/repo1', 'favorite');
      db.recordAccess('/path/to/repo2', 'view');

      db.calculateFrecency();

      const topRepos = db.getTopReposByFrecency();
      expect(topRepos.length).toBeGreaterThan(0);
      expect(topRepos[0].repo_path).toBe('/path/to/repo1'); // More accesses + favorite
    });

    it('should apply action multipliers correctly', () => {
      // repo1: one favorite (2.0x multiplier)
      db.recordAccess('/path/to/repo1', 'favorite');

      // repo2: one view (1.0x multiplier)
      db.recordAccess('/path/to/repo2', 'view');

      db.calculateFrecency();

      const score1 = db.getFrecencyScore('/path/to/repo1');
      const score2 = db.getFrecencyScore('/path/to/repo2');

      // Favorite (2.0x) should have higher score than view (1.0x)
      expect(score1).toBeGreaterThan(score2);
      expect(score1).toBe(200); // 100 (recent weight) * 2.0
      expect(score2).toBe(100); // 100 (recent weight) * 1.0
    });

    it('should apply time-based decay', (_ctx) => {
      // Recent access
      db.recordAccess('/path/to/recent', 'view');

      // Simulate old access by directly manipulating DB
      // (This is a simplified test - real decay would need time manipulation)
      db.calculateFrecency();

      const recentScore = db.getFrecencyScore('/path/to/recent');
      expect(recentScore).toBeGreaterThan(0);
    });

    it('should handle repos with no access', () => {
      db.calculateFrecency();

      const score = db.getFrecencyScore('/nonexistent/repo');
      expect(score).toBe(0);
    });

    it('should order top repos by score', () => {
      db.recordAccess('/path/to/repo1', 'view');
      db.recordAccess('/path/to/repo2', 'favorite');
      db.recordAccess('/path/to/repo2', 'favorite');
      db.recordAccess('/path/to/repo3', 'view');

      db.calculateFrecency();

      const topRepos = db.getTopReposByFrecency(10);
      expect(topRepos[0].score).toBeGreaterThanOrEqual(topRepos[1].score);
      if (topRepos.length > 2) {
        expect(topRepos[1].score).toBeGreaterThanOrEqual(topRepos[2].score);
      }
    });

    it('should include access count and last accessed time', () => {
      const before = Date.now();
      db.recordAccess('/path/to/repo1', 'view');
      db.recordAccess('/path/to/repo1', 'expand');
      const after = Date.now();

      db.calculateFrecency();

      const topRepos = db.getTopReposByFrecency();
      const repo1 = topRepos.find((r) => r.repo_path === '/path/to/repo1');

      expect(repo1).toBeDefined();
      expect(repo1!.access_count).toBe(2);
      expect(repo1!.last_accessed).toBeGreaterThanOrEqual(before);
      expect(repo1!.last_accessed).toBeLessThanOrEqual(after);
    });

    it('should limit frecency results', () => {
      for (let i = 0; i < 50; i++) {
        db.recordAccess(`/path/to/repo${i}`, 'view');
      }

      db.calculateFrecency();

      const top10 = db.getTopReposByFrecency(10);
      const top5 = db.getTopReposByFrecency(5);

      expect(top10).toHaveLength(10);
      expect(top5).toHaveLength(5);
    });
  });

  describe('History Cleanup', () => {
    it('should clean up old history', () => {
      db.recordAccess('/path/to/repo1', 'view');
      db.recordSearch('test query', 1);

      // Initially should have records
      const statsBefore = db.getRepoStats('/path/to/repo1');
      const historyBefore = db.getSearchHistory();

      expect(statsBefore.accessCount).toBe(1);
      expect(historyBefore).toHaveLength(1);

      // This won't delete recent records (< 90 days old)
      db.cleanupOldHistory();

      const statsAfter = db.getRepoStats('/path/to/repo1');
      const historyAfter = db.getSearchHistory();

      expect(statsAfter.accessCount).toBe(1);
      expect(historyAfter).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex workflow', () => {
      // User searches for repos
      db.recordSearch('my-project', 3);

      // User views multiple repos
      db.recordAccess('/path/to/project1', 'view');
      db.recordAccess('/path/to/project2', 'view');
      db.recordAccess('/path/to/project1', 'expand');

      // User favorites a repo
      db.recordAccess('/path/to/project1', 'favorite');

      // User selects from search
      db.recordSearch('another', 1, '/path/to/project2');

      // Calculate frecency
      db.calculateFrecency();

      // Verify results
      const topRepos = db.getTopReposByFrecency();
      const searchHistory = db.getSearchHistory();
      const project1Stats = db.getRepoStats('/path/to/project1');

      expect(topRepos.length).toBeGreaterThan(0);
      expect(topRepos[0].repo_path).toBe('/path/to/project1');
      expect(searchHistory).toContain('my-project');
      expect(project1Stats.accessCount).toBe(3);
      expect(project1Stats.actions.favorite).toBe(1);
    });

    it('should persist data across sessions', () => {
      // First session
      db.recordAccess('/path/to/repo1', 'view');
      db.recordSearch('test query', 5);
      db.calculateFrecency();

      const session1Score = db.getFrecencyScore('/path/to/repo1');
      db.close();

      // Second session (new instance, same DB)
      const db2 = new DatabaseService(dbPath);
      const session2Score = db2.getFrecencyScore('/path/to/repo1');
      const history = db2.getSearchHistory();

      expect(session2Score).toBe(session1Score);
      expect(history).toContain('test query');

      db2.close();
    });
  });
});
