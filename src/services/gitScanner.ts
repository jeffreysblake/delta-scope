/**
 * Git repository scanner
 * Finds all .git directories within configured base paths
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { AppConfig } from '../types/index.js';

/**
 * Recursively scan directories for git repositories
 */
async function scanDirectory(
  dirPath: string,
  excludePatterns: string[],
  currentDepth: number,
  maxDepth: number,
  showHidden: boolean
): Promise<string[]> {
  if (currentDepth > maxDepth) {
    return [];
  }

  const repos: string[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    // Check if current directory is a git repo
    const hasGit = entries.some((entry) => entry.name === '.git' && entry.isDirectory());

    if (hasGit) {
      repos.push(dirPath);
      // Don't traverse subdirectories of git repos
      return repos;
    }

    // Scan subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      // Skip hidden directories unless showHidden is true
      if (!showHidden && entry.name.startsWith('.')) {
        continue;
      }

      // Skip excluded patterns
      if (excludePatterns.some((pattern) => entry.name.includes(pattern))) {
        continue;
      }

      const subDirPath = join(dirPath, entry.name);
      const subRepos = await scanDirectory(
        subDirPath,
        excludePatterns,
        currentDepth + 1,
        maxDepth,
        showHidden
      );
      repos.push(...subRepos);
    }
  } catch (error) {
    // Skip directories we can't access (permissions, etc.)
    // Silent failure - we'll just not include them
  }

  return repos;
}

/**
 * Scan all configured base paths for git repositories
 */
export async function scanForRepos(config: AppConfig): Promise<string[]> {
  const allRepos: string[] = [];

  for (const basePath of config.basePaths) {
    try {
      // Check if base path exists
      await stat(basePath);

      const repos = await scanDirectory(
        basePath,
        config.excludePatterns,
        0,
        config.maxDepth,
        config.showHidden
      );

      allRepos.push(...repos);
    } catch (error) {
      // Base path doesn't exist or is inaccessible - skip it
      continue;
    }
  }

  // Remove duplicates and sort
  return Array.from(new Set(allRepos)).sort();
}

/**
 * Get a user-friendly name for a repo (last part of path)
 */
export function getRepoName(repoPath: string): string {
  const parts = repoPath.split('/');
  return parts[parts.length - 1] || repoPath;
}
