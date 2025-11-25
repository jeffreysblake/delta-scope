/**
 * SQLite database service for persistent storage
 * Handles access history (frecency), search history, repo cache, and user preferences
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { SCHEMA_VERSION, applyMigrations } from './database/migrations.js';
import { SchedulerDb, type ScheduledTask, type TriggeredAction, type QueuedRecommendation, type TaskExecution } from './database/scheduler.js';
import { IntelligenceDb, type WorkflowPattern, type Anomaly, type HealthHistoryEntry, type ActionLogEntry, type RecommendationStats } from './database/intelligence.js';

interface AccessHistoryRecord {
  id?: number;
  repo_path: string;
  accessed_at: number;
  action: string;
  session_id: string;
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
  private sessionStart: Date;
  private schedulerDb: SchedulerDb;
  private intelligenceDb: IntelligenceDb;

  constructor(dbPath?: string) {
    const defaultPath = join(homedir(), '.local', 'share', 'delta-scope');
    const dbDir = dbPath ? join(dbPath, '..') : defaultPath;

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const fullPath = dbPath || join(defaultPath, 'database.db');
    this.db = new Database(fullPath);

    this.sessionStart = new Date();
    this.sessionId = `session_${this.sessionStart.getTime()}_${Math.random().toString(36).substr(2, 9)}`;

    this.initializeDatabase();
    this.schedulerDb = new SchedulerDb(this.db);
    this.intelligenceDb = new IntelligenceDb(this.db);
  }

  private initializeDatabase(): void {
    this.db.pragma('foreign_keys = ON');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);

    const versionRow = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
    const currentVersion = versionRow?.version || 0;

    if (currentVersion < SCHEMA_VERSION) {
      applyMigrations(this.db, currentVersion);
    }
  }

  // ==========================================
  // Access History & Frecency
  // ==========================================

  recordAccess(repoPath: string, action: string): void {
    this.db.prepare(`
      INSERT INTO access_history (repo_path, accessed_at, action, session_id) VALUES (?, ?, ?, ?)
    `).run(repoPath, Date.now(), action, this.sessionId);
  }

  recordSearch(query: string, resultCount: number, selectedRepoPath: string | null = null): void {
    this.db.prepare(`
      INSERT INTO search_history (query, timestamp, result_count, selected_repo_path) VALUES (?, ?, ?, ?)
    `).run(query, Date.now(), resultCount, selectedRepoPath);
  }

  getSearchHistory(limit: number = 10): string[] {
    const rows = this.db.prepare(`
      SELECT query, COUNT(*) as frequency, MAX(timestamp) as last_used
      FROM search_history WHERE query != '' GROUP BY query
      ORDER BY frequency DESC, last_used DESC LIMIT ?
    `).all(limit) as Array<{ query: string }>;
    return rows.map(row => row.query);
  }

  calculateFrecency(): void {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const getWeight = (age: number): number => {
      if (age < 4 * oneDay) return 100;
      if (age < 14 * oneDay) return 70;
      if (age < 30 * oneDay) return 50;
      if (age < 90 * oneDay) return 30;
      return 10;
    };

    const actionMultipliers: Record<string, number> = {
      view: 1.0, expand: 0.5, favorite: 2.0, search_select: 1.5,
    };

    const allAccess = this.db.prepare(`
      SELECT repo_path, accessed_at, action FROM access_history ORDER BY repo_path, accessed_at DESC
    `).all() as AccessHistoryRecord[];

    const scores = new Map<string, { score: number; count: number; lastAccessed: number }>();

    for (const record of allAccess) {
      const age = now - record.accessed_at;
      const points = getWeight(age) * (actionMultipliers[record.action] || 1.0);
      const current = scores.get(record.repo_path) || { score: 0, count: 0, lastAccessed: 0 };
      scores.set(record.repo_path, {
        score: current.score + points,
        count: current.count + 1,
        lastAccessed: Math.max(current.lastAccessed, record.accessed_at),
      });
    }

    this.db.transaction(() => {
      this.db.prepare('DELETE FROM frecency_scores').run();
      const insertStmt = this.db.prepare(`
        INSERT INTO frecency_scores (repo_path, score, access_count, last_accessed, updated_at) VALUES (?, ?, ?, ?, ?)
      `);
      for (const [repoPath, data] of scores.entries()) {
        insertStmt.run(repoPath, data.score, data.count, data.lastAccessed, now);
      }
    })();
  }

  getTopReposByFrecency(limit: number = 20): FrecencyScore[] {
    return this.db.prepare(`
      SELECT repo_path, score, access_count, last_accessed FROM frecency_scores ORDER BY score DESC LIMIT ?
    `).all(limit) as FrecencyScore[];
  }

  getFrecencyScore(repoPath: string): number {
    const row = this.db.prepare('SELECT score FROM frecency_scores WHERE repo_path = ?').get(repoPath) as { score: number } | undefined;
    return row?.score || 0;
  }

  cleanupOldHistory(): void {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    this.db.prepare('DELETE FROM access_history WHERE accessed_at < ?').run(ninetyDaysAgo);
    this.db.prepare('DELETE FROM search_history WHERE timestamp < ?').run(ninetyDaysAgo);
    this.cleanupOldSnapshots();
    this.cleanupExpiredDismissals();
  }

  getRepoStats(repoPath: string): { accessCount: number; lastAccessed: number | null; actions: Record<string, number> } {
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM access_history WHERE repo_path = ?').get(repoPath) as { count: number };
    const lastRow = this.db.prepare('SELECT MAX(accessed_at) as last FROM access_history WHERE repo_path = ?').get(repoPath) as { last: number | null };
    const actionRows = this.db.prepare(`
      SELECT action, COUNT(*) as count FROM access_history WHERE repo_path = ? GROUP BY action
    `).all(repoPath) as Array<{ action: string; count: number }>;

    const actions: Record<string, number> = {};
    for (const row of actionRows) actions[row.action] = row.count;
    return { accessCount: countRow.count, lastAccessed: lastRow.last, actions };
  }

  // ==========================================
  // Context Snapshots
  // ==========================================

  saveContextSnapshot(contextJson: string, repoCount: number, userAction: string | null = null): number {
    const result = this.db.prepare(`
      INSERT INTO context_snapshots (timestamp, context_json, repo_count, user_action) VALUES (?, ?, ?, ?)
    `).run(Date.now(), contextJson, repoCount, userAction);
    return result.lastInsertRowid as number;
  }

  getLatestContextSnapshot(): { id: number; timestamp: number; context_json: string; repo_count: number; user_action: string | null } | null {
    return this.db.prepare(`
      SELECT id, timestamp, context_json, repo_count, user_action FROM context_snapshots ORDER BY timestamp DESC LIMIT 1
    `).get() as { id: number; timestamp: number; context_json: string; repo_count: number; user_action: string | null } | null;
  }

  getContextSnapshots(startTime: number, endTime: number): Array<{ id: number; timestamp: number; context_json: string; repo_count: number; user_action: string | null }> {
    return this.db.prepare(`
      SELECT id, timestamp, context_json, repo_count, user_action FROM context_snapshots
      WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC
    `).all(startTime, endTime) as Array<{ id: number; timestamp: number; context_json: string; repo_count: number; user_action: string | null }>;
  }

  cleanupOldSnapshots(): void {
    this.db.prepare('DELETE FROM context_snapshots WHERE timestamp < ?').run(Date.now() - (30 * 24 * 60 * 60 * 1000));
  }

  // ==========================================
  // Dismissed Recommendations
  // ==========================================

  dismissRecommendation(recommendationId: string, expiresInDays?: number): void {
    const dismissedAt = Date.now();
    const expiresAt = expiresInDays ? dismissedAt + (expiresInDays * 24 * 60 * 60 * 1000) : null;
    this.db.prepare(`
      INSERT OR REPLACE INTO dismissed_recommendations (recommendation_id, dismissed_at, expires_at) VALUES (?, ?, ?)
    `).run(recommendationId, dismissedAt, expiresAt);
  }

  isRecommendationDismissed(recommendationId: string): boolean {
    const row = this.db.prepare(`
      SELECT id, expires_at FROM dismissed_recommendations WHERE recommendation_id = ?
    `).get(recommendationId) as { id: number; expires_at: number | null } | undefined;

    if (!row) return false;
    if (row.expires_at && row.expires_at < Date.now()) {
      this.db.prepare('DELETE FROM dismissed_recommendations WHERE id = ?').run(row.id);
      return false;
    }
    return true;
  }

  undismissRecommendation(recommendationId: string): void {
    this.db.prepare('DELETE FROM dismissed_recommendations WHERE recommendation_id = ?').run(recommendationId);
  }

  getDismissedRecommendations(): string[] {
    const rows = this.db.prepare(`
      SELECT recommendation_id FROM dismissed_recommendations WHERE expires_at IS NULL OR expires_at > ?
    `).all(Date.now()) as Array<{ recommendation_id: string }>;
    return rows.map(row => row.recommendation_id);
  }

  cleanupExpiredDismissals(): void {
    this.db.prepare('DELETE FROM dismissed_recommendations WHERE expires_at IS NOT NULL AND expires_at < ?').run(Date.now());
  }

  // ==========================================
  // Repo Cache (for fast startup)
  // ==========================================

  getCachedRepoPaths(): string[] {
    return (this.db.prepare('SELECT path FROM repo_cache WHERE is_valid = 1').all() as Array<{ path: string }>).map(row => row.path);
  }

  addCachedRepo(path: string, name: string): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT OR REPLACE INTO repo_cache (path, name, first_seen, last_verified, is_valid)
      VALUES (?, ?, COALESCE((SELECT first_seen FROM repo_cache WHERE path = ?), ?), ?, 1)
    `).run(path, name, path, now, now);
  }

  addCachedReposBatch(repos: Array<{ path: string; name: string }>): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO repo_cache (path, name, first_seen, last_verified, is_valid)
      VALUES (?, ?, COALESCE((SELECT first_seen FROM repo_cache WHERE path = ?), ?), ?, 1)
    `);
    this.db.transaction(() => {
      for (const repo of repos) stmt.run(repo.path, repo.name, repo.path, now, now);
    })();
  }

  markRepoInvalid(path: string): void {
    this.db.prepare('UPDATE repo_cache SET is_valid = 0 WHERE path = ?').run(path);
  }

  verifyCachedRepo(path: string): void {
    this.db.prepare('UPDATE repo_cache SET last_verified = ?, is_valid = 1 WHERE path = ?').run(Date.now(), path);
  }

  cleanupInvalidRepos(): void {
    this.db.prepare('DELETE FROM repo_cache WHERE is_valid = 0').run();
  }

  getCachedRepoCount(): number {
    return (this.db.prepare('SELECT COUNT(*) as count FROM repo_cache WHERE is_valid = 1').get() as { count: number }).count;
  }

  // ==========================================
  // Disabled Repos
  // ==========================================

  getDisabledRepos(): string[] {
    return (this.db.prepare('SELECT path FROM disabled_repos').all() as Array<{ path: string }>).map(row => row.path);
  }

  disableRepo(path: string, reason?: string): void {
    this.db.prepare('INSERT OR REPLACE INTO disabled_repos (path, disabled_at, reason) VALUES (?, ?, ?)').run(path, Date.now(), reason || null);
  }

  enableRepo(path: string): void {
    this.db.prepare('DELETE FROM disabled_repos WHERE path = ?').run(path);
  }

  isRepoDisabled(path: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM disabled_repos WHERE path = ?').get(path);
  }

  // ==========================================
  // Delegated methods to sub-modules
  // ==========================================

  // Scheduler
  saveScheduledTask(task: ScheduledTask): void { this.schedulerDb.saveScheduledTask(task); }
  getScheduledTasks(): ScheduledTask[] { return this.schedulerDb.getScheduledTasks(); }
  updateScheduledTask(taskId: string, updates: Partial<Omit<ScheduledTask, 'id' | 'created_at'>>): void { this.schedulerDb.updateScheduledTask(taskId, updates); }
  deleteScheduledTask(taskId: string): void { this.schedulerDb.deleteScheduledTask(taskId); }
  saveTriggeredAction(action: TriggeredAction): void { this.schedulerDb.saveTriggeredAction(action); }
  getTriggeredActions(): TriggeredAction[] { return this.schedulerDb.getTriggeredActions(); }
  deleteTriggeredAction(actionId: string): void { this.schedulerDb.deleteTriggeredAction(actionId); }
  saveQueuedRecommendation(queued: QueuedRecommendation): void { this.schedulerDb.saveQueuedRecommendation(queued); }
  getQueuedRecommendations(): QueuedRecommendation[] { return this.schedulerDb.getQueuedRecommendations(); }
  updateQueuedRecommendation(queuedId: string, updates: { displayed?: boolean; dismissed?: boolean }): void { this.schedulerDb.updateQueuedRecommendation(queuedId, updates); }
  deleteQueuedRecommendation(queuedId: string): void { this.schedulerDb.deleteQueuedRecommendation(queuedId); }
  saveTaskExecution(execution: TaskExecution): void { this.schedulerDb.saveTaskExecution(execution); }
  getTaskExecutions(taskId?: string, limit?: number): TaskExecution[] { return this.schedulerDb.getTaskExecutions(taskId, limit); }

  // Intelligence
  saveWorkflowPattern(name: string, patternType: string, repos: string[], steps: string[], confidence: number): number { return this.intelligenceDb.saveWorkflowPattern(name, patternType, repos, steps, confidence); }
  getWorkflowPatterns(minConfidence?: number): WorkflowPattern[] { return this.intelligenceDb.getWorkflowPatterns(minConfidence); }
  disableWorkflowPattern(patternId: number): void { this.intelligenceDb.disableWorkflowPattern(patternId); }
  recordRecommendationFeedback(recommendationId: string, recommendationType: string, action: 'accepted' | 'dismissed' | 'snoozed', outcome?: 'helpful' | 'not_helpful' | 'harmful', notes?: string): void { this.intelligenceDb.recordRecommendationFeedback(recommendationId, recommendationType, action, outcome, notes); }
  getRecommendationStats(recommendationType?: string): RecommendationStats { return this.intelligenceDb.getRecommendationStats(recommendationType); }
  saveAnomaly(repoPath: string, anomalyType: string, severity: 'low' | 'medium' | 'high', description: string, metadata?: Record<string, unknown>): number { return this.intelligenceDb.saveAnomaly(repoPath, anomalyType, severity, description, metadata); }
  getAnomalies(repoPath?: string): Anomaly[] { return this.intelligenceDb.getAnomalies(repoPath); }
  resolveAnomaly(anomalyId: number): void { this.intelligenceDb.resolveAnomaly(anomalyId); }
  saveHealthScore(repoPath: string, healthScore: number, factors: Record<string, number>): void { this.intelligenceDb.saveHealthScore(repoPath, healthScore, factors); }
  getHealthHistory(repoPath: string, days?: number): HealthHistoryEntry[] { return this.intelligenceDb.getHealthHistory(repoPath, days); }
  logAction(actionId: string, actionType: string, status: 'success' | 'failed' | 'cancelled', reposAffected?: number, rollbackAvailable?: boolean, details?: Record<string, unknown>): number { return this.intelligenceDb.logAction(actionId, actionType, status, reposAffected, rollbackAvailable, details); }
  getRecentActions(limit?: number): ActionLogEntry[] { return this.intelligenceDb.getRecentActions(limit); }

  // ==========================================
  // Session & Lifecycle
  // ==========================================

  close(): void { this.db.close(); }
  getSessionId(): string { return this.sessionId; }
  getSessionStart(): Date { return this.sessionStart; }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbInstance) dbInstance = new DatabaseService();
  return dbInstance;
}

export function closeDatabaseService(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Re-export types for consumers
export type { ScheduledTask, TriggeredAction, QueuedRecommendation, TaskExecution } from './database/scheduler.js';
export type { WorkflowPattern, Anomaly, HealthHistoryEntry, ActionLogEntry, RecommendationStats } from './database/intelligence.js';
