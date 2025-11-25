/**
 * Database migrations for delta-scope
 * Each migration is applied in sequence to update the schema
 */

import type Database from 'better-sqlite3';

export const SCHEMA_VERSION = 6;

/**
 * Apply all pending migrations from the given version
 */
export function applyMigrations(db: Database.Database, fromVersion: number): void {
  if (fromVersion < 1) {
    applyMigration1(db);
  }
  if (fromVersion < 2) {
    applyMigration2(db);
  }
  if (fromVersion < 3) {
    applyMigration3(db);
  }
  if (fromVersion < 4) {
    applyMigration4(db);
  }
  if (fromVersion < 5) {
    applyMigration5(db);
  }
  if (fromVersion < 6) {
    applyMigration6(db);
  }
}

// Migration 1: Initial schema
function applyMigration1(db: Database.Database): void {
  db.exec(`
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
  db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(1, Date.now());
}

// Migration 2: Context snapshots for AI agent
function applyMigration2(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS context_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      context_json TEXT NOT NULL,
      repo_count INTEGER NOT NULL,
      user_action TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON context_snapshots(timestamp);
  `);
  db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(2, Date.now());
}

// Migration 3: Dismissed recommendations
function applyMigration3(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dismissed_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recommendation_id TEXT NOT NULL UNIQUE,
      dismissed_at INTEGER NOT NULL,
      expires_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_dismissed_rec_id ON dismissed_recommendations(recommendation_id);
    CREATE INDEX IF NOT EXISTS idx_dismissed_expires ON dismissed_recommendations(expires_at);
  `);
  db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(3, Date.now());
}

// Migration 4: Phase 4 intelligence features
function applyMigration4(db: Database.Database): void {
  db.exec(`
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
  db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(4, Date.now());
}

// Migration 5: Phase 5 scheduler features
function applyMigration5(db: Database.Database): void {
  db.exec(`
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
  db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(5, Date.now());
}

// Migration 6: Repo path caching for fast startup
function applyMigration6(db: Database.Database): void {
  db.exec(`
    -- Cached repo paths for instant startup
    CREATE TABLE IF NOT EXISTS repo_cache (
      path TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      first_seen INTEGER NOT NULL,
      last_verified INTEGER NOT NULL,
      is_valid INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_repo_cache_valid ON repo_cache(is_valid);
    CREATE INDEX IF NOT EXISTS idx_repo_cache_last_verified ON repo_cache(last_verified);

    -- User-disabled repos (excluded from scanning)
    CREATE TABLE IF NOT EXISTS disabled_repos (
      path TEXT PRIMARY KEY,
      disabled_at INTEGER NOT NULL,
      reason TEXT
    );
  `);
  db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(6, Date.now());
}
