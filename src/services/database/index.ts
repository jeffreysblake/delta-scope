/**
 * Database module - re-exports all database functionality
 */

export { SCHEMA_VERSION, applyMigrations } from './migrations.js';
export { SchedulerDb, type ScheduledTask, type TriggeredAction, type QueuedRecommendation, type TaskExecution } from './scheduler.js';
export { IntelligenceDb, type WorkflowPattern, type Anomaly, type HealthHistoryEntry, type ActionLogEntry, type RecommendationStats } from './intelligence.js';
