/**
 * Git operations service
 * Handles dangerous git operations like commit, push, and stash
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { retryGitOperation, retryGitPush } from '../utils/retry.js';

export interface GitOperationResult {
  success: boolean;
  message: string;
  details?: string;
}

/**
 * Stash uncommitted changes in a repository
 * @param repoPath - Absolute path to the git repository
 * @param message - Optional custom stash message (defaults to auto-generated timestamp)
 * @returns Promise with operation result containing success status and details
 */
export async function stashChanges(repoPath: string, message?: string): Promise<GitOperationResult> {
  try {
    const git: SimpleGit = simpleGit(repoPath);

    // Check if there are changes to stash
    const status = await retryGitOperation(() => git.status());
    const hasChanges =
      status.modified.length > 0 ||
      status.created.length > 0 ||
      status.deleted.length > 0 ||
      status.renamed.length > 0 ||
      status.not_added.length > 0;

    if (!hasChanges) {
      return {
        success: false,
        message: 'No changes to stash',
      };
    }

    // Perform stash with retry
    const stashMessage = message || `delta-scope auto-stash ${new Date().toISOString()}`;
    await retryGitOperation(() => git.stash(['push', '-m', stashMessage]));

    return {
      success: true,
      message: 'Changes stashed successfully',
      details: stashMessage,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to stash changes',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Commit changes in a repository
 * @param repoPath - Absolute path to the git repository
 * @param message - Commit message
 * @param addAll - If true, stages all changes before committing (git add .)
 * @returns Promise with operation result containing success status and commit details
 */
export async function commitChanges(
  repoPath: string,
  message: string,
  addAll = false
): Promise<GitOperationResult> {
  try {
    const git: SimpleGit = simpleGit(repoPath);

    // Check if there are changes to commit
    const status = await retryGitOperation(() => git.status());

    if (addAll) {
      // Check if there are any changes at all
      const hasChanges =
        status.modified.length > 0 ||
        status.created.length > 0 ||
        status.deleted.length > 0 ||
        status.renamed.length > 0 ||
        status.not_added.length > 0;

      if (!hasChanges) {
        return {
          success: false,
          message: 'No changes to commit',
        };
      }

      // Add all changes with retry
      await retryGitOperation(() => git.add('.'));
    } else {
      // Only commit staged changes
      if (status.staged.length === 0) {
        return {
          success: false,
          message: 'No staged changes to commit',
        };
      }
    }

    // Perform commit with retry
    const result = await retryGitOperation(() => git.commit(message));

    return {
      success: true,
      message: 'Changes committed successfully',
      details: `Commit ${result.commit} created`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to commit changes',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Push changes to remote repository
 * @param repoPath - Absolute path to the git repository
 * @param remote - Remote name (defaults to 'origin')
 * @param branch - Branch name (defaults to current branch)
 * @returns Promise with operation result containing success status and push details
 */
export async function pushChanges(
  repoPath: string,
  remote = 'origin',
  branch?: string
): Promise<GitOperationResult> {
  try {
    const git: SimpleGit = simpleGit(repoPath);

    // Get current branch if not specified
    const currentBranch = branch || (await retryGitOperation(() => git.revparse(['--abbrev-ref', 'HEAD'])));

    // Check if there are commits to push
    const status = await retryGitOperation(() => git.status());
    if (status.ahead === 0) {
      return {
        success: false,
        message: 'No commits to push',
      };
    }

    // Perform push with retry (4 retries with 2s, 4s, 8s, 16s backoff)
    await retryGitPush(() => git.push(remote, currentBranch));

    return {
      success: true,
      message: 'Changes pushed successfully',
      details: `Pushed ${status.ahead} commit(s) to ${remote}/${currentBranch}`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to push changes',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute multiple git operations across multiple repositories in batch
 * @param repoPaths - Array of absolute paths to git repositories
 * @param operation - Type of git operation to perform
 * @param options - Operation-specific options
 * @param options.message - Commit or stash message
 * @param options.addAll - Whether to stage all changes before committing
 * @param options.remote - Remote name for push operations
 * @param options.branch - Branch name for push operations
 * @returns Promise with Map of repo paths to operation results
 */
export async function executeGitOperationBatch(
  repoPaths: string[],
  operation: 'stash' | 'commit' | 'push',
  options?: {
    message?: string;
    addAll?: boolean;
    remote?: string;
    branch?: string;
  }
): Promise<Map<string, GitOperationResult>> {
  const results = new Map<string, GitOperationResult>();

  for (const repoPath of repoPaths) {
    let result: GitOperationResult;

    switch (operation) {
      case 'stash':
        result = await stashChanges(repoPath, options?.message);
        break;
      case 'commit':
        result = await commitChanges(repoPath, options?.message || 'Automated commit', options?.addAll);
        break;
      case 'push':
        result = await pushChanges(repoPath, options?.remote, options?.branch);
        break;
    }

    results.set(repoPath, result);
  }

  return results;
}
