/**
 * Pattern Detection Service
 * Detects workflow patterns, anomalies, and calculates advanced health scores
 */

import type { EnrichedRepo } from '../types/agent.js';
import { getDatabaseService } from './database.js';

export interface WorkflowPattern {
  id?: number;
  name: string;
  type: 'sequential' | 'concurrent' | 'temporal' | 'custom';
  repos: string[];
  steps: string[];
  frequency: number;
  confidence: number;
  firstSeen?: Date;
  lastSeen?: Date;
}

export interface Anomaly {
  id?: number;
  repoPath: string;
  type: 'stale' | 'spike' | 'unusual_time' | 'large_changes' | 'broken_remote' | 'missing_branch';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface HealthFactors {
  commit_frequency: number;
  branch_hygiene: number;
  remote_sync: number;
  uncommitted_ratio: number;
  age_factor: number;
  [key: string]: number; // Allow indexing for serialization
}

export interface RepoHealth {
  score: number;
  factors: HealthFactors;
  issues: string[];
  suggestions: string[];
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Pattern Detection Service
 */
export class PatternDetectionService {
  private db: ReturnType<typeof getDatabaseService>;

  constructor() {
    this.db = getDatabaseService();
  }

  /**
   * Detect workflow patterns from access history
   */
  detectWorkflowPatterns(): WorkflowPattern[] {
    const patterns: WorkflowPattern[] = [];

    // Get access history for pattern analysis
    const topRepos = this.db.getTopReposByFrecency(50);
    if (topRepos.length < 2) {
      return patterns;
    }

    // Pattern 1: Sequential access (repos accessed one after another)
    const sequentialPattern = this.detectSequentialPattern(topRepos);
    if (sequentialPattern) {
      patterns.push(sequentialPattern);
    }

    // Pattern 2: Concurrent work (repos accessed in same time window)
    const concurrentPattern = this.detectConcurrentPattern(topRepos);
    if (concurrentPattern) {
      patterns.push(concurrentPattern);
    }

    // Pattern 3: Temporal patterns (time-of-day preferences)
    const temporalPattern = this.detectTemporalPattern(topRepos);
    if (temporalPattern) {
      patterns.push(temporalPattern);
    }

    // Save detected patterns to database
    for (const pattern of patterns) {
      this.db.saveWorkflowPattern(
        pattern.name,
        pattern.type,
        pattern.repos,
        pattern.steps,
        pattern.confidence
      );
    }

    return patterns;
  }

  /**
   * Detect sequential access patterns
   * Example: "Always commit to repo A before pushing to repo B"
   */
  private detectSequentialPattern(topRepos: Array<{ repo_path: string; last_accessed: number }>): WorkflowPattern | null {
    // Group repos by common access sequences
    const sequences = new Map<string, number>();

    for (let i = 0; i < topRepos.length - 1; i++) {
      const repoA = topRepos[i];
      const repoB = topRepos[i + 1];

      // Check if accessed within 1 hour of each other
      const timeDiff = Math.abs(repoA.last_accessed - repoB.last_accessed);
      if (timeDiff < 60 * 60 * 1000) {
        const key = `${repoA.repo_path} -> ${repoB.repo_path}`;
        sequences.set(key, (sequences.get(key) || 0) + 1);
      }
    }

    // Find most common sequence
    let mostCommon: { key: string; count: number } | null = null;
    for (const [key, count] of sequences.entries()) {
      if (count >= 3 && (!mostCommon || count > mostCommon.count)) {
        mostCommon = { key, count };
      }
    }

    if (!mostCommon) {
      return null;
    }

    const [repoA, repoB] = mostCommon.key.split(' -> ');
    const confidence = Math.min(0.9, mostCommon.count / topRepos.length);

    return {
      name: `Sequential work: ${repoA.split('/').pop()} → ${repoB.split('/').pop()}`,
      type: 'sequential',
      repos: [repoA, repoB],
      steps: ['access_first', 'access_second'],
      frequency: mostCommon.count,
      confidence,
    };
  }

  /**
   * Detect concurrent work patterns
   * Example: "These 3 repos are often worked on together"
   */
  private detectConcurrentPattern(topRepos: Array<{ repo_path: string; last_accessed: number }>): WorkflowPattern | null {
    // Group repos accessed in same day
    const dayGroups = new Map<string, Set<string>>();

    for (const repo of topRepos) {
      const day = new Date(repo.last_accessed).toDateString();
      if (!dayGroups.has(day)) {
        dayGroups.set(day, new Set());
      }
      dayGroups.get(day)!.add(repo.repo_path);
    }

    // Find repos that appear together frequently
    const cooccurrences = new Map<string, number>();

    for (const repos of dayGroups.values()) {
      if (repos.size >= 2) {
        const repoArray = Array.from(repos).sort();
        for (let i = 0; i < repoArray.length; i++) {
          for (let j = i + 1; j < repoArray.length; j++) {
            const key = `${repoArray[i]}|${repoArray[j]}`;
            cooccurrences.set(key, (cooccurrences.get(key) || 0) + 1);
          }
        }
      }
    }

    // Find most common co-occurrence
    let mostCommon: { key: string; count: number } | null = null;
    for (const [key, count] of cooccurrences.entries()) {
      if (count >= 3 && (!mostCommon || count > mostCommon.count)) {
        mostCommon = { key, count };
      }
    }

    if (!mostCommon) {
      return null;
    }

    const repos = mostCommon.key.split('|');
    const confidence = Math.min(0.85, mostCommon.count / dayGroups.size);

    return {
      name: `Concurrent work: ${repos.map(r => r.split('/').pop()).join(', ')}`,
      type: 'concurrent',
      repos,
      steps: ['work_together'],
      frequency: mostCommon.count,
      confidence,
    };
  }

  /**
   * Detect temporal patterns
   * Example: "You usually commit before lunch"
   */
  private detectTemporalPattern(topRepos: Array<{ repo_path: string; last_accessed: number }>): WorkflowPattern | null {
    // Analyze time-of-day preferences
    const hourCounts = new Array(24).fill(0);

    for (const repo of topRepos) {
      const hour = new Date(repo.last_accessed).getHours();
      hourCounts[hour]++;
    }

    // Find peak hours
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakCount = hourCounts[peakHour];

    if (peakCount < 3) {
      return null;
    }

    const confidence = Math.min(0.8, peakCount / topRepos.length);

    let timeDescription = 'morning';
    if (peakHour >= 12 && peakHour < 17) {
      timeDescription = 'afternoon';
    } else if (peakHour >= 17 && peakHour < 21) {
      timeDescription = 'evening';
    } else if (peakHour >= 21 || peakHour < 6) {
      timeDescription = 'night';
    }

    return {
      name: `Work preference: ${timeDescription} (around ${peakHour}:00)`,
      type: 'temporal',
      repos: topRepos.slice(0, 5).map(r => r.repo_path),
      steps: [`work_at_${peakHour}`],
      frequency: peakCount,
      confidence,
    };
  }

  /**
   * Detect anomalies in repositories
   */
  detectAnomalies(repos: EnrichedRepo[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const repo of repos) {
      // Anomaly 1: Stale repos with uncommitted changes
      if (repo.days_since_commit !== null && repo.days_since_commit > 30 && repo.uncommittedFiles > 0) {
        anomalies.push({
          repoPath: repo.path,
          type: 'stale',
          severity: repo.days_since_commit > 90 ? 'high' : 'medium',
          description: `Repository has ${repo.uncommittedFiles} uncommitted files and hasn't been committed in ${repo.days_since_commit} days`,
          detectedAt: new Date(),
          metadata: {
            days_since_commit: repo.days_since_commit,
            uncommitted_files: repo.uncommittedFiles,
          },
        });
      }

      // Anomaly 2: Large uncommitted changes
      if (repo.uncommittedFiles > 50 || (repo.linesAdded + repo.linesDeleted) > 1000) {
        anomalies.push({
          repoPath: repo.path,
          type: 'large_changes',
          severity: 'medium',
          description: `Large uncommitted changes: ${repo.uncommittedFiles} files, ${repo.linesAdded + repo.linesDeleted} lines`,
          detectedAt: new Date(),
          metadata: {
            files: repo.uncommittedFiles,
            lines: repo.linesAdded + repo.linesDeleted,
          },
        });
      }

      // Anomaly 3: Many unpushed commits
      if (repo.unpushedCommits > 10) {
        anomalies.push({
          repoPath: repo.path,
          type: 'spike',
          severity: 'low',
          description: `${repo.unpushedCommits} unpushed commits - consider pushing to remote`,
          detectedAt: new Date(),
          metadata: {
            unpushed_commits: repo.unpushedCommits,
          },
        });
      }

      // Anomaly 4: No remote configured
      if (repo.remotes.length === 0 && repo.days_since_commit !== null && repo.days_since_commit < 7) {
        anomalies.push({
          repoPath: repo.path,
          type: 'broken_remote',
          severity: 'low',
          description: 'Active repository has no remote configured',
          detectedAt: new Date(),
          metadata: {
            remotes: repo.remotes,
          },
        });
      }

      // Anomaly 5: Unusual activity (recent commit after long inactivity)
      if (
        repo.days_since_commit !== null &&
        repo.days_since_commit < 1 &&
        repo.days_since_viewed !== null &&
        repo.days_since_viewed > 30
      ) {
        anomalies.push({
          repoPath: repo.path,
          type: 'spike',
          severity: 'low',
          description: 'Recent commit after 30+ days of inactivity',
          detectedAt: new Date(),
          metadata: {
            days_since_viewed: repo.days_since_viewed,
          },
        });
      }
    }

    // Save anomalies to database
    for (const anomaly of anomalies) {
      this.db.saveAnomaly(
        anomaly.repoPath,
        anomaly.type,
        anomaly.severity,
        anomaly.description,
        anomaly.metadata
      );
    }

    return anomalies;
  }

  /**
   * Calculate enhanced health score with detailed factors
   */
  calculateHealthScore(repo: EnrichedRepo): RepoHealth {
    const factors: HealthFactors = {
      commit_frequency: 100,
      branch_hygiene: 100,
      remote_sync: 100,
      uncommitted_ratio: 100,
      age_factor: 100,
    };

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Factor 1: Commit frequency (0-100)
    if (repo.days_since_commit !== null) {
      if (repo.days_since_commit > 90) {
        factors.commit_frequency = 20;
        issues.push('No commits in 90+ days');
        suggestions.push('Review if this repository is still needed');
      } else if (repo.days_since_commit > 30) {
        factors.commit_frequency = 50;
        issues.push('No commits in 30+ days');
      } else if (repo.days_since_commit > 7) {
        factors.commit_frequency = 75;
      }
    }

    // Factor 2: Branch hygiene (0-100)
    // Perfect score if on main/master/develop
    const mainBranches = ['main', 'master', 'develop', 'development'];
    if (!mainBranches.includes(repo.branch)) {
      factors.branch_hygiene = 85;
      // Note: This is normal for feature branches
    }

    // Factor 3: Remote sync (0-100)
    if (repo.unpushedCommits > 20) {
      factors.remote_sync = 30;
      issues.push('Many unpushed commits (20+)');
      suggestions.push('Push changes to remote to avoid data loss');
    } else if (repo.unpushedCommits > 10) {
      factors.remote_sync = 50;
      issues.push('Several unpushed commits (10+)');
    } else if (repo.unpushedCommits > 5) {
      factors.remote_sync = 75;
    } else if (repo.unpushedCommits > 0) {
      factors.remote_sync = 90;
    }

    // Check for missing remotes
    if (repo.remotes.length === 0) {
      factors.remote_sync = 40;
      issues.push('No remote configured');
      suggestions.push('Add a remote to enable collaboration and backup');
    }

    // Factor 4: Uncommitted ratio (0-100)
    if (repo.uncommittedFiles > 50) {
      factors.uncommitted_ratio = 20;
      issues.push('Many uncommitted files (50+)');
      suggestions.push('Commit or stash changes');
    } else if (repo.uncommittedFiles > 20) {
      factors.uncommitted_ratio = 50;
      issues.push('Several uncommitted files (20+)');
    } else if (repo.uncommittedFiles > 10) {
      factors.uncommitted_ratio = 70;
    } else if (repo.uncommittedFiles > 0) {
      factors.uncommitted_ratio = 85;
    }

    // Factor 5: Age factor (0-100)
    // Penalize very old or very inactive repos
    if (repo.days_since_commit !== null) {
      if (repo.days_since_commit > 365) {
        factors.age_factor = 30;
        issues.push('Repository inactive for over a year');
        suggestions.push('Consider archiving if no longer needed');
      } else if (repo.days_since_commit > 180) {
        factors.age_factor = 60;
        issues.push('Repository inactive for 6+ months');
      }
    }

    // Calculate overall score (weighted average)
    const weights = {
      commit_frequency: 0.25,
      branch_hygiene: 0.10,
      remote_sync: 0.30,
      uncommitted_ratio: 0.25,
      age_factor: 0.10,
    };

    const score = Math.round(
      factors.commit_frequency * weights.commit_frequency +
      factors.branch_hygiene * weights.branch_hygiene +
      factors.remote_sync * weights.remote_sync +
      factors.uncommitted_ratio * weights.uncommitted_ratio +
      factors.age_factor * weights.age_factor
    );

    // Determine trend by comparing with historical data
    const trend = this.calculateHealthTrend(repo.path, score);

    // Save health score history
    this.db.saveHealthScore(repo.path, score, factors);

    return {
      score,
      factors,
      issues,
      suggestions,
      trend,
    };
  }

  /**
   * Calculate health trend by comparing with historical data
   */
  private calculateHealthTrend(repoPath: string, currentScore: number): 'improving' | 'declining' | 'stable' {
    const history = this.db.getHealthHistory(repoPath, 30);

    if (history.length < 2) {
      return 'stable';
    }

    // Compare current score with average of last 3 scores
    const recentScores = history.slice(0, 3).map(h => h.health_score);
    const avgRecent = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;

    const diff = currentScore - avgRecent;

    if (diff > 5) {
      return 'improving';
    } else if (diff < -5) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Get stored workflow patterns
   */
  getStoredPatterns(minConfidence: number = 0.5): WorkflowPattern[] {
    const dbPatterns = this.db.getWorkflowPatterns(minConfidence);
    return dbPatterns.map(p => ({
      id: p.id,
      name: p.name,
      type: p.pattern_type as WorkflowPattern['type'],
      repos: p.repos,
      steps: p.steps,
      frequency: p.frequency,
      confidence: p.confidence,
      firstSeen: new Date(p.first_seen),
      lastSeen: new Date(p.last_seen),
    }));
  }

  /**
   * Get active anomalies
   */
  getActiveAnomalies(repoPath?: string): Anomaly[] {
    const dbAnomalies = this.db.getAnomalies(repoPath);
    return dbAnomalies.map(a => ({
      id: a.id,
      repoPath: a.repo_path,
      type: a.anomaly_type as Anomaly['type'],
      severity: a.severity as Anomaly['severity'],
      description: a.description,
      detectedAt: new Date(a.detected_at),
      metadata: a.metadata || undefined,
    }));
  }

  /**
   * Resolve an anomaly
   */
  resolveAnomaly(anomalyId: number): void {
    this.db.resolveAnomaly(anomalyId);
  }
}

// Singleton instance
let patternDetectionInstance: PatternDetectionService | null = null;

/**
 * Get or create pattern detection service
 */
export function getPatternDetectionService(): PatternDetectionService {
  if (!patternDetectionInstance) {
    patternDetectionInstance = new PatternDetectionService();
  }
  return patternDetectionInstance;
}

/**
 * Reset pattern detection service (for testing)
 */
export function resetPatternDetectionService(): void {
  patternDetectionInstance = null;
}
