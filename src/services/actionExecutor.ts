/**
 * Action Executor Service
 * Handles execution of AI agent actions with safety checks
 */

import type { GitRepo, AppConfig } from '../types/index.js';
import { getConfigManager } from './configManager.js';
import { getDatabaseService } from './database.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
  params: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  affected_repos: string[];
  details?: Record<string, any>;
  rollback_id?: string;
}

/**
 * Action Executor Service
 */
export class ActionExecutorService {
  private config: AppConfig;
  private db: ReturnType<typeof getDatabaseService>;

  constructor(config: AppConfig) {
    this.config = config;
    this.db = getDatabaseService();
  }

  /**
   * Validate an action before execution
   */
  validateAction(action: ActionDefinition, repos: GitRepo[]): ActionSafety {
    const warnings: string[] = [];
    let level: SafetyLevel = 'safe';
    let requires_confirmation = false;
    let reversible = true;
    let preview_available = false;

    // Determine safety based on action type
    switch (action.type) {
      case 'batch_favorite':
      case 'save_filter_preset':
      case 'view_repo':
      case 'apply_filter':
      case 'change_sort':
      case 'refresh':
      case 'generate_report':
        level = 'safe';
        reversible = true;
        break;

      case 'optimize_config':
        level = 'safe';
        requires_confirmation = true;
        reversible = true;
        warnings.push('Will modify settings.json');
        break;

      case 'batch_pull':
        level = 'cautious';
        requires_confirmation = true;
        reversible = false;
        preview_available = true;
        warnings.push('May cause merge conflicts');
        warnings.push('Cannot be undone');
        break;

      case 'smart_commit':
        level = 'cautious';
        requires_confirmation = true;
        reversible = false;
        warnings.push('Will create commits in repositories');
        break;

      case 'batch_stash':
        level = 'cautious';
        requires_confirmation = true;
        reversible = true;
        warnings.push('Uncommitted changes will be stashed');
        break;

      case 'branch_cleanup':
        level = 'destructive';
        requires_confirmation = true;
        reversible = false;
        warnings.push('Will delete local branches');
        warnings.push('Cannot be undone');
        break;
    }

    // Get affected repos
    const affectedRepos = this.getAffectedRepos(action, repos);

    if (affectedRepos.length > 5) {
      warnings.push(`Action will affect ${affectedRepos.length} repositories`);
      requires_confirmation = true;
    }

    return {
      level,
      requires_confirmation,
      reversible,
      preview_available,
      affected_count: affectedRepos.length,
      warnings,
    };
  }

  /**
   * Get repositories affected by an action
   */
  private getAffectedRepos(action: ActionDefinition, repos: GitRepo[]): GitRepo[] {
    const { type, params } = action;

    switch (type) {
      case 'batch_favorite':
        // Repos matching pattern
        if (params.pattern) {
          return repos.filter(r =>
            r.name.toLowerCase().includes(params.pattern.toLowerCase())
          );
        }
        if (params.repo_paths) {
          return repos.filter(r => params.repo_paths.includes(r.path));
        }
        return [];

      case 'batch_pull':
      case 'batch_stash':
      case 'smart_commit':
        // Specific repos
        if (params.repo_paths) {
          return repos.filter(r => params.repo_paths.includes(r.path));
        }
        // Or repos with uncommitted/unpushed changes
        if (params.filter === 'uncommitted') {
          return repos.filter(r => r.status === 'uncommitted' || r.status === 'both');
        }
        if (params.filter === 'unpushed') {
          return repos.filter(r => r.status === 'unpushed' || r.status === 'both');
        }
        return [];

      case 'branch_cleanup':
        // Repos with merged branches
        if (params.repo_paths) {
          return repos.filter(r => params.repo_paths.includes(r.path));
        }
        return [];

      default:
        return [];
    }
  }

  /**
   * Execute an action
   */
  async executeAction(action: ActionDefinition, repos: GitRepo[]): Promise<ActionResult> {
    const startTime = Date.now();
    const affectedRepos = this.getAffectedRepos(action, repos);

    try {
      let result: ActionResult;

      switch (action.type) {
        case 'batch_favorite':
          result = await this.executeBatchFavorite(affectedRepos);
          break;

        case 'save_filter_preset':
          result = await this.executeSaveFilterPreset(action.params);
          break;

        case 'generate_report':
          result = await this.executeGenerateReport(repos, action.params);
          break;

        case 'optimize_config':
          result = await this.executeOptimizeConfig();
          break;

        case 'smart_commit':
          result = await this.executeSmartCommit(affectedRepos, action.params);
          break;

        case 'batch_pull':
          result = await this.executeBatchPull(affectedRepos);
          break;

        case 'batch_stash':
          result = await this.executeBatchStash(affectedRepos);
          break;

        case 'branch_cleanup':
          result = await this.executeBranchCleanup(affectedRepos);
          break;

        default:
          result = {
            success: false,
            message: `Unknown action type: ${action.type}`,
            affected_repos: [],
          };
      }

      // Log action to database
      this.db.logAction(
        action.id,
        action.type,
        result.success ? 'success' : 'failed',
        affectedRepos.length,
        result.rollback_id !== undefined,
        {
          ...result.details,
          duration_ms: Date.now() - startTime,
        }
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log failure
      this.db.logAction(
        action.id,
        action.type,
        'failed',
        affectedRepos.length,
        false,
        {
          error: errorMessage,
          duration_ms: Date.now() - startTime,
        }
      );

      return {
        success: false,
        message: `Action failed: ${errorMessage}`,
        affected_repos: affectedRepos.map(r => r.path),
      };
    }
  }

  // ============================================
  // Safe Actions
  // ============================================

  /**
   * Batch favorite multiple repositories
   */
  private async executeBatchFavorite(repos: GitRepo[]): Promise<ActionResult> {
    const configManager = getConfigManager();
    const currentFavorites = new Set(this.config.favorites);

    for (const repo of repos) {
      currentFavorites.add(repo.path);
    }

    configManager.updateConfig({
      favorites: Array.from(currentFavorites),
    });

    return {
      success: true,
      message: `Added ${repos.length} repositories to favorites`,
      affected_repos: repos.map(r => r.path),
      details: {
        added_count: repos.length,
      },
    };
  }

  /**
   * Save a filter preset
   */
  private async executeSaveFilterPreset(params: {
    name: string;
    filter: string;
  }): Promise<ActionResult> {
    // For now, store in a simple format
    // In the future, could extend config to support filter presets
    const presetsPath = join(homedir(), '.config', 'delta-scope', 'filter-presets.json');

    let presets: Record<string, string> = {};
    try {
      const fs = await import('fs');
      if (fs.existsSync(presetsPath)) {
        presets = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));
      }
    } catch {
      // File doesn't exist or is invalid, start fresh
    }

    presets[params.name] = params.filter;
    writeFileSync(presetsPath, JSON.stringify(presets, null, 2));

    return {
      success: true,
      message: `Saved filter preset "${params.name}"`,
      affected_repos: [],
      details: {
        preset_name: params.name,
        filter: params.filter,
      },
    };
  }

  /**
   * Generate a markdown report of repository status
   */
  private async executeGenerateReport(
    repos: GitRepo[],
    params: { output_path?: string }
  ): Promise<ActionResult> {
    const timestamp = new Date().toISOString();
    const reportPath =
      params.output_path || join(homedir(), 'delta-scope-report.md');

    const lines: string[] = [
      '# Delta-Scope Repository Report',
      '',
      `**Generated:** ${timestamp}`,
      `**Total Repositories:** ${repos.length}`,
      '',
      '## Summary',
      '',
    ];

    // Summary by status
    const statusCounts = {
      clean: 0,
      uncommitted: 0,
      unpushed: 0,
      both: 0,
    };

    for (const repo of repos) {
      statusCounts[repo.status]++;
    }

    lines.push(`- ✓ Clean: ${statusCounts.clean}`);
    lines.push(`- ⚠ Uncommitted: ${statusCounts.uncommitted}`);
    lines.push(`- ⬆ Unpushed: ${statusCounts.unpushed}`);
    lines.push(`- ⚡ Both: ${statusCounts.both}`);
    lines.push('');

    // Repos needing attention
    const needsAttention = repos.filter(
      r => r.status === 'uncommitted' || r.status === 'both'
    );

    if (needsAttention.length > 0) {
      lines.push('## Repositories Needing Attention', '');
      for (const repo of needsAttention) {
        lines.push(`### ${repo.name}`);
        lines.push(`- **Path:** ${repo.path}`);
        lines.push(`- **Branch:** ${repo.branch}`);
        lines.push(`- **Status:** ${repo.status}`);
        lines.push(`- **Uncommitted Files:** ${repo.uncommittedFiles}`);
        lines.push(`- **Unpushed Commits:** ${repo.unpushedCommits}`);
        lines.push(
          `- **Last Commit:** ${repo.lastCommitDate?.toISOString() || 'N/A'}`
        );
        lines.push('');
      }
    }

    // All repos table
    lines.push('## All Repositories', '', '| Name | Branch | Status | Files | Commits |');
    lines.push('|------|--------|--------|-------|---------|');

    for (const repo of repos) {
      const statusEmoji = {
        clean: '✓',
        uncommitted: '⚠',
        unpushed: '⬆',
        both: '⚡',
      }[repo.status];

      lines.push(
        `| ${repo.name} | ${repo.branch} | ${statusEmoji} ${repo.status} | ${repo.uncommittedFiles} | ${repo.unpushedCommits} |`
      );
    }

    writeFileSync(reportPath, lines.join('\n'));

    return {
      success: true,
      message: `Report generated at ${reportPath}`,
      affected_repos: [],
      details: {
        report_path: reportPath,
        total_repos: repos.length,
        needs_attention: needsAttention.length,
      },
    };
  }

  /**
   * Optimize configuration based on usage patterns
   */
  private async executeOptimizeConfig(): Promise<ActionResult> {
    const configManager = getConfigManager();
    const topRepos = this.db.getTopReposByFrecency(10);
    const changes: string[] = [];

    // Add top repo paths to favorites if not already there
    const currentFavorites = new Set(this.config.favorites);
    let addedToFavorites = 0;

    for (const repo of topRepos.slice(0, 5)) {
      if (!currentFavorites.has(repo.repo_path)) {
        currentFavorites.add(repo.repo_path);
        addedToFavorites++;
      }
    }

    if (addedToFavorites > 0) {
      configManager.updateConfig({
        favorites: Array.from(currentFavorites),
      });
      changes.push(`Added ${addedToFavorites} frequently-used repos to favorites`);
    }

    return {
      success: true,
      message: changes.length > 0 ? changes.join('; ') : 'Configuration already optimized',
      affected_repos: [],
      details: {
        changes,
      },
    };
  }

  // ============================================
  // Git Operations
  // ============================================

  /**
   * Generate and apply smart commits
   */
  private async executeSmartCommit(
    repos: GitRepo[],
    params: { message?: string }
  ): Promise<ActionResult> {
    const results: Array<{ repo: string; success: boolean; message: string }> = [];

    for (const repo of repos) {
      try {
        // Generate commit message if not provided
        const message =
          params.message ||
          `Update ${repo.name} (${repo.uncommittedFiles} files changed)`;

        // Stage all changes
        execSync('git add -A', { cwd: repo.path, encoding: 'utf-8' });

        // Commit
        execSync(`git commit -m "${message}"`, {
          cwd: repo.path,
          encoding: 'utf-8',
        });

        results.push({
          repo: repo.path,
          success: true,
          message: 'Committed successfully',
        });
      } catch (error) {
        results.push({
          repo: repo.path,
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      message: `Committed ${successCount}/${repos.length} repositories`,
      affected_repos: results.filter(r => r.success).map(r => r.repo),
      details: {
        results,
      },
    };
  }

  /**
   * Pull multiple repositories
   */
  private async executeBatchPull(repos: GitRepo[]): Promise<ActionResult> {
    const results: Array<{ repo: string; success: boolean; message: string }> = [];

    for (const repo of repos) {
      try {
        const output = execSync('git pull', { cwd: repo.path, encoding: 'utf-8' });

        results.push({
          repo: repo.path,
          success: true,
          message: output.trim(),
        });
      } catch (error) {
        results.push({
          repo: repo.path,
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      message: `Pulled ${successCount}/${repos.length} repositories`,
      affected_repos: results.filter(r => r.success).map(r => r.repo),
      details: {
        results,
      },
    };
  }

  /**
   * Stash uncommitted changes in multiple repositories
   */
  private async executeBatchStash(repos: GitRepo[]): Promise<ActionResult> {
    const results: Array<{ repo: string; success: boolean; message: string }> = [];

    for (const repo of repos) {
      try {
        const output = execSync('git stash', { cwd: repo.path, encoding: 'utf-8' });

        results.push({
          repo: repo.path,
          success: true,
          message: output.trim(),
        });
      } catch (error) {
        results.push({
          repo: repo.path,
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      message: `Stashed changes in ${successCount}/${repos.length} repositories`,
      affected_repos: results.filter(r => r.success).map(r => r.repo),
      details: {
        results,
      },
    };
  }

  /**
   * Cleanup merged branches
   */
  private async executeBranchCleanup(repos: GitRepo[]): Promise<ActionResult> {
    const results: Array<{ repo: string; deleted: string[]; failed: string[] }> = [];

    for (const repo of repos) {
      try {
        // Get merged branches (exclude current branch and main branches)
        const branchesOutput = execSync(
          'git branch --merged | grep -v "\\*" | grep -v "main" | grep -v "master" | grep -v "develop"',
          { cwd: repo.path, encoding: 'utf-8' }
        );

        const branches = branchesOutput
          .split('\n')
          .map(b => b.trim())
          .filter(b => b.length > 0);

        const deleted: string[] = [];
        const failed: string[] = [];

        for (const branch of branches) {
          try {
            execSync(`git branch -d "${branch}"`, {
              cwd: repo.path,
              encoding: 'utf-8',
            });
            deleted.push(branch);
          } catch {
            failed.push(branch);
          }
        }

        results.push({
          repo: repo.path,
          deleted,
          failed,
        });
      } catch (error) {
        // No merged branches or error
        results.push({
          repo: repo.path,
          deleted: [],
          failed: [],
        });
      }
    }

    const totalDeleted = results.reduce((sum, r) => sum + r.deleted.length, 0);

    return {
      success: totalDeleted > 0,
      message: `Deleted ${totalDeleted} merged branches`,
      affected_repos: results.filter(r => r.deleted.length > 0).map(r => r.repo),
      details: {
        results,
      },
    };
  }
}

// Singleton instance
let executorInstance: ActionExecutorService | null = null;

/**
 * Get or create action executor service
 */
export function getActionExecutorService(config: AppConfig): ActionExecutorService {
  if (!executorInstance) {
    executorInstance = new ActionExecutorService(config);
  }
  return executorInstance;
}

/**
 * Reset action executor service (for testing)
 */
export function resetActionExecutorService(): void {
  executorInstance = null;
}
