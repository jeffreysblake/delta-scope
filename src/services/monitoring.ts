/**
 * Monitoring Service
 * Proactively monitors repositories for changes, issues, and alerts
 */

import { execSync } from 'child_process';
import { statSync } from 'fs';
import type { GitRepo } from '../types/index.js';
import type { EnrichedRepo } from '../types/agent.js';
import { getDatabaseService } from './database.js';

export type AlertPriority = 'high' | 'medium' | 'low';

export type AlertType =
  | 'remote_changes'
  | 'merge_conflict'
  | 'disk_usage'
  | 'security'
  | 'stale_changes'
  | 'diverged_branches';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  repo_path: string;
  detected_at: Date;
  actions: AlertAction[];
  metadata?: Record<string, any>;
}

export interface AlertAction {
  id: string;
  label: string;
  command: string;
  safe: boolean;
}

export interface RemoteStatus {
  hasRemote: boolean;
  ahead: number;
  behind: number;
  diverged: boolean;
}

export interface ConflictPrediction {
  likely: boolean;
  confidence: number;
  reason: string;
  conflictingFiles?: string[];
}

/**
 * Monitoring Service
 */
export class MonitoringService {
  private db: ReturnType<typeof getDatabaseService>;
  private alertCache: Map<string, Alert> = new Map();

  constructor() {
    this.db = getDatabaseService();
  }

  /**
   * Check for remote changes
   */
  checkRemoteChanges(repo: GitRepo): RemoteStatus {
    try {
      // Fetch remote changes
      execSync('git fetch --quiet', { cwd: repo.path, timeout: 10000 });

      // Get ahead/behind count
      const revList = execSync('git rev-list --left-right --count HEAD...@{u}', {
        cwd: repo.path,
        encoding: 'utf-8',
      }).trim();

      const [ahead, behind] = revList.split('\t').map(Number);

      return {
        hasRemote: repo.remotes.length > 0,
        ahead: ahead || 0,
        behind: behind || 0,
        diverged: (ahead || 0) > 0 && (behind || 0) > 0,
      };
    } catch (error) {
      // No remote or error fetching
      return {
        hasRemote: repo.remotes.length > 0,
        ahead: 0,
        behind: 0,
        diverged: false,
      };
    }
  }

  /**
   * Predict if pull will cause merge conflicts
   */
  predictMergeConflicts(repo: GitRepo, remoteStatus: RemoteStatus): ConflictPrediction {
    if (!remoteStatus.hasRemote || remoteStatus.behind === 0) {
      return {
        likely: false,
        confidence: 1.0,
        reason: 'No remote changes to merge',
      };
    }

    try {
      // Check if there are uncommitted changes
      if (repo.uncommittedFiles > 0) {
        return {
          likely: true,
          confidence: 0.9,
          reason: 'Uncommitted changes present - will require stash or commit first',
        };
      }

      // Try a dry-run merge to detect conflicts
      const result = execSync('git merge --no-commit --no-ff @{u} 2>&1 || true', {
        cwd: repo.path,
        encoding: 'utf-8',
      });

      // Abort the dry-run merge
      try {
        execSync('git merge --abort', { cwd: repo.path });
      } catch {
        // Merge abort might fail if no merge in progress
      }

      if (result.includes('CONFLICT') || result.includes('Automatic merge failed')) {
        const conflictFiles = result
          .split('\n')
          .filter(line => line.includes('CONFLICT'))
          .map(line => line.replace(/^CONFLICT.*?: /, ''));

        return {
          likely: true,
          confidence: 0.95,
          reason: 'Detected merge conflicts in dry-run',
          conflictingFiles: conflictFiles,
        };
      }

      return {
        likely: false,
        confidence: 0.8,
        reason: 'No conflicts detected in dry-run',
      };
    } catch (error) {
      return {
        likely: false,
        confidence: 0.5,
        reason: 'Unable to predict conflicts',
      };
    }
  }

  /**
   * Check disk usage for a repository
   */
  checkDiskUsage(repo: GitRepo): { size_bytes: number; size_mb: number; large: boolean } {
    try {
      // Get .git directory size
      const du = execSync(`du -sb "${repo.path}/.git" 2>/dev/null || echo "0"`, {
        encoding: 'utf-8',
      }).trim();

      const sizeBytes = parseInt(du.split('\t')[0] || '0');
      const sizeMb = sizeBytes / (1024 * 1024);

      return {
        size_bytes: sizeBytes,
        size_mb: Math.round(sizeMb * 100) / 100,
        large: sizeMb > 500, // Alert if over 500MB
      };
    } catch (error) {
      return {
        size_bytes: 0,
        size_mb: 0,
        large: false,
      };
    }
  }

  /**
   * Check for potential security issues
   */
  checkSecurityIssues(repo: GitRepo): { issues: string[]; severity: AlertPriority } {
    const issues: string[] = [];
    let severity: AlertPriority = 'low';

    try {
      // Check for common sensitive files in git history
      const sensitivePatterns = [
        '.env',
        'id_rsa',
        'credentials',
        'password',
        'secret',
        'api_key',
        'token',
      ];

      for (const pattern of sensitivePatterns) {
        try {
          const result = execSync(
            `git log --all --full-history --pretty=format:"%H" -- "*${pattern}*" | head -1`,
            { cwd: repo.path, encoding: 'utf-8', timeout: 5000 }
          );

          if (result.trim()) {
            issues.push(`Potential sensitive file in history: *${pattern}*`);
            severity = 'high';
          }
        } catch {
          // Pattern not found, continue
        }
      }

      // Check for large files (potential credential files or binaries)
      try {
        const largeFiles = execSync(
          'git ls-files | xargs ls -l 2>/dev/null | awk \'$5 > 1048576 {print $9}\' | head -5',
          { cwd: repo.path, encoding: 'utf-8', timeout: 5000 }
        ).trim();

        if (largeFiles) {
          const files = largeFiles.split('\n');
          issues.push(`${files.length} large files (>1MB) in repository`);
          if (severity === 'low') severity = 'medium';
        }
      } catch {
        // Ignore errors
      }
    } catch (error) {
      // Ignore errors in security check
    }

    return { issues, severity };
  }

  /**
   * Generate alerts for a repository
   */
  generateAlerts(repo: EnrichedRepo): Alert[] {
    const alerts: Alert[] = [];

    // Alert 1: Remote changes
    const remoteStatus = this.checkRemoteChanges(repo);
    if (remoteStatus.behind > 0) {
      const priority: AlertPriority = remoteStatus.behind > 10 ? 'high' : 'medium';

      alerts.push({
        id: `remote_changes_${repo.path}_${Date.now()}`,
        type: 'remote_changes',
        priority,
        title: `${remoteStatus.behind} new commits on remote`,
        description: remoteStatus.diverged
          ? `Remote has ${remoteStatus.behind} new commits and you are ${remoteStatus.ahead} commits ahead. Branches have diverged.`
          : `Remote has ${remoteStatus.behind} new commits. Consider pulling to stay up to date.`,
        repo_path: repo.path,
        detected_at: new Date(),
        actions: [
          {
            id: 'pull',
            label: 'Pull now',
            command: 'batch_pull',
            safe: false,
          },
          {
            id: 'view_diff',
            label: 'View diff',
            command: 'view',
            safe: true,
          },
        ],
        metadata: remoteStatus,
      });

      // Alert 2: Predict merge conflicts if pulling
      const conflictPrediction = this.predictMergeConflicts(repo, remoteStatus);
      if (conflictPrediction.likely && conflictPrediction.confidence > 0.7) {
        alerts.push({
          id: `merge_conflict_${repo.path}_${Date.now()}`,
          type: 'merge_conflict',
          priority: 'high',
          title: 'Merge conflicts likely',
          description: conflictPrediction.reason,
          repo_path: repo.path,
          detected_at: new Date(),
          actions: [
            {
              id: 'stash',
              label: 'Stash changes first',
              command: 'batch_stash',
              safe: false,
            },
            {
              id: 'view',
              label: 'View details',
              command: 'view',
              safe: true,
            },
          ],
          metadata: {
            confidence: conflictPrediction.confidence,
            conflicting_files: conflictPrediction.conflictingFiles,
          },
        });
      }
    }

    // Alert 3: Diverged branches
    if (remoteStatus.diverged) {
      alerts.push({
        id: `diverged_${repo.path}_${Date.now()}`,
        type: 'diverged_branches',
        priority: 'high',
        title: 'Branches have diverged',
        description: `You are ${remoteStatus.ahead} commits ahead and ${remoteStatus.behind} commits behind. Consider rebasing or merging.`,
        repo_path: repo.path,
        detected_at: new Date(),
        actions: [
          {
            id: 'view',
            label: 'View details',
            command: 'view',
            safe: true,
          },
        ],
        metadata: remoteStatus,
      });
    }

    // Alert 4: Stale uncommitted changes
    if (repo.uncommittedFiles > 0 && repo.days_since_commit && repo.days_since_commit > 7) {
      alerts.push({
        id: `stale_changes_${repo.path}_${Date.now()}`,
        type: 'stale_changes',
        priority: repo.days_since_commit > 30 ? 'high' : 'medium',
        title: `Uncommitted changes for ${repo.days_since_commit} days`,
        description: `You have ${repo.uncommittedFiles} uncommitted files that haven't been touched in over ${repo.days_since_commit} days.`,
        repo_path: repo.path,
        detected_at: new Date(),
        actions: [
          {
            id: 'commit',
            label: 'Commit now',
            command: 'smart_commit',
            safe: false,
          },
          {
            id: 'stash',
            label: 'Stash changes',
            command: 'batch_stash',
            safe: false,
          },
        ],
        metadata: {
          uncommitted_files: repo.uncommittedFiles,
          days_stale: repo.days_since_commit,
        },
      });
    }

    // Alert 5: Disk usage
    const diskUsage = this.checkDiskUsage(repo);
    if (diskUsage.large) {
      alerts.push({
        id: `disk_usage_${repo.path}_${Date.now()}`,
        type: 'disk_usage',
        priority: 'low',
        title: `Large repository (${diskUsage.size_mb}MB)`,
        description: `Repository .git directory is ${diskUsage.size_mb}MB. Consider running git gc or cleaning up history.`,
        repo_path: repo.path,
        detected_at: new Date(),
        actions: [
          {
            id: 'view',
            label: 'View details',
            command: 'view',
            safe: true,
          },
        ],
        metadata: diskUsage,
      });
    }

    // Alert 6: Security issues
    const securityCheck = this.checkSecurityIssues(repo);
    if (securityCheck.issues.length > 0) {
      alerts.push({
        id: `security_${repo.path}_${Date.now()}`,
        type: 'security',
        priority: securityCheck.severity,
        title: 'Potential security issues detected',
        description: securityCheck.issues.join('; '),
        repo_path: repo.path,
        detected_at: new Date(),
        actions: [
          {
            id: 'view',
            label: 'Review issues',
            command: 'view',
            safe: true,
          },
        ],
        metadata: {
          issues: securityCheck.issues,
        },
      });
    }

    return alerts;
  }

  /**
   * Monitor all repositories and generate alerts
   */
  monitorRepositories(repos: EnrichedRepo[]): Alert[] {
    const allAlerts: Alert[] = [];

    for (const repo of repos) {
      const alerts = this.generateAlerts(repo);
      allAlerts.push(...alerts);

      // Cache alerts
      for (const alert of alerts) {
        this.alertCache.set(alert.id, alert);
      }
    }

    // Sort by priority
    return allAlerts.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get cached alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alertCache.get(alertId);
  }

  /**
   * Clear alert cache
   */
  clearCache(): void {
    this.alertCache.clear();
  }
}

// Singleton instance
let monitoringInstance: MonitoringService | null = null;

/**
 * Get or create monitoring service
 */
export function getMonitoringService(): MonitoringService {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringService();
  }
  return monitoringInstance;
}

/**
 * Reset monitoring service (for testing)
 */
export function resetMonitoringService(): void {
  monitoringInstance = null;
}
