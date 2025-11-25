/**
 * Database methods for AI intelligence features
 * Handles workflow patterns, anomalies, health tracking, feedback, and action logs
 */

import type Database from 'better-sqlite3';

export interface WorkflowPattern {
  id: number;
  name: string;
  pattern_type: string;
  repos: string[];
  steps: string[];
  frequency: number;
  confidence: number;
  first_seen: number;
  last_seen: number;
}

export interface Anomaly {
  id: number;
  repo_path: string;
  anomaly_type: string;
  severity: string;
  description: string;
  detected_at: number;
  metadata: Record<string, unknown> | null;
}

export interface HealthHistoryEntry {
  health_score: number;
  factors: Record<string, number>;
  recorded_at: number;
}

export interface ActionLogEntry {
  id: number;
  action_id: string;
  action_type: string;
  timestamp: number;
  status: string;
  repos_affected: number;
  rollback_available: boolean;
  details: Record<string, unknown> | null;
}

export interface RecommendationStats {
  total: number;
  accepted: number;
  dismissed: number;
  snoozed: number;
  acceptanceRate: number;
}

/**
 * Intelligence database operations
 */
export class IntelligenceDb {
  constructor(private db: Database.Database) {}

  saveWorkflowPattern(
    name: string, patternType: string, repos: string[], steps: string[], confidence: number
  ): number {
    const now = Date.now();
    const existing = this.db.prepare(
      `SELECT id, frequency FROM workflow_patterns WHERE name = ? AND pattern_type = ?`
    ).get(name, patternType) as { id: number; frequency: number } | undefined;

    if (existing) {
      this.db.prepare(
        `UPDATE workflow_patterns SET frequency = frequency + 1, last_seen = ?, confidence = ? WHERE id = ?`
      ).run(now, confidence, existing.id);
      return existing.id;
    }

    const result = this.db.prepare(`
      INSERT INTO workflow_patterns (name, pattern_type, repos, steps, frequency, confidence, first_seen, last_seen)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `).run(name, patternType, JSON.stringify(repos), JSON.stringify(steps), confidence, now, now);
    return result.lastInsertRowid as number;
  }

  getWorkflowPatterns(minConfidence: number = 0.5): WorkflowPattern[] {
    const rows = this.db.prepare(`
      SELECT id, name, pattern_type, repos, steps, frequency, confidence, first_seen, last_seen
      FROM workflow_patterns WHERE enabled = 1 AND confidence >= ?
      ORDER BY frequency DESC, confidence DESC
    `).all(minConfidence) as Array<{
      id: number; name: string; pattern_type: string; repos: string; steps: string;
      frequency: number; confidence: number; first_seen: number; last_seen: number;
    }>;

    return rows.map(row => ({
      ...row, repos: JSON.parse(row.repos), steps: JSON.parse(row.steps),
    }));
  }

  disableWorkflowPattern(patternId: number): void {
    this.db.prepare('UPDATE workflow_patterns SET enabled = 0 WHERE id = ?').run(patternId);
  }

  recordRecommendationFeedback(
    recommendationId: string, recommendationType: string,
    action: 'accepted' | 'dismissed' | 'snoozed',
    outcome?: 'helpful' | 'not_helpful' | 'harmful', notes?: string
  ): void {
    this.db.prepare(`
      INSERT INTO recommendation_feedback (recommendation_id, recommendation_type, action, timestamp, outcome, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(recommendationId, recommendationType, action, Date.now(), outcome || null, notes || null);
  }

  getRecommendationStats(recommendationType?: string): RecommendationStats {
    const whereClause = recommendationType ? 'WHERE recommendation_type = ?' : '';
    const stmt = this.db.prepare(`
      SELECT action, COUNT(*) as count FROM recommendation_feedback ${whereClause} GROUP BY action
    `);

    const rows = (recommendationType ? stmt.all(recommendationType) : stmt.all()) as Array<{
      action: string; count: number;
    }>;

    const stats: RecommendationStats = { total: 0, accepted: 0, dismissed: 0, snoozed: 0, acceptanceRate: 0 };

    for (const row of rows) {
      stats.total += row.count;
      if (row.action === 'accepted') stats.accepted = row.count;
      if (row.action === 'dismissed') stats.dismissed = row.count;
      if (row.action === 'snoozed') stats.snoozed = row.count;
    }

    stats.acceptanceRate = stats.total > 0 ? stats.accepted / stats.total : 0;
    return stats;
  }

  saveAnomaly(
    repoPath: string, anomalyType: string, severity: 'low' | 'medium' | 'high',
    description: string, metadata?: Record<string, unknown>
  ): number {
    const result = this.db.prepare(`
      INSERT INTO anomalies (repo_path, anomaly_type, severity, description, detected_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(repoPath, anomalyType, severity, description, Date.now(), metadata ? JSON.stringify(metadata) : null);
    return result.lastInsertRowid as number;
  }

  getAnomalies(repoPath?: string): Anomaly[] {
    const whereClause = repoPath ? 'WHERE repo_path = ? AND resolved_at IS NULL' : 'WHERE resolved_at IS NULL';
    const stmt = this.db.prepare(`
      SELECT id, repo_path, anomaly_type, severity, description, detected_at, metadata
      FROM anomalies ${whereClause} ORDER BY detected_at DESC
    `);

    const rows = (repoPath ? stmt.all(repoPath) : stmt.all()) as Array<{
      id: number; repo_path: string; anomaly_type: string; severity: string;
      description: string; detected_at: number; metadata: string | null;
    }>;

    return rows.map(row => ({
      ...row, metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  resolveAnomaly(anomalyId: number): void {
    this.db.prepare('UPDATE anomalies SET resolved_at = ? WHERE id = ?').run(Date.now(), anomalyId);
  }

  saveHealthScore(repoPath: string, healthScore: number, factors: Record<string, number>): void {
    this.db.prepare(`
      INSERT INTO repo_health_history (repo_path, health_score, factors, recorded_at) VALUES (?, ?, ?, ?)
    `).run(repoPath, healthScore, JSON.stringify(factors), Date.now());
  }

  getHealthHistory(repoPath: string, days: number = 30): HealthHistoryEntry[] {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const rows = this.db.prepare(`
      SELECT health_score, factors, recorded_at FROM repo_health_history
      WHERE repo_path = ? AND recorded_at >= ? ORDER BY recorded_at DESC
    `).all(repoPath, cutoffTime) as Array<{ health_score: number; factors: string; recorded_at: number }>;

    return rows.map(row => ({
      health_score: row.health_score, factors: JSON.parse(row.factors), recorded_at: row.recorded_at,
    }));
  }

  logAction(
    actionId: string, actionType: string, status: 'success' | 'failed' | 'cancelled',
    reposAffected: number = 0, rollbackAvailable: boolean = false, details?: Record<string, unknown>
  ): number {
    const result = this.db.prepare(`
      INSERT INTO action_log (action_id, action_type, timestamp, status, repos_affected, rollback_available, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(actionId, actionType, Date.now(), status, reposAffected, rollbackAvailable ? 1 : 0,
      details ? JSON.stringify(details) : null);
    return result.lastInsertRowid as number;
  }

  getRecentActions(limit: number = 50): ActionLogEntry[] {
    const rows = this.db.prepare(`
      SELECT id, action_id, action_type, timestamp, status, repos_affected, rollback_available, details
      FROM action_log ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as Array<{
      id: number; action_id: string; action_type: string; timestamp: number;
      status: string; repos_affected: number; rollback_available: number; details: string | null;
    }>;

    return rows.map(row => ({
      ...row, rollback_available: row.rollback_available === 1,
      details: row.details ? JSON.parse(row.details) : null,
    }));
  }
}
