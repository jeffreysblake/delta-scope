/**
 * Git repository scanner
 * Finds all .git directories within configured base paths
 */

import { readdir, stat, lstat } from 'fs/promises';
import { join } from 'path';
import type { AppConfig } from '../types/index.js';

/**
 * Check if path should be excluded based on patterns
 * Supports both name-based and full path-based exclusions
 */
function shouldExcludePath(fullPath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Path-based exclusion (starts with / or contains /)
    if (pattern.startsWith('/')) {
      return fullPath.startsWith(pattern) ||
             fullPath.includes(`${pattern}/`) ||
             fullPath === pattern;
    }
    // Name-based exclusion (for backwards compatibility)
    const pathParts = fullPath.split('/');
    const lastName = pathParts[pathParts.length - 1];
    return lastName.includes(pattern) || fullPath.includes(`/${pattern}/`);
  });
}

/**
 * Check if directory is a known system directory that should be skipped early
 */
function isSystemDirectory(path: string): boolean {
  // Only skip kernel/runtime directories - /tmp is allowed as users may have repos there
  const systemPrefixes = [
    '/proc/',
    '/sys/',
    '/dev/',
    '/run/',
  ];
  return systemPrefixes.some((prefix) => path.startsWith(prefix));
}

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

  // Early bailout for known system directories
  if (isSystemDirectory(dirPath)) {
    return [];
  }

  // Check if current directory should be excluded
  if (shouldExcludePath(dirPath, excludePatterns)) {
    return [];
  }

  const repos: string[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    // Check if current directory is a git repo
    const hasGit = entries.some((entry) => entry.name === '.git' && entry.isDirectory());

    if (hasGit) {
      repos.push(dirPath);
      // Continue scanning subdirectories to find nested repos (common in monorepos)
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

      const subDirPath = join(dirPath, entry.name);

      // Check for symlinks and skip them
      try {
        const linkStats = await lstat(subDirPath);
        if (linkStats.isSymbolicLink()) {
          // Skip symlinks to avoid network drives and duplicates
          continue;
        }
      } catch {
        // If lstat fails, skip this entry
        continue;
      }

      // Skip excluded paths (path-based check)
      if (shouldExcludePath(subDirPath, excludePatterns)) {
        continue;
      }

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
