/**
 * SQLite database service for persistent storage
 * Handles access history (frecency), search history, and user preferences
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';

// Database schema version for migrations
const SCHEMA_VERSION = 3;

interface AccessHistoryRecord {
  id?: number;
  repo_path: string;
  accessed_at: number;
  action: string; // 'view', 'expand', 'favorite', 'search_select'
  session_id: string;
}

interface SearchHistoryRecord {
  id?: number;
  query: string;
  timestamp: number;
  result_count: number;
  selected_repo_path: string | null;
}

interface FrecencyScore {
  repo_path: string;
  score: number;
  access_count: number;
  last_accessed: number;
}

export class DatabaseService {
  private db: Database.Database;
  private sessionId: string;

  constructor(dbPath?: string) {
    // Default to ~/.local/share/delta-scope/database.db
    const defaultPath = join(homedir(), '.local', 'share', 'delta-scope');
    const dbDir = dbPath ? join(dbPath, '..') : defaultPath;

    // Ensure directory exists
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const fullPath = dbPath || join(defaultPath, 'database.db');
    this.db = new Database(fullPath);
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create schema_version table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);

    // Check current version
    const versionRow = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
    const currentVersion = versionRow?.version || 0;

    if (currentVersion < SCHEMA_VERSION) {
      this.applyMigrations(currentVersion);
    }
  }

  private applyMigrations(fromVersion: number): void {
    if (fromVersion < 1) {
      // Migration 1: Initial schema
      this.db.exec(`
        -- Access history for frecency calculation
        CREATE TABLE IF NOT EXISTS access_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          accessed_at INTEGER NOT NULL,
          action TEXT NOT NULL,
          session_id TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_access_history_repo_path ON access_history(repo_path);
        CREATE INDEX IF NOT EXISTS idx_access_history_accessed_at ON access_history(accessed_at);
        CREATE INDEX IF NOT EXISTS idx_access_history_session ON access_history(session_id);

        -- Search history for autocomplete and analytics
        CREATE TABLE IF NOT EXISTS search_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          result_count INTEGER NOT NULL DEFAULT 0,
          selected_repo_path TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
        CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp);

        -- Computed frecency scores (updated periodically)
        CREATE TABLE IF NOT EXISTS frecency_scores (
          repo_path TEXT PRIMARY KEY,
          score REAL NOT NULL,
          access_count INTEGER NOT NULL,
          last_accessed INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_frecency_scores_score ON frecency_scores(score DESC);
      `);

      // Record schema version
      this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(1, Date.now());
    }

    if (fromVersion < 2) {
      // Migration 2: Context snapshots for AI agent
      this.db.exec(`
        -- Context snapshots for tracking agent analysis history
        CREATE TABLE IF NOT EXISTS context_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          context_json TEXT NOT NULL,
          repo_count INTEGER NOT NULL,
          user_action TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON context_snapshots(timestamp);
      `);

      // Record schema version
      this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(2, Date.now());
    }

    if (fromVersion < 3) {
      // Migration 3: Dismissed recommendations
      this.db.exec(`
        -- Dismissed recommendations for AI agent
        CREATE TABLE IF NOT EXISTS dismissed_recommendations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recommendation_id TEXT NOT NULL UNIQUE,
          dismissed_at INTEGER NOT NULL,
          expires_at INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_dismissed_rec_id ON dismissed_recommendations(recommendation_id);
        CREATE INDEX IF NOT EXISTS idx_dismissed_expires ON dismissed_recommendations(expires_at);
      `);

      // Record schema version
      this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(3, Date.now());
    }
  }

  /**
   * Record an access event for frecency calculation
   */
  recordAccess(repoPath: string, action: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO access_history (repo_path, accessed_at, action, session_id)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(repoPath, Date.now(), action, this.sessionId);
  }

  /**
   * Record a search query
   */
  recordSearch(query: string, resultCount: number, selectedRepoPath: string | null = null): void {
    const stmt = this.db.prepare(`
      INSERT INTO search_history (query, timestamp, result_count, selected_repo_path)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(query, Date.now(), resultCount, selectedRepoPath);
  }

  /**
   * Get search history for autocomplete
   * Returns recent unique queries ordered by frequency and recency
   */
  getSearchHistory(limit: number = 10): string[] {
    const stmt = this.db.prepare(`
      SELECT query, COUNT(*) as frequency, MAX(timestamp) as last_used
      FROM search_history
      WHERE query != ''
      GROUP BY query
      ORDER BY frequency DESC, last_used DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as Array<{ query: string }>;
    return rows.map((row) => row.query);
  }

  /**
   * Calculate frecency scores for all repos
   * Based on Mozilla's frecency algorithm with time-based decay
   */
  calculateFrecency(): void {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const fourDays = 4 * oneDay;
    const fourteenDays = 14 * oneDay;
    const thirtyDays = 30 * oneDay;
    const ninetyDays = 90 * oneDay;

    // Frecency weights based on time buckets (Mozilla's algorithm)
    const getWeight = (age: number): number => {
      if (age < fourDays) return 100; // Recent: full weight
      if (age < fourteenDays) return 70; // Last 2 weeks
      if (age < thirtyDays) return 50; // Last month
      if (age < ninetyDays) return 30; // Last 3 months
      return 10; // Older than 3 months
    };

    // Action multipliers
    const actionMultipliers: Record<string, number> = {
      view: 1.0,
      expand: 0.5,
      favorite: 2.0,
      search_select: 1.5,
    };

    // Get all access history grouped by repo
    const stmt = this.db.prepare(`
      SELECT repo_path, accessed_at, action
      FROM access_history
      ORDER BY repo_path, accessed_at DESC
    `);

    const allAccess = stmt.all() as AccessHistoryRecord[];

    // Calculate scores
    const scores = new Map<string, { score: number; count: number; lastAccessed: number }>();

    for (const record of allAccess) {
      const age = now - record.accessed_at;
      const weight = getWeight(age);
      const multiplier = actionMultipliers[record.action] || 1.0;
      const points = weight * multiplier;

      const current = scores.get(record.repo_path) || { score: 0, count: 0, lastAccessed: 0 };
      scores.set(record.repo_path, {
        score: current.score + points,
        count: current.count + 1,
        lastAccessed: Math.max(current.lastAccessed, record.accessed_at),
      });
    }

    // Update frecency_scores table
    const deleteStmt = this.db.prepare('DELETE FROM frecency_scores');
    const insertStmt = this.db.prepare(`
      INSERT INTO frecency_scores (repo_path, score, access_count, last_accessed, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      deleteStmt.run();
      for (const [repoPath, data] of scores.entries()) {
        insertStmt.run(repoPath, data.score, data.count, data.lastAccessed, now);
      }
    })();
  }

  /**
   * Get top repos by frecency score
   */
  getTopReposByFrecency(limit: number = 20): FrecencyScore[] {
    const stmt = this.db.prepare(`
      SELECT repo_path, score, access_count, last_accessed
      FROM frecency_scores
      ORDER BY score DESC
      LIMIT ?
    `);

    return stmt.all(limit) as FrecencyScore[];
  }

  /**
   * Get frecency score for a specific repo
   */
  getFrecencyScore(repoPath: string): number {
    const stmt = this.db.prepare(`
      SELECT score FROM frecency_scores WHERE repo_path = ?
    `);

    const row = stmt.get(repoPath) as { score: number } | undefined;
    return row?.score || 0;
  }

  /**
   * Clean up old access history (keep last 90 days)
   */
  cleanupOldHistory(): void {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    this.db.prepare('DELETE FROM access_history WHERE accessed_at < ?').run(ninetyDaysAgo);
    this.db.prepare('DELETE FROM search_history WHERE timestamp < ?').run(ninetyDaysAgo);

    // Also cleanup old snapshots (keep last 30 days)
    this.cleanupOldSnapshots();

    // Cleanup expired dismissed recommendations
    this.cleanupExpiredDismissals();
  }

  /**
   * Get access statistics for a repo
   */
  getRepoStats(repoPath: string): { accessCount: number; lastAccessed: number | null; actions: Record<string, number> } {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM access_history WHERE repo_path = ?');
    const lastStmt = this.db.prepare('SELECT MAX(accessed_at) as last FROM access_history WHERE repo_path = ?');
    const actionsStmt = this.db.prepare(`
      SELECT action, COUNT(*) as count
      FROM access_history
      WHERE repo_path = ?
      GROUP BY action
    `);

    const countRow = countStmt.get(repoPath) as { count: number };
    const lastRow = lastStmt.get(repoPath) as { last: number | null };
    const actionRows = actionsStmt.all(repoPath) as Array<{ action: string; count: number }>;

    const actions: Record<string, number> = {};
    for (const row of actionRows) {
      actions[row.action] = row.count;
    }

    return {
      accessCount: countRow.count,
      lastAccessed: lastRow.last,
      actions,
    };
  }

  /**
   * Save a context snapshot
   */
  saveContextSnapshot(contextJson: string, repoCount: number, userAction: string | null = null): number {
    const stmt = this.db.prepare(`
      INSERT INTO context_snapshots (timestamp, context_json, repo_count, user_action)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(Date.now(), contextJson, repoCount, userAction);
    return result.lastInsertRowid as number;
  }

  /**
   * Get the most recent context snapshot
   */
  getLatestContextSnapshot(): { id: number; timestamp: number; context_json: string; repo_count: number; user_action: string | null } | null {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, context_json, repo_count, user_action
      FROM context_snapshots
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    return stmt.get() as { id: number; timestamp: number; context_json: string; repo_count: number; user_action: string | null } | null;
  }

  /**
   * Get context snapshots within a time range
   */
  getContextSnapshots(startTime: number, endTime: number): Array<{ id: number; timestamp: number; context_json: string; repo_count: number; user_action: string | null }> {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, context_json, repo_count, user_action
      FROM context_snapshots
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `);

    return stmt.all(startTime, endTime) as Array<{ id: number; timestamp: number; context_json: string; repo_count: number; user_action: string | null }>;
  }

  /**
   * Clean up old context snapshots (keep last 30 days)
   */
  cleanupOldSnapshots(): void {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.db.prepare('DELETE FROM context_snapshots WHERE timestamp < ?').run(thirtyDaysAgo);
  }

  /**
   * Dismiss a recommendation (optionally with expiration)
   */
  dismissRecommendation(recommendationId: string, expiresInDays?: number): void {
    const dismissedAt = Date.now();
    const expiresAt = expiresInDays
      ? dismissedAt + (expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO dismissed_recommendations (recommendation_id, dismissed_at, expires_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(recommendationId, dismissedAt, expiresAt);
  }

  /**
   * Check if a recommendation is dismissed
   */
  isRecommendationDismissed(recommendationId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT id, expires_at FROM dismissed_recommendations
      WHERE recommendation_id = ?
    `);

    const row = stmt.get(recommendationId) as { id: number; expires_at: number | null } | undefined;

    if (!row) {
      return false;
    }

    // Check if expired
    if (row.expires_at && row.expires_at < Date.now()) {
      // Remove expired dismissal
      this.db.prepare('DELETE FROM dismissed_recommendations WHERE id = ?').run(row.id);
      return false;
    }

    return true;
  }

  /**
   * Undismiss a recommendation
   */
  undismissRecommendation(recommendationId: string): void {
    this.db.prepare('DELETE FROM dismissed_recommendations WHERE recommendation_id = ?').run(recommendationId);
  }

  /**
   * Get all dismissed recommendation IDs
   */
  getDismissedRecommendations(): string[] {
    const stmt = this.db.prepare(`
      SELECT recommendation_id FROM dismissed_recommendations
      WHERE expires_at IS NULL OR expires_at > ?
    `);

    const rows = stmt.all(Date.now()) as Array<{ recommendation_id: string }>;
    return rows.map((row) => row.recommendation_id);
  }

  /**
   * Clean up expired dismissed recommendations
   */
  cleanupExpiredDismissals(): void {
    const now = Date.now();
    this.db.prepare('DELETE FROM dismissed_recommendations WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
  }
  return dbInstance;
}

export function closeDatabaseService(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
