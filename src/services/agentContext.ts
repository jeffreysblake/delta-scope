/**
 * Agent Context Builder
 * Aggregates all data needed for AI agent analysis
 */

import { execSync } from 'child_process';
import { platform, release } from 'os';
import { cwd } from 'process';
import type { GitRepo, AppConfig } from '../types/index.js';
import type {
  AgentContext,
  EnrichedRepo,
  ScanSnapshot,
  ScanSummary,
  UserHistory,
  EnvironmentInfo,
  ActionCount,
  IntelligenceData,
  WorkflowPatternInfo,
  AnomalyInfo,
} from '../types/agent.js';
import { getDatabaseService } from './database.js';
import { getPatternDetectionService } from './patternDetection.js';

/**
 * Build environment information
 */
function buildEnvironmentInfo(): EnvironmentInfo {
  let gitVersion: string | null = null;
  let shell: string | null = null;
  let terminal: string | null = null;

  try {
    gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
  } catch {
    // Git not available
  }

  shell = process.env.SHELL || null;
  terminal = process.env.TERM || null;

  return {
    os: release(),
    platform: platform(),
    shell,
    git_version: gitVersion,
    terminal,
    cwd: cwd(),
  };
}

/**
 * Calculate health score for a repo (0-100)
 * Note: This is a simplified version. The full version is in patternDetection.ts
 */
function calculateHealthScore(repo: GitRepo, daysSinceCommit: number | null): number {
  let score = 100;

  // Penalize uncommitted changes
  if (repo.uncommittedFiles > 0) {
    score -= Math.min(30, repo.uncommittedFiles * 3);
  }

  // Penalize unpushed commits
  if (repo.unpushedCommits > 0) {
    score -= Math.min(20, repo.unpushedCommits * 2);
  }

  // Penalize stale repos (no commits in 30+ days)
  if (daysSinceCommit !== null) {
    if (daysSinceCommit > 90) {
      score -= 30;
    } else if (daysSinceCommit > 30) {
      score -= 15;
    }
  }

  // Penalize missing remotes
  if (repo.remotes.length === 0) {
    score -= 10;
  }

  return Math.max(0, score);
}

/**
 * Enrich a repo with agent-relevant metadata
 */
function enrichRepo(repo: GitRepo, frecencyScore: number, lastViewed: number | null): EnrichedRepo {
  const now = Date.now();
  const daysSinceCommit = repo.lastCommitDate
    ? Math.floor((now - repo.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysSinceViewed = lastViewed
    ? Math.floor((now - lastViewed) / (1000 * 60 * 60 * 24))
    : null;

  const healthScore = calculateHealthScore(repo, daysSinceCommit);

  return {
    ...repo,
    frecency_score: frecencyScore,
    days_since_commit: daysSinceCommit,
    days_since_viewed: daysSinceViewed,
    health_score: healthScore,
  };
}

/**
 * Build scan summary from repos
 */
function buildScanSummary(repos: EnrichedRepo[]): ScanSummary {
  const summary: ScanSummary = {
    by_status: {
      clean: 0,
      uncommitted: 0,
      unpushed: 0,
      both: 0,
    },
    total_uncommitted_files: 0,
    total_unpushed_commits: 0,
    total_changes_lines: 0,
    stale_repos: 0,
    active_repos: 0,
  };

  for (const repo of repos) {
    summary.by_status[repo.status]++;
    summary.total_uncommitted_files += repo.uncommittedFiles;
    summary.total_unpushed_commits += repo.unpushedCommits;
    summary.total_changes_lines += repo.linesAdded + repo.linesDeleted;

    if (repo.days_since_commit !== null) {
      if (repo.days_since_commit > 30) {
        summary.stale_repos++;
      } else if (repo.days_since_commit <= 7) {
        summary.active_repos++;
      }
    }
  }

  return summary;
}

/**
 * Build intelligence data from pattern detection
 */
function buildIntelligenceData(
  enrichedRepos: EnrichedRepo[],
  db: ReturnType<typeof getDatabaseService>
): IntelligenceData {
  const patternService = getPatternDetectionService();

  // Detect workflow patterns
  const patterns = patternService.detectWorkflowPatterns();
  const workflowPatterns: WorkflowPatternInfo[] = patterns.map(p => ({
    name: p.name,
    type: p.type,
    repos: p.repos,
    frequency: p.frequency,
    confidence: p.confidence,
  }));

  // Detect anomalies
  const detectedAnomalies = patternService.detectAnomalies(enrichedRepos);
  const anomalies: AnomalyInfo[] = detectedAnomalies.map(a => ({
    repo_path: a.repoPath,
    type: a.type,
    severity: a.severity,
    description: a.description,
  }));

  // Calculate health trends for each repo
  const healthTrends: Record<string, 'improving' | 'declining' | 'stable'> = {};
  for (const repo of enrichedRepos) {
    const health = patternService.calculateHealthScore(repo);
    healthTrends[repo.path] = health.trend;
  }

  // Get recommendation stats
  const stats = db.getRecommendationStats();

  return {
    workflow_patterns: workflowPatterns,
    anomalies,
    health_trends: healthTrends,
    recommendation_stats: {
      total_recommendations: stats.total,
      acceptance_rate: stats.acceptanceRate,
    },
  };
}

/**
 * Build user history from database
 */
function buildUserHistory(db: ReturnType<typeof getDatabaseService>): UserHistory {
  // Get top repos by frecency
  const topRepos = db.getTopReposByFrecency(10);
  const frequent_repos = topRepos.map((r) => r.repo_path);

  // Get recent searches
  const recent_searches = db.getSearchHistory(20);

  // Calculate recent repos (last 10 accessed, ordered by time)
  const recentStats = frequent_repos
    .map((path) => ({
      path,
      stats: db.getRepoStats(path),
    }))
    .filter((r) => r.stats.lastAccessed !== null)
    .sort((a, b) => (b.stats.lastAccessed || 0) - (a.stats.lastAccessed || 0))
    .slice(0, 10)
    .map((r) => r.path);

  // Calculate action frequencies
  const actionCounts = new Map<string, number>();
  for (const path of frequent_repos) {
    const stats = db.getRepoStats(path);
    for (const [action, count] of Object.entries(stats.actions)) {
      actionCounts.set(action, (actionCounts.get(action) || 0) + count);
    }
  }

  const frequent_actions: ActionCount[] = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);

  return {
    recent_repos: recentStats,
    frequent_repos,
    recent_searches,
    frequent_actions,
    session_start: new Date(), // TODO: Track actual session start
  };
}

/**
 * Build complete agent context
 */
export function buildAgentContext(
  repos: GitRepo[],
  config: AppConfig,
  includeIntelligence: boolean = true
): AgentContext {
  const db = getDatabaseService();

  // Enrich repos with metadata
  const enrichedRepos: EnrichedRepo[] = repos.map((repo) => {
    const frecencyScore = db.getFrecencyScore(repo.path);
    const stats = db.getRepoStats(repo.path);
    return enrichRepo(repo, frecencyScore, stats.lastAccessed);
  });

  // Build scan snapshot
  const scanSnapshot: ScanSnapshot = {
    timestamp: new Date(),
    total_repos: repos.length,
    repos: enrichedRepos,
    summary: buildScanSummary(enrichedRepos),
  };

  // Build user history
  const userHistory = buildUserHistory(db);

  // Build environment info
  const environment = buildEnvironmentInfo();

  // Build intelligence data (Phase 4)
  const intelligence = includeIntelligence
    ? buildIntelligenceData(enrichedRepos, db)
    : undefined;

  return {
    settings: config,
    scan_data: scanSnapshot,
    user_history: userHistory,
    environment,
    intelligence,
  };
}

/**
 * Serialize context to JSON string
 */
export function serializeContext(context: AgentContext): string {
  return JSON.stringify(context, null, 2);
}

/**
 * Validate context structure
 */
export function validateContext(context: AgentContext): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!context.settings) {
    errors.push('Missing settings');
  }

  if (!context.scan_data) {
    errors.push('Missing scan_data');
  } else {
    if (!Array.isArray(context.scan_data.repos)) {
      errors.push('scan_data.repos must be an array');
    }
    if (!context.scan_data.summary) {
      errors.push('Missing scan_data.summary');
    }
  }

  if (!context.user_history) {
    errors.push('Missing user_history');
  }

  if (!context.environment) {
    errors.push('Missing environment');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate token count for context (rough approximation)
 * Used to ensure we don't exceed API limits
 */
export function estimateContextTokens(context: AgentContext): number {
  const json = serializeContext(context);
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(json.length / 4);
}

/**
 * Truncate context if it exceeds token limit
 * Removes least important repos first (lowest frecency)
 */
export function truncateContext(
  context: AgentContext,
  maxTokens: number = 100000
): AgentContext {
  let tokens = estimateContextTokens(context);

  if (tokens <= maxTokens) {
    return context;
  }

  // Sort repos by frecency (keep highest scoring)
  const sortedRepos = [...context.scan_data.repos].sort(
    (a, b) => b.frecency_score - a.frecency_score
  );

  // Remove repos one by one until we're under the limit
  while (tokens > maxTokens && sortedRepos.length > 10) {
    sortedRepos.pop(); // Remove lowest frecency repo
    const truncated = {
      ...context,
      scan_data: {
        ...context.scan_data,
        repos: sortedRepos,
        total_repos: context.scan_data.total_repos, // Keep original count
      },
    };
    tokens = estimateContextTokens(truncated);
  }

  return {
    ...context,
    scan_data: {
      ...context.scan_data,
      repos: sortedRepos,
    },
  };
}
