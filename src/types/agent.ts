/**
 * Types for AI Agent integration
 */

import type { GitRepo, AppConfig } from './index.js';

/**
 * Enhanced repo with agent-relevant metadata
 */
export interface EnrichedRepo extends GitRepo {
  frecency_score: number;
  days_since_commit: number | null;
  days_since_viewed: number | null;
  health_score: number;
}

/**
 * Snapshot of current scan state
 */
export interface ScanSnapshot {
  timestamp: Date;
  total_repos: number;
  repos: EnrichedRepo[];
  summary: ScanSummary;
}

/**
 * Summary statistics for a scan
 */
export interface ScanSummary {
  by_status: {
    clean: number;
    uncommitted: number;
    unpushed: number;
    both: number;
  };
  total_uncommitted_files: number;
  total_unpushed_commits: number;
  total_changes_lines: number;
  stale_repos: number; // No commits in 30+ days
  active_repos: number; // Commits in last 7 days
}

/**
 * User interaction history
 */
export interface UserHistory {
  recent_repos: string[]; // Last 10 viewed (paths)
  frequent_repos: string[]; // Top 10 by frecency (paths)
  recent_searches: string[]; // Last 20 searches
  frequent_actions: ActionCount[];
  session_start: Date;
}

/**
 * Action frequency counter
 */
export interface ActionCount {
  action: string;
  count: number;
}

/**
 * Environment information
 */
export interface EnvironmentInfo {
  os: string;
  platform: string;
  shell: string | null;
  git_version: string | null;
  terminal: string | null;
  cwd: string;
}

/**
 * Complete context bundle for AI agent
 */
export interface AgentContext {
  settings: AppConfig;
  scan_data: ScanSnapshot;
  user_history: UserHistory;
  environment: EnvironmentInfo;
}

/**
 * AI Agent configuration
 */
export interface AIAgentConfig {
  enabled: boolean;
  provider: 'anthropic' | 'openai' | 'local';
  model: string;
  apiKey?: string;
  endpoint?: string; // For local models
  timeout: number;
  maxRetries: number;
  autoAnalyze: boolean; // Run analysis on refresh
  maxRecommendations: number;
}

/**
 * Agent recommendation
 */
export interface AgentRecommendation {
  id: string;
  type: 'cleanup' | 'workflow' | 'health' | 'action' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affected_repos: string[];
  actions: RecommendedAction[];
  dismissed?: boolean;
  snoozed_until?: Date;
}

/**
 * Action that agent recommends
 */
export interface RecommendedAction {
  id: string;
  label: string;
  command: string;
  safe: boolean;
  requires_confirmation: boolean;
  args?: Record<string, unknown>;
}

/**
 * Agent response
 */
export interface AgentResponse {
  recommendations: AgentRecommendation[];
  insights: AgentInsights;
  timestamp: Date;
  processing_time_ms: number;
}

/**
 * High-level insights from agent
 */
export interface AgentInsights {
  repos_needing_attention: number;
  potential_archival: number;
  health_improving: boolean;
  workflow_patterns?: string[];
  anomalies?: string[];
}

/**
 * Agent request
 */
export interface AgentRequest {
  action: 'analyze' | 'recommend' | 'execute';
  context: AgentContext;
  prompt?: string; // Optional specific request
  constraints?: AgentConstraints;
}

/**
 * Constraints for agent behavior
 */
export interface AgentConstraints {
  max_recommendations?: number;
  priority_threshold?: 'high' | 'medium' | 'low';
  auto_execute?: boolean;
  focus?: string; // Focus on specific area
}

/**
 * Result of executing an action
 */
export interface ExecutionResult {
  success: boolean;
  action_id: string;
  message: string;
  affected_repos: string[];
  rollback_possible: boolean;
  rollback_id?: string;
}

/**
 * Validation result for an action
 */
export interface ValidationResult {
  valid: boolean;
  safe: boolean;
  warnings: string[];
  required_confirmations: string[];
}

/**
 * Agent status
 */
export type AgentStatus = 'ready' | 'analyzing' | 'error' | 'disabled' | 'not_configured';

/**
 * Context snapshot for database storage
 */
export interface ContextSnapshot {
  id?: number;
  timestamp: number;
  context_json: string;
  repo_count: number;
  user_action: string | null;
}
