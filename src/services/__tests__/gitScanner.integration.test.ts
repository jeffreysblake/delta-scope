import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scanForRepos } from '../gitScanner.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { AppConfig } from '../../types/index.js';

describe('gitScanner (integration)', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `delta-scope-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should find git repositories', async () => {
    // Create test directory structure:
    // testDir/
    //   repo1/.git/
    //   repo2/.git/
    //   not-a-repo/

    const repo1 = join(testDir, 'repo1');
    const repo2 = join(testDir, 'repo2');
    const notARepo = join(testDir, 'not-a-repo');

    await mkdir(join(repo1, '.git'), { recursive: true });
    await mkdir(join(repo2, '.git'), { recursive: true });
    await mkdir(notARepo, { recursive: true });

    const config: AppConfig = {
      basePaths: [testDir],
      excludePatterns: [],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 5,
      showHidden: false,
    };

    const repos = await scanForRepos(config);

    expect(repos).toHaveLength(2);
    expect(repos).toContain(repo1);
    expect(repos).toContain(repo2);
    expect(repos).not.toContain(notARepo);
  });

  it('should respect exclude patterns', async () => {
    // Create test directory structure:
    // testDir/
    //   good-repo/.git/
    //   node_modules/bad-repo/.git/
    //   dist/another-bad/.git/

    const goodRepo = join(testDir, 'good-repo');
    const badRepo1 = join(testDir, 'node_modules', 'bad-repo');
    const badRepo2 = join(testDir, 'dist', 'another-bad');

    await mkdir(join(goodRepo, '.git'), { recursive: true });
    await mkdir(join(badRepo1, '.git'), { recursive: true });
    await mkdir(join(badRepo2, '.git'), { recursive: true });

    const config: AppConfig = {
      basePaths: [testDir],
      excludePatterns: ['node_modules', 'dist'],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 5,
      showHidden: false,
    };

    const repos = await scanForRepos(config);

    expect(repos).toHaveLength(1);
    expect(repos).toContain(goodRepo);
    expect(repos).not.toContain(badRepo1);
    expect(repos).not.toContain(badRepo2);
  });

  it('should respect maxDepth setting', async () => {
    // Create nested structure:
    // testDir/
    //   level1/.git/
    //   level1/level2/.git/
    //   level1/level2/level3/.git/

    const level1 = join(testDir, 'level1');
    const level2 = join(level1, 'level2');
    const level3 = join(level2, 'level3');

    await mkdir(join(level1, '.git'), { recursive: true });
    await mkdir(join(level2, '.git'), { recursive: true });
    await mkdir(join(level3, '.git'), { recursive: true });

    const config: AppConfig = {
      basePaths: [testDir],
      excludePatterns: [],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 1, // Only go 1 level deep
      showHidden: false,
    };

    const repos = await scanForRepos(config);

    // Should only find level1 because it's within maxDepth
    // level2 and level3 won't be traversed
    expect(repos).toHaveLength(1);
    expect(repos).toContain(level1);
  });

  it('should skip hidden directories when showHidden is false', async () => {
    // Create test directory structure:
    // testDir/
    //   visible-repo/.git/
    //   .hidden-repo/.git/

    const visibleRepo = join(testDir, 'visible-repo');
    const hiddenRepo = join(testDir, '.hidden-repo');

    await mkdir(join(visibleRepo, '.git'), { recursive: true });
    await mkdir(join(hiddenRepo, '.git'), { recursive: true });

    const config: AppConfig = {
      basePaths: [testDir],
      excludePatterns: [],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 5,
      showHidden: false,
    };

    const repos = await scanForRepos(config);

    expect(repos).toHaveLength(1);
    expect(repos).toContain(visibleRepo);
    expect(repos).not.toContain(hiddenRepo);
  });

  it('should include hidden directories when showHidden is true', async () => {
    const visibleRepo = join(testDir, 'visible-repo');
    const hiddenRepo = join(testDir, '.hidden-repo');

    await mkdir(join(visibleRepo, '.git'), { recursive: true });
    await mkdir(join(hiddenRepo, '.git'), { recursive: true });

    const config: AppConfig = {
      basePaths: [testDir],
      excludePatterns: [],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 5,
      showHidden: true,
    };

    const repos = await scanForRepos(config);

    expect(repos).toHaveLength(2);
    expect(repos).toContain(visibleRepo);
    expect(repos).toContain(hiddenRepo);
  });

  it('should handle non-existent base paths gracefully', async () => {
    const config: AppConfig = {
      basePaths: ['/path/that/does/not/exist', testDir],
      excludePatterns: [],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 5,
      showHidden: false,
    };

    const repos = await scanForRepos(config);

    // Should only scan testDir, skip non-existent path
    expect(repos).toBeInstanceOf(Array);
  });

  it('should not traverse into git repos (nested repos)', async () => {
    // Create test directory structure:
    // testDir/
    //   parent-repo/.git/
    //   parent-repo/subdir/nested-repo/.git/

    const parentRepo = join(testDir, 'parent-repo');
    const nestedRepo = join(parentRepo, 'subdir', 'nested-repo');

    await mkdir(join(parentRepo, '.git'), { recursive: true });
    await mkdir(join(nestedRepo, '.git'), { recursive: true });

    const config: AppConfig = {
      basePaths: [testDir],
      excludePatterns: [],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 10,
      showHidden: false,
    };

    const repos = await scanForRepos(config);

    // Should only find parent-repo, not nested-repo
    // because we stop traversing once we find a .git directory
    expect(repos).toHaveLength(1);
    expect(repos).toContain(parentRepo);
    expect(repos).not.toContain(nestedRepo);
  });

  it('should deduplicate repos from multiple base paths', async () => {
    const repo = join(testDir, 'shared-repo');
    await mkdir(join(repo, '.git'), { recursive: true });

    const config: AppConfig = {
      basePaths: [testDir, testDir], // Same path twice
      excludePatterns: [],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 5,
      showHidden: false,
    };

    const repos = await scanForRepos(config);

    // Should deduplicate
    expect(repos).toHaveLength(1);
    expect(repos).toContain(repo);
  });

  it('should return sorted results', async () => {
    const repoC = join(testDir, 'c-repo');
    const repoA = join(testDir, 'a-repo');
    const repoB = join(testDir, 'b-repo');

    await mkdir(join(repoC, '.git'), { recursive: true });
    await mkdir(join(repoA, '.git'), { recursive: true });
    await mkdir(join(repoB, '.git'), { recursive: true });

    const config: AppConfig = {
      basePaths: [testDir],
      excludePatterns: [],
      theme: 'dark',
      refreshInterval: 60,
      favorites: [],
      maxDepth: 5,
      showHidden: false,
    };

    const repos = await scanForRepos(config);

    expect(repos).toHaveLength(3);
    // Should be sorted alphabetically
    expect(repos[0]).toBe(repoA);
    expect(repos[1]).toBe(repoB);
    expect(repos[2]).toBe(repoC);
  });
});
