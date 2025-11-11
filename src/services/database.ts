/**
 * SQLite database service for persistent storage
 * Handles access history (frecency), search history, and user preferences
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';

// Database schema version for migrations
const SCHEMA_VERSION = 5;

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

    if (fromVersion < 4) {
      // Migration 4: Phase 4 intelligence features (patterns, feedback, anomalies)
      this.db.exec(`
        -- Workflow patterns detected by AI
        CREATE TABLE IF NOT EXISTS workflow_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          pattern_type TEXT NOT NULL,
          repos TEXT NOT NULL,
          steps TEXT NOT NULL,
          frequency INTEGER NOT NULL DEFAULT 1,
          confidence REAL NOT NULL DEFAULT 0.0,
          first_seen INTEGER NOT NULL,
          last_seen INTEGER NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_patterns_type ON workflow_patterns(pattern_type);
        CREATE INDEX IF NOT EXISTS idx_patterns_last_seen ON workflow_patterns(last_seen);

        -- Recommendation feedback for learning
        CREATE TABLE IF NOT EXISTS recommendation_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recommendation_id TEXT NOT NULL,
          recommendation_type TEXT NOT NULL,
          action TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          outcome TEXT,
          notes TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_feedback_rec_id ON recommendation_feedback(recommendation_id);
        CREATE INDEX IF NOT EXISTS idx_feedback_type ON recommendation_feedback(recommendation_type);
        CREATE INDEX IF NOT EXISTS idx_feedback_action ON recommendation_feedback(action);
        CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON recommendation_feedback(timestamp);

        -- Detected anomalies in repos
        CREATE TABLE IF NOT EXISTS anomalies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          anomaly_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          description TEXT NOT NULL,
          detected_at INTEGER NOT NULL,
          resolved_at INTEGER,
          metadata TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_anomalies_repo ON anomalies(repo_path);
        CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(anomaly_type);
        CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomalies(detected_at);

        -- Health score history for tracking trends
        CREATE TABLE IF NOT EXISTS repo_health_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          health_score REAL NOT NULL,
          factors TEXT NOT NULL,
          recorded_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_health_history_repo ON repo_health_history(repo_path);
        CREATE INDEX IF NOT EXISTS idx_health_history_recorded ON repo_health_history(recorded_at);

        -- Action execution log for auditing
        CREATE TABLE IF NOT EXISTS action_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          status TEXT NOT NULL,
          repos_affected INTEGER NOT NULL DEFAULT 0,
          rollback_available BOOLEAN NOT NULL DEFAULT 0,
          details TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_action_log_timestamp ON action_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_action_log_type ON action_log(action_type);
        CREATE INDEX IF NOT EXISTS idx_action_log_status ON action_log(status);
      `);

      // Record schema version
      this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(4, Date.now());
    }

    if (fromVersion < 5) {
      // Migration 5: Phase 5 Week 3 scheduler features (scheduled tasks, triggers, queue)
      this.db.exec(`
        -- Scheduled tasks for background daemon
        CREATE TABLE IF NOT EXISTS scheduled_tasks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          action TEXT NOT NULL,
          schedule TEXT NOT NULL,
          custom_cron TEXT,
          enabled BOOLEAN NOT NULL DEFAULT 1,
          last_run INTEGER,
          next_run INTEGER NOT NULL,
          params TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 5,
          created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run);
        CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_tasks(enabled);

        -- Triggered actions
        CREATE TABLE IF NOT EXISTS triggered_actions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          trigger TEXT NOT NULL,
          action TEXT NOT NULL,
          condition TEXT,
          enabled BOOLEAN NOT NULL DEFAULT 1,
          params TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 5,
          created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_triggered_actions_trigger ON triggered_actions(trigger);
        CREATE INDEX IF NOT EXISTS idx_triggered_actions_enabled ON triggered_actions(enabled);

        -- Queued recommendations
        CREATE TABLE IF NOT EXISTS queued_recommendations (
          id TEXT PRIMARY KEY,
          recommendation TEXT NOT NULL,
          queued_at INTEGER NOT NULL,
          priority TEXT NOT NULL,
          expires_at INTEGER,
          displayed BOOLEAN NOT NULL DEFAULT 0,
          dismissed BOOLEAN NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_queued_recommendations_queued_at ON queued_recommendations(queued_at);
        CREATE INDEX IF NOT EXISTS idx_queued_recommendations_displayed ON queued_recommendations(displayed);
        CREATE INDEX IF NOT EXISTS idx_queued_recommendations_expires ON queued_recommendations(expires_at);

        -- Task execution history
        CREATE TABLE IF NOT EXISTS task_executions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          completed_at INTEGER,
          status TEXT NOT NULL,
          result TEXT,
          error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON task_executions(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_executions_started_at ON task_executions(started_at);
        CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
      `);

      // Record schema version
      this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(5, Date.now());
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

  // ============================================
  // Phase 4: Pattern Detection & Intelligence
  // ============================================

  /**
   * Save a detected workflow pattern
   */
  saveWorkflowPattern(
    name: string,
    patternType: string,
    repos: string[],
    steps: string[],
    confidence: number
  ): number {
    const now = Date.now();

    // Check if pattern already exists
    const existing = this.db.prepare(`
      SELECT id, frequency FROM workflow_patterns
      WHERE name = ? AND pattern_type = ?
    `).get(name, patternType) as { id: number; frequency: number } | undefined;

    if (existing) {
      // Update existing pattern
      this.db.prepare(`
        UPDATE workflow_patterns
        SET frequency = frequency + 1, last_seen = ?, confidence = ?
        WHERE id = ?
      `).run(now, confidence, existing.id);
      return existing.id;
    } else {
      // Insert new pattern
      const stmt = this.db.prepare(`
        INSERT INTO workflow_patterns (name, pattern_type, repos, steps, frequency, confidence, first_seen, last_seen)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `);
      const result = stmt.run(
        name,
        patternType,
        JSON.stringify(repos),
        JSON.stringify(steps),
        confidence,
        now,
        now
      );
      return result.lastInsertRowid as number;
    }
  }

  /**
   * Get all active workflow patterns
   */
  getWorkflowPatterns(minConfidence: number = 0.5): Array<{
    id: number;
    name: string;
    pattern_type: string;
    repos: string[];
    steps: string[];
    frequency: number;
    confidence: number;
    first_seen: number;
    last_seen: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT id, name, pattern_type, repos, steps, frequency, confidence, first_seen, last_seen
      FROM workflow_patterns
      WHERE enabled = 1 AND confidence >= ?
      ORDER BY frequency DESC, confidence DESC
    `);

    const rows = stmt.all(minConfidence) as Array<{
      id: number;
      name: string;
      pattern_type: string;
      repos: string;
      steps: string;
      frequency: number;
      confidence: number;
      first_seen: number;
      last_seen: number;
    }>;

    return rows.map((row) => ({
      ...row,
      repos: JSON.parse(row.repos),
      steps: JSON.parse(row.steps),
    }));
  }

  /**
   * Disable a workflow pattern
   */
  disableWorkflowPattern(patternId: number): void {
    this.db.prepare('UPDATE workflow_patterns SET enabled = 0 WHERE id = ?').run(patternId);
  }

  /**
   * Record feedback on a recommendation
   */
  recordRecommendationFeedback(
    recommendationId: string,
    recommendationType: string,
    action: 'accepted' | 'dismissed' | 'snoozed',
    outcome?: 'helpful' | 'not_helpful' | 'harmful',
    notes?: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO recommendation_feedback (recommendation_id, recommendation_type, action, timestamp, outcome, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(recommendationId, recommendationType, action, Date.now(), outcome || null, notes || null);
  }

  /**
   * Get recommendation acceptance rate by type
   */
  getRecommendationStats(recommendationType?: string): {
    total: number;
    accepted: number;
    dismissed: number;
    snoozed: number;
    acceptanceRate: number;
  } {
    const whereClause = recommendationType ? 'WHERE recommendation_type = ?' : '';
    const stmt = this.db.prepare(`
      SELECT action, COUNT(*) as count
      FROM recommendation_feedback
      ${whereClause}
      GROUP BY action
    `);

    const rows = (recommendationType ? stmt.all(recommendationType) : stmt.all()) as Array<{
      action: string;
      count: number;
    }>;

    const stats = {
      total: 0,
      accepted: 0,
      dismissed: 0,
      snoozed: 0,
      acceptanceRate: 0,
    };

    for (const row of rows) {
      stats.total += row.count;
      if (row.action === 'accepted') stats.accepted = row.count;
      if (row.action === 'dismissed') stats.dismissed = row.count;
      if (row.action === 'snoozed') stats.snoozed = row.count;
    }

    stats.acceptanceRate = stats.total > 0 ? stats.accepted / stats.total : 0;

    return stats;
  }

  /**
   * Save a detected anomaly
   */
  saveAnomaly(
    repoPath: string,
    anomalyType: string,
    severity: 'low' | 'medium' | 'high',
    description: string,
    metadata?: Record<string, any>
  ): number {
    const stmt = this.db.prepare(`
      INSERT INTO anomalies (repo_path, anomaly_type, severity, description, detected_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      repoPath,
      anomalyType,
      severity,
      description,
      Date.now(),
      metadata ? JSON.stringify(metadata) : null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Get active anomalies for a repo or all repos
   */
  getAnomalies(repoPath?: string): Array<{
    id: number;
    repo_path: string;
    anomaly_type: string;
    severity: string;
    description: string;
    detected_at: number;
    metadata: Record<string, any> | null;
  }> {
    const whereClause = repoPath ? 'WHERE repo_path = ? AND resolved_at IS NULL' : 'WHERE resolved_at IS NULL';
    const stmt = this.db.prepare(`
      SELECT id, repo_path, anomaly_type, severity, description, detected_at, metadata
      FROM anomalies
      ${whereClause}
      ORDER BY detected_at DESC
    `);

    const rows = (repoPath ? stmt.all(repoPath) : stmt.all()) as Array<{
      id: number;
      repo_path: string;
      anomaly_type: string;
      severity: string;
      description: string;
      detected_at: number;
      metadata: string | null;
    }>;

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  /**
   * Mark an anomaly as resolved
   */
  resolveAnomaly(anomalyId: number): void {
    this.db.prepare('UPDATE anomalies SET resolved_at = ? WHERE id = ?').run(Date.now(), anomalyId);
  }

  /**
   * Save health score history
   */
  saveHealthScore(
    repoPath: string,
    healthScore: number,
    factors: Record<string, number>
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO repo_health_history (repo_path, health_score, factors, recorded_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(repoPath, healthScore, JSON.stringify(factors), Date.now());
  }

  /**
   * Get health score history for a repo
   */
  getHealthHistory(repoPath: string, days: number = 30): Array<{
    health_score: number;
    factors: Record<string, number>;
    recorded_at: number;
  }> {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const stmt = this.db.prepare(`
      SELECT health_score, factors, recorded_at
      FROM repo_health_history
      WHERE repo_path = ? AND recorded_at >= ?
      ORDER BY recorded_at DESC
    `);

    const rows = stmt.all(repoPath, cutoffTime) as Array<{
      health_score: number;
      factors: string;
      recorded_at: number;
    }>;

    return rows.map((row) => ({
      health_score: row.health_score,
      factors: JSON.parse(row.factors),
      recorded_at: row.recorded_at,
    }));
  }

  /**
   * Log an action execution
   */
  logAction(
    actionId: string,
    actionType: string,
    status: 'success' | 'failed' | 'cancelled',
    reposAffected: number = 0,
    rollbackAvailable: boolean = false,
    details?: Record<string, any>
  ): number {
    const stmt = this.db.prepare(`
      INSERT INTO action_log (action_id, action_type, timestamp, status, repos_affected, rollback_available, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      actionId,
      actionType,
      Date.now(),
      status,
      reposAffected,
      rollbackAvailable ? 1 : 0,
      details ? JSON.stringify(details) : null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Get recent actions
   */
  getRecentActions(limit: number = 50): Array<{
    id: number;
    action_id: string;
    action_type: string;
    timestamp: number;
    status: string;
    repos_affected: number;
    rollback_available: boolean;
    details: Record<string, any> | null;
  }> {
    const stmt = this.db.prepare(`
      SELECT id, action_id, action_type, timestamp, status, repos_affected, rollback_available, details
      FROM action_log
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as Array<{
      id: number;
      action_id: string;
      action_type: string;
      timestamp: number;
      status: string;
      repos_affected: number;
      rollback_available: number;
      details: string | null;
    }>;

    return rows.map((row) => ({
      ...row,
      rollback_available: row.rollback_available === 1,
      details: row.details ? JSON.parse(row.details) : null,
    }));
  }

  /**
   * Save scheduled task
   */
  saveScheduledTask(task: {
    id: string;
    name: string;
    action: string;
    schedule: string;
    custom_cron?: string;
    enabled: boolean;
    last_run: number | null;
    next_run: number;
    params: Record<string, any>;
    priority: number;
    created_at: number;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO scheduled_tasks
      (id, name, action, schedule, custom_cron, enabled, last_run, next_run, params, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id,
      task.name,
      task.action,
      task.schedule,
      task.custom_cron || null,
      task.enabled ? 1 : 0,
      task.last_run,
      task.next_run,
      JSON.stringify(task.params),
      task.priority,
      task.created_at
    );
  }

  /**
   * Get all scheduled tasks
   */
  getScheduledTasks(): Array<{
    id: string;
    name: string;
    action: string;
    schedule: string;
    custom_cron?: string;
    enabled: boolean;
    last_run: number | null;
    next_run: number;
    params: Record<string, any>;
    priority: number;
    created_at: number;
  }> {
    const rows = this.db.prepare('SELECT * FROM scheduled_tasks').all() as Array<{
      id: string;
      name: string;
      action: string;
      schedule: string;
      custom_cron: string | null;
      enabled: number;
      last_run: number | null;
      next_run: number;
      params: string;
      priority: number;
      created_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      action: row.action,
      schedule: row.schedule,
      custom_cron: row.custom_cron || undefined,
      enabled: row.enabled === 1,
      last_run: row.last_run,
      next_run: row.next_run,
      params: JSON.parse(row.params),
      priority: row.priority,
      created_at: row.created_at,
    }));
  }

  /**
   * Update scheduled task
   */
  updateScheduledTask(taskId: string, updates: Partial<{
    name: string;
    action: string;
    schedule: string;
    custom_cron: string;
    enabled: boolean;
    last_run: number | null;
    next_run: number;
    params: Record<string, any>;
    priority: number;
  }>): void {
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'enabled') {
        setClauses.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else if (key === 'params') {
        setClauses.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return;

    values.push(taskId);
    this.db.prepare(`UPDATE scheduled_tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  /**
   * Delete scheduled task
   */
  deleteScheduledTask(taskId: string): void {
    this.db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(taskId);
  }

  /**
   * Save triggered action
   */
  saveTriggeredAction(action: {
    id: string;
    name: string;
    trigger: string;
    action: string;
    condition?: string;
    enabled: boolean;
    params: Record<string, any>;
    priority: number;
    created_at: number;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO triggered_actions
      (id, name, trigger, action, condition, enabled, params, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      action.id,
      action.name,
      action.trigger,
      action.action,
      action.condition || null,
      action.enabled ? 1 : 0,
      JSON.stringify(action.params),
      action.priority,
      action.created_at
    );
  }

  /**
   * Get all triggered actions
   */
  getTriggeredActions(): Array<{
    id: string;
    name: string;
    trigger: string;
    action: string;
    condition?: string;
    enabled: boolean;
    params: Record<string, any>;
    priority: number;
    created_at: number;
  }> {
    const rows = this.db.prepare('SELECT * FROM triggered_actions').all() as Array<{
      id: string;
      name: string;
      trigger: string;
      action: string;
      condition: string | null;
      enabled: number;
      params: string;
      priority: number;
      created_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      trigger: row.trigger,
      action: row.action,
      condition: row.condition || undefined,
      enabled: row.enabled === 1,
      params: JSON.parse(row.params),
      priority: row.priority,
      created_at: row.created_at,
    }));
  }

  /**
   * Delete triggered action
   */
  deleteTriggeredAction(actionId: string): void {
    this.db.prepare('DELETE FROM triggered_actions WHERE id = ?').run(actionId);
  }

  /**
   * Save queued recommendation
   */
  saveQueuedRecommendation(queued: {
    id: string;
    recommendation: any;
    queued_at: number;
    priority: string;
    expires_at: number | null;
    displayed: boolean;
    dismissed: boolean;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO queued_recommendations
      (id, recommendation, queued_at, priority, expires_at, displayed, dismissed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      queued.id,
      JSON.stringify(queued.recommendation),
      queued.queued_at,
      queued.priority,
      queued.expires_at,
      queued.displayed ? 1 : 0,
      queued.dismissed ? 1 : 0
    );
  }

  /**
   * Get all queued recommendations
   */
  getQueuedRecommendations(): Array<{
    id: string;
    recommendation: any;
    queued_at: number;
    priority: 'high' | 'medium' | 'low';
    expires_at: number | null;
    displayed: boolean;
    dismissed: boolean;
  }> {
    const rows = this.db.prepare('SELECT * FROM queued_recommendations').all() as Array<{
      id: string;
      recommendation: string;
      queued_at: number;
      priority: string;
      expires_at: number | null;
      displayed: number;
      dismissed: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      recommendation: JSON.parse(row.recommendation),
      queued_at: row.queued_at,
      priority: row.priority as 'high' | 'medium' | 'low',
      expires_at: row.expires_at,
      displayed: row.displayed === 1,
      dismissed: row.dismissed === 1,
    }));
  }

  /**
   * Update queued recommendation
   */
  updateQueuedRecommendation(queuedId: string, updates: { displayed?: boolean; dismissed?: boolean }): void {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.displayed !== undefined) {
      setClauses.push('displayed = ?');
      values.push(updates.displayed ? 1 : 0);
    }

    if (updates.dismissed !== undefined) {
      setClauses.push('dismissed = ?');
      values.push(updates.dismissed ? 1 : 0);
    }

    if (setClauses.length === 0) return;

    values.push(queuedId);
    this.db.prepare(`UPDATE queued_recommendations SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  /**
   * Delete queued recommendation
   */
  deleteQueuedRecommendation(queuedId: string): void {
    this.db.prepare('DELETE FROM queued_recommendations WHERE id = ?').run(queuedId);
  }

  /**
   * Save task execution
   */
  saveTaskExecution(execution: {
    task_id: string;
    started_at: number;
    completed_at: number | null;
    status: string;
    result: string | null;
    error: string | null;
  }): void {
    this.db.prepare(`
      INSERT INTO task_executions
      (task_id, started_at, completed_at, status, result, error)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      execution.task_id,
      execution.started_at,
      execution.completed_at,
      execution.status,
      execution.result,
      execution.error
    );
  }

  /**
   * Get task executions
   */
  getTaskExecutions(taskId?: string, limit: number = 50): Array<{
    task_id: string;
    started_at: number;
    completed_at: number | null;
    status: string;
    result: string | null;
    error: string | null;
  }> {
    let query = 'SELECT task_id, started_at, completed_at, status, result, error FROM task_executions';
    const params: any[] = [];

    if (taskId) {
      query += ' WHERE task_id = ?';
      params.push(taskId);
    }

    query += ' ORDER BY started_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params) as Array<{
      task_id: string;
      started_at: number;
      completed_at: number | null;
      status: string;
      result: string | null;
      error: string | null;
    }>;
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
