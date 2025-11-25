/**
 * Git Operations for Action Executor
 * Handles batch git commands: pull, stash, commit, branch cleanup
 */

import type { GitRepo } from '../../types/index.js';
import type { ActionResult } from './types.js';
import { execSync } from 'child_process';

export interface GitOpResult {
  repo: string;
  success: boolean;
  message: string;
}

export interface BranchCleanupResult {
  repo: string;
  deleted: string[];
  failed: string[];
}

/**
 * Helper to execute git command on multiple repos
 */
function executeGitOnRepos(
  repos: GitRepo[],
  command: string,
  successMsg: string
): { results: GitOpResult[]; successCount: number } {
  const results: GitOpResult[] = [];

  for (const repo of repos) {
    try {
      const output = execSync(command, { cwd: repo.path, encoding: 'utf-8' });
      results.push({
        repo: repo.path,
        success: true,
        message: output.trim() || successMsg,
      });
    } catch (error) {
      results.push({
        repo: repo.path,
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    results,
    successCount: results.filter(r => r.success).length,
  };
}

/**
 * Generate and apply smart commits
 */
export async function executeSmartCommit(
  repos: GitRepo[],
  params: { message?: string }
): Promise<ActionResult> {
  const results: GitOpResult[] = [];

  for (const repo of repos) {
    try {
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
    details: { results },
  };
}

/**
 * Pull multiple repositories
 */
export async function executeBatchPull(repos: GitRepo[]): Promise<ActionResult> {
  const { results, successCount } = executeGitOnRepos(repos, 'git pull', 'Pulled successfully');

  return {
    success: successCount > 0,
    message: `Pulled ${successCount}/${repos.length} repositories`,
    affected_repos: results.filter(r => r.success).map(r => r.repo),
    details: { results },
  };
}

/**
 * Stash uncommitted changes in multiple repositories
 */
export async function executeBatchStash(repos: GitRepo[]): Promise<ActionResult> {
  const { results, successCount } = executeGitOnRepos(repos, 'git stash', 'Stashed successfully');

  return {
    success: successCount > 0,
    message: `Stashed changes in ${successCount}/${repos.length} repositories`,
    affected_repos: results.filter(r => r.success).map(r => r.repo),
    details: { results },
  };
}

/**
 * Cleanup merged branches
 */
export async function executeBranchCleanup(repos: GitRepo[]): Promise<ActionResult> {
  const results: BranchCleanupResult[] = [];

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

      results.push({ repo: repo.path, deleted, failed });
    } catch {
      // No merged branches or error
      results.push({ repo: repo.path, deleted: [], failed: [] });
    }
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deleted.length, 0);

  return {
    success: totalDeleted > 0,
    message: `Deleted ${totalDeleted} merged branches`,
    affected_repos: results.filter(r => r.deleted.length > 0).map(r => r.repo),
    details: { results },
  };
}
