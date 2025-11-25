/**
 * Action Executor Service
 * Handles execution of AI agent actions with safety checks
 */

import type { GitRepo, AppConfig } from '../../types/index.js';
import { updateConfig } from '../configManager.js';
import { getDatabaseService } from '../database.js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { SafetyLevel, ActionSafety, ActionDefinition, ActionResult } from './types.js';
import { executeSmartCommit, executeBatchPull, executeBatchStash, executeBranchCleanup } from './gitOps.js';

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
        if (params.pattern) {
          return repos.filter(r =>
            r.name.toLowerCase().includes((params.pattern as string).toLowerCase())
          );
        }
        if (params.repo_paths) {
          return repos.filter(r => (params.repo_paths as string[]).includes(r.path));
        }
        return [];

      case 'batch_pull':
      case 'batch_stash':
      case 'smart_commit':
        if (params.repo_paths) {
          return repos.filter(r => (params.repo_paths as string[]).includes(r.path));
        }
        if (params.filter === 'uncommitted') {
          return repos.filter(r => r.status === 'uncommitted' || r.status === 'both');
        }
        if (params.filter === 'unpushed') {
          return repos.filter(r => r.status === 'unpushed' || r.status === 'both');
        }
        return [];

      case 'branch_cleanup':
        if (params.repo_paths) {
          return repos.filter(r => (params.repo_paths as string[]).includes(r.path));
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
          result = await this.executeSaveFilterPreset(action.params as { name: string; filter: string });
          break;

        case 'generate_report':
          result = await this.executeGenerateReport(repos, action.params);
          break;

        case 'optimize_config':
          result = await this.executeOptimizeConfig();
          break;

        case 'smart_commit':
          result = await executeSmartCommit(affectedRepos, action.params as { message?: string });
          break;

        case 'batch_pull':
          result = await executeBatchPull(affectedRepos);
          break;

        case 'batch_stash':
          result = await executeBatchStash(affectedRepos);
          break;

        case 'branch_cleanup':
          result = await executeBranchCleanup(affectedRepos);
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

  /**
   * Batch favorite multiple repositories
   */
  private async executeBatchFavorite(repos: GitRepo[]): Promise<ActionResult> {
    const currentFavorites = new Set(this.config.favorites);

    for (const repo of repos) {
      currentFavorites.add(repo.path);
    }

    updateConfig({ favorites: Array.from(currentFavorites) });

    return {
      success: true,
      message: `Added ${repos.length} repositories to favorites`,
      affected_repos: repos.map(r => r.path),
      details: { added_count: repos.length },
    };
  }

  /**
   * Save a filter preset
   */
  private async executeSaveFilterPreset(params: { name: string; filter: string }): Promise<ActionResult> {
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
      details: { preset_name: params.name, filter: params.filter },
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
    const reportPath = params.output_path || join(homedir(), 'delta-scope-report.md');

    const statusCounts = { clean: 0, uncommitted: 0, unpushed: 0, both: 0 };
    for (const repo of repos) {
      statusCounts[repo.status]++;
    }

    const needsAttention = repos.filter(r => r.status === 'uncommitted' || r.status === 'both');

    const lines: string[] = [
      '# Delta-Scope Repository Report',
      '',
      `**Generated:** ${timestamp}`,
      `**Total Repositories:** ${repos.length}`,
      '',
      '## Summary',
      '',
      `- ✓ Clean: ${statusCounts.clean}`,
      `- ⚠ Uncommitted: ${statusCounts.uncommitted}`,
      `- ⬆ Unpushed: ${statusCounts.unpushed}`,
      `- ⚡ Both: ${statusCounts.both}`,
      '',
    ];

    if (needsAttention.length > 0) {
      lines.push('## Repositories Needing Attention', '');
      for (const repo of needsAttention) {
        lines.push(
          `### ${repo.name}`,
          `- **Path:** ${repo.path}`,
          `- **Branch:** ${repo.branch}`,
          `- **Status:** ${repo.status}`,
          `- **Uncommitted Files:** ${repo.uncommittedFiles}`,
          `- **Unpushed Commits:** ${repo.unpushedCommits}`,
          `- **Last Commit:** ${repo.lastCommitDate?.toISOString() || 'N/A'}`,
          ''
        );
      }
    }

    lines.push('## All Repositories', '', '| Name | Branch | Status | Files | Commits |');
    lines.push('|------|--------|--------|-------|---------|');

    const statusEmoji: Record<string, string> = { clean: '✓', uncommitted: '⚠', unpushed: '⬆', both: '⚡' };
    for (const repo of repos) {
      lines.push(
        `| ${repo.name} | ${repo.branch} | ${statusEmoji[repo.status]} ${repo.status} | ${repo.uncommittedFiles} | ${repo.unpushedCommits} |`
      );
    }

    writeFileSync(reportPath, lines.join('\n'));

    return {
      success: true,
      message: `Report generated at ${reportPath}`,
      affected_repos: [],
      details: { report_path: reportPath, total_repos: repos.length, needs_attention: needsAttention.length },
    };
  }

  /**
   * Optimize configuration based on usage patterns
   */
  private async executeOptimizeConfig(): Promise<ActionResult> {
    const topRepos = this.db.getTopReposByFrecency(10);
    const changes: string[] = [];

    const currentFavorites = new Set(this.config.favorites);
    let addedToFavorites = 0;

    for (const repo of topRepos.slice(0, 5)) {
      if (!currentFavorites.has(repo.repo_path)) {
        currentFavorites.add(repo.repo_path);
        addedToFavorites++;
      }
    }

    if (addedToFavorites > 0) {
      updateConfig({ favorites: Array.from(currentFavorites) });
      changes.push(`Added ${addedToFavorites} frequently-used repos to favorites`);
    }

    return {
      success: true,
      message: changes.length > 0 ? changes.join('; ') : 'Configuration already optimized',
      affected_repos: [],
      details: { changes },
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
