/**
 * Types for Action Executor
 */

export type ActionType =
  // Safe Actions
  | 'batch_favorite'
  | 'save_filter_preset'
  | 'generate_report'
  | 'optimize_config'
  // Git Operations
  | 'smart_commit'
  | 'batch_pull'
  | 'batch_stash'
  | 'branch_cleanup'
  // Navigation Actions (always safe)
  | 'view_repo'
  | 'apply_filter'
  | 'change_sort'
  | 'refresh';

export type SafetyLevel = 'safe' | 'cautious' | 'destructive';

export interface ActionSafety {
  level: SafetyLevel;
  requires_confirmation: boolean;
  reversible: boolean;
  preview_available: boolean;
  affected_count: number;
  warnings: string[];
}

export interface ActionDefinition {
  id: string;
  type: ActionType;
  label: string;
  description: string;
  params: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  affected_repos: string[];
  details?: Record<string, unknown>;
  rollback_id?: string;
}
