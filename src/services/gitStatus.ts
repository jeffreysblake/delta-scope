/**
 * Git status checker
 * Adapted from the original Python script, using simple-git
 */

import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import type { GitRepo, RepoStatus } from '../types/index.js';
import { getRepoName } from './gitScanner.js';
import { configManager } from './configManager.js';

/**
 * Get git status for a single repository
 */
export async function getRepoStatus(repoPath: string): Promise<GitRepo | null> {
  try {
    const git: SimpleGit = simpleGit(repoPath);

    // Check if it's actually a git repo
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return null;
    }

    // Get current branch
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);

    // Get status
    const status: StatusResult = await git.status();

    // Calculate uncommitted files
    const uncommittedFiles =
      status.modified.length +
      status.created.length +
      status.deleted.length +
      status.renamed.length +
      status.not_added.length;

    // Check if there are unpushed commits
    const unpushedCommits = status.ahead;

    // Determine overall status
    let repoStatus: RepoStatus;
    if (uncommittedFiles > 0 && unpushedCommits > 0) {
      repoStatus = 'both';
    } else if (uncommittedFiles > 0) {
      repoStatus = 'uncommitted';
    } else if (unpushedCommits > 0) {
      repoStatus = 'unpushed';
    } else {
      repoStatus = 'clean';
    }

    // Get diff stats for line changes
    const { linesAdded, linesDeleted } = await getDiffStats(git, status);

    // Get last commit info
    const { lastCommitDate, lastCommitMessage } = await getLastCommitInfo(git);

    // Get remotes
    const remotes = await git.getRemotes();

    return {
      path: repoPath,
      name: getRepoName(repoPath),
      branch: branch.trim(),
      status: repoStatus,
      linesAdded,
      linesDeleted,
      uncommittedFiles,
      unpushedCommits,
      lastCommitDate,
      lastCommitMessage,
      remotes: remotes.map((r) => r.name),
      isFavorite: configManager.isFavorite(repoPath),
    };
  } catch (error) {
    // If we can't get status, return null
    return null;
  }
}

/**
 * Get diff stats (lines added/deleted)
 */
async function getDiffStats(
  git: SimpleGit,
  status: StatusResult
): Promise<{ linesAdded: number; linesDeleted: number }> {
  try {
    // If there are no changes, return zeros
    if (
      status.files.length === 0 &&
      status.not_added.length === 0 &&
      status.modified.length === 0
    ) {
      return { linesAdded: 0, linesDeleted: 0 };
    }

    // Get diff stats
    const diffSummary = await git.diffSummary();

    return {
      linesAdded: diffSummary.insertions,
      linesDeleted: diffSummary.deletions,
    };
  } catch (error) {
    return { linesAdded: 0, linesDeleted: 0 };
  }
}

/**
 * Get last commit info
 */
async function getLastCommitInfo(
  git: SimpleGit
): Promise<{ lastCommitDate: Date | null; lastCommitMessage: string | null }> {
  try {
    const log = await git.log({ maxCount: 1 });

    if (log.latest) {
      return {
        lastCommitDate: new Date(log.latest.date),
        lastCommitMessage: log.latest.message,
      };
    }

    return { lastCommitDate: null, lastCommitMessage: null };
  } catch (error) {
    return { lastCommitDate: null, lastCommitMessage: null };
  }
}

/**
 * Get status for multiple repositories (in parallel)
 */
export async function getMultipleRepoStatus(repoPaths: string[]): Promise<GitRepo[]> {
  const promises = repoPaths.map((path) => getRepoStatus(path));
  const results = await Promise.all(promises);

  // Filter out nulls (failed repos)
  return results.filter((repo): repo is GitRepo => repo !== null);
}
