/**
 * Fast Git Repository Scanner
 * Uses find for ultra-fast repo discovery
 * Supports background scanning and cache validation for instant startup
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';
import { join, basename } from 'path';
import type { AppConfig } from '../types/index.js';
import type { DatabaseService } from './database.js';

const execAsync = promisify(exec);

export interface BasicRepo {
  path: string;
  name: string;
}

/**
 * Fast scan using find with prune
 * Finds .git directories which indicate git repositories
 * Returns repo paths in seconds instead of minutes
 * Based on benchmarks showing find with -prune is faster than ripgrep for this use case
 */
export async function fastScanForRepos(config: AppConfig): Promise<string[]> {
  const allRepoPaths: string[] = [];

  // Build prune expressions for find
  // Separate path-based (starting with /) from name-based patterns
  const pathPatterns: string[] = [];
  const namePatterns: string[] = [];

  config.excludePatterns.forEach(p => {
    if (p.startsWith('/')) {
      pathPatterns.push(p);
    } else {
      namePatterns.push(p);
    }
  });

  // Build prune clause for find command
  const pruneParts: string[] = [];

  // Add path-based exclusions
  pathPatterns.forEach(p => {
    pruneParts.push(`-path '${p}' -prune`);
  });

  // Add name-based exclusions
  namePatterns.forEach(p => {
    pruneParts.push(`-path '*/${p}' -prune`);
    pruneParts.push(`-path '*/${p}/*' -prune`);
  });

  const pruneClause = pruneParts.length > 0
    ? '\\( ' + pruneParts.join(' -o ') + ' \\) -o'
    : '';

  for (const basePath of config.basePaths) {
    try {
      // Use find with -prune for fast directory exclusion
      // This avoids descending into excluded directories entirely
      const maxDepthFlag = config.maxDepth ? `-maxdepth ${config.maxDepth}` : '';
      const findCommand = `find "${basePath}" ${maxDepthFlag} ${pruneClause} -type f -path '*/.git/HEAD' -print 2>/dev/null | sed 's/\\/\\.git\\/HEAD$//' | head -1000`;

      const { stdout } = await execAsync(findCommand, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const paths = stdout
        .trim()
        .split('\n')
        .filter(p => p && p !== '');

      allRepoPaths.push(...paths);
    } catch (error) {
      // Skip base paths that fail or timeout
      console.error(`Fast scan failed for ${basePath}:`, error);
      continue;
    }
  }

  // Remove duplicates and sort
  return Array.from(new Set(allRepoPaths)).sort();
}

/**
 * Get basic repo info without git commands (instant)
 */
export function getBasicRepoInfo(repoPath: string): BasicRepo {
  const parts = repoPath.split('/').filter(p => p);
  const name = parts[parts.length - 1] || repoPath;

  return {
    path: repoPath,
    name,
  };
}

/**
 * Validate that cached paths still exist (fast check)
 * Returns only the paths that have a valid .git/HEAD file
 */
export async function validateCachedPaths(paths: string[]): Promise<string[]> {
  const validPaths: string[] = [];

  // Check paths in parallel for speed
  const results = await Promise.allSettled(
    paths.map(async (path) => {
      try {
        await access(join(path, '.git', 'HEAD'));
        return path;
      } catch {
        return null;
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      validPaths.push(result.value);
    }
  }

  return validPaths;
}

/**
 * Background scan for new repos
 * Runs the full filesystem scan and calls callbacks for new/removed repos
 * Does not block - designed to run in background while UI is responsive
 */
export async function backgroundScanForRepos(
  config: AppConfig,
  db: DatabaseService,
  onNewRepoFound?: (path: string, name: string) => void,
  onRepoRemoved?: (path: string) => void,
  onProgress?: (scanned: number, found: number) => void
): Promise<{ newRepos: string[]; removedRepos: string[] }> {
  const disabledPaths = new Set(db.getDisabledRepos());
  const knownPaths = new Set(db.getCachedRepoPaths());

  // Run the full scan
  const allPaths = await fastScanForRepos(config);

  const newRepos: string[] = [];
  const removedRepos: string[] = [];

  // Find new repos
  for (const path of allPaths) {
    if (disabledPaths.has(path)) continue;

    if (!knownPaths.has(path)) {
      // New repo discovered
      const name = basename(path);
      db.addCachedRepo(path, name);
      newRepos.push(path);
      onNewRepoFound?.(path, name);
    } else {
      // Existing repo - update last_verified
      db.verifyCachedRepo(path);
    }
  }

  // Find removed repos (in cache but not found in scan)
  const foundPathsSet = new Set(allPaths);
  for (const cachedPath of knownPaths) {
    if (!foundPathsSet.has(cachedPath)) {
      // Repo no longer exists
      db.markRepoInvalid(cachedPath);
      removedRepos.push(cachedPath);
      onRepoRemoved?.(cachedPath);
    }
  }

  onProgress?.(allPaths.length, newRepos.length);

  return { newRepos, removedRepos };
}

/**
 * Initialize cache from a full scan (first run)
 * Populates the repo_cache table with all found repos
 */
export async function initializeCacheFromScan(
  config: AppConfig,
  db: DatabaseService
): Promise<string[]> {
  const paths = await fastScanForRepos(config);
  const disabledPaths = new Set(db.getDisabledRepos());

  // Filter out disabled repos and add to cache
  const reposToCache = paths
    .filter(p => !disabledPaths.has(p))
    .map(p => ({ path: p, name: basename(p) }));

  db.addCachedReposBatch(reposToCache);

  return reposToCache.map(r => r.path);
}
