/**
 * Predictive Features Service
 * Provides AI-powered predictions for commits, workflows, and actions
 */

import { execSync } from 'child_process';
import type { GitRepo } from '../types/index.js';
import type { EnrichedRepo } from '../types/agent.js';
import { getDatabaseService } from './database.js';
import { getPatternDetectionService } from './patternDetection.js';

export interface CommitMessageSuggestion {
  message: string;
  confidence: number;
  reason: string;
}

export interface BranchNameSuggestion {
  name: string;
  confidence: number;
  reason: string;
}

export interface WorkflowPrediction {
  action: string;
  confidence: number;
  reason: string;
  repos: string[];
  timing?: string;
}

export interface TimePrediction {
  repos: string[];
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  deadline?: Date;
}

/**
 * Predictive Features Service
 */
export class PredictiveService {
  private db: ReturnType<typeof getDatabaseService>;
  private patternService: ReturnType<typeof getPatternDetectionService>;

  constructor() {
    this.db = getDatabaseService();
    this.patternService = getPatternDetectionService();
  }

  /**
   * Suggest commit message based on changes
   */
  suggestCommitMessage(repo: GitRepo): CommitMessageSuggestion {
    try {
      // Get list of changed files
      const changedFiles = execSync('git diff --name-only', {
        cwd: repo.path,
        encoding: 'utf-8',
      })
        .trim()
        .split('\n')
        .filter(f => f);

      // Analyze changes to generate message
      let message = '';
      let confidence = 0.6;
      let reason = 'Generated based on file changes';

      if (changedFiles.length === 0) {
        return {
          message: 'Update files',
          confidence: 0.3,
          reason: 'No specific changes detected',
        };
      }

      // Determine change type
      const fileTypes = new Set(changedFiles.map(f => {
        const ext = f.split('.').pop() || '';
        return ext;
      }));

      const directories = new Set(changedFiles.map(f => {
        const parts = f.split('/');
        return parts.length > 1 ? parts[0] : '';
      }));

      // Generate message based on patterns
      if (changedFiles.length === 1) {
        const file = changedFiles[0];
        const fileName = file.split('/').pop() || file;

        if (file.includes('README')) {
          message = 'Update README documentation';
          confidence = 0.8;
        } else if (file.includes('test')) {
          message = `Update tests in ${fileName}`;
          confidence = 0.85;
        } else if (file.includes('config') || file.includes('.json')) {
          message = `Update configuration in ${fileName}`;
          confidence = 0.8;
        } else {
          message = `Update ${fileName}`;
          confidence = 0.7;
        }
      } else if (fileTypes.has('ts') || fileTypes.has('js') || fileTypes.has('tsx') || fileTypes.has('jsx')) {
        if (changedFiles.some(f => f.includes('test'))) {
          message = 'Add/update tests';
          confidence = 0.85;
          reason = 'Test files modified';
        } else if (changedFiles.some(f => f.includes('component') || f.includes('Component'))) {
          message = 'Update UI components';
          confidence = 0.8;
          reason = 'Component files modified';
        } else if (changedFiles.some(f => f.includes('service') || f.includes('Service'))) {
          message = 'Update services and business logic';
          confidence = 0.8;
          reason = 'Service files modified';
        } else {
          message = `Update ${Array.from(directories).slice(0, 2).join(' and ')} modules`;
          confidence = 0.7;
        }
      } else if (fileTypes.has('md')) {
        message = 'Update documentation';
        confidence = 0.85;
        reason = 'Markdown files modified';
      } else {
        message = `Update ${changedFiles.length} files`;
        confidence = 0.6;
      }

      // Add file count if significant
      if (changedFiles.length > 5) {
        message += ` (${changedFiles.length} files)`;
      }

      return {
        message,
        confidence,
        reason,
      };
    } catch (error) {
      return {
        message: 'Update repository',
        confidence: 0.3,
        reason: 'Unable to analyze changes',
      };
    }
  }

  /**
   * Suggest branch name based on changes or patterns
   */
  suggestBranchName(repo: GitRepo): BranchNameSuggestion {
    try {
      // Analyze current changes
      const changedFiles = execSync('git diff --name-only', {
        cwd: repo.path,
        encoding: 'utf-8',
      })
        .trim()
        .split('\n')
        .filter(f => f);

      if (changedFiles.length === 0) {
        return {
          name: 'feature/update',
          confidence: 0.3,
          reason: 'Default branch name',
        };
      }

      // Determine change type
      const hasTests = changedFiles.some(f => f.includes('test'));
      const hasDocs = changedFiles.some(f => f.includes('README') || f.includes('.md'));
      const hasConfig = changedFiles.some(f => f.includes('config') || f.includes('.json'));

      let prefix = 'feature';
      let name = 'update';
      let confidence = 0.6;
      let reason = 'Based on file changes';

      if (hasTests && !hasDocs) {
        prefix = 'test';
        name = 'add-tests';
        confidence = 0.8;
        reason = 'Test files modified';
      } else if (hasDocs && changedFiles.length <= 3) {
        prefix = 'docs';
        name = 'update-documentation';
        confidence = 0.85;
        reason = 'Documentation files modified';
      } else if (hasConfig) {
        prefix = 'config';
        name = 'update-configuration';
        confidence = 0.75;
        reason = 'Configuration files modified';
      } else {
        // Try to extract meaningful name from files
        const mainDir = changedFiles[0].split('/')[0];
        if (mainDir && mainDir !== changedFiles[0]) {
          name = mainDir.toLowerCase().replace(/[^a-z0-9]/g, '-');
          confidence = 0.7;
        }
      }

      return {
        name: `${prefix}/${name}`,
        confidence,
        reason,
      };
    } catch (error) {
      return {
        name: 'feature/update',
        confidence: 0.3,
        reason: 'Unable to analyze changes',
      };
    }
  }

  /**
   * Predict workflow actions based on patterns
   */
  predictWorkflowActions(repos: EnrichedRepo[]): WorkflowPrediction[] {
    const predictions: WorkflowPrediction[] = [];

    // Get workflow patterns
    const patterns = this.patternService.getStoredPatterns(0.6);

    for (const pattern of patterns) {
      if (pattern.type === 'sequential') {
        // Predict sequential actions
        const reposInPattern = repos.filter(r => pattern.repos.includes(r.path));

        if (reposInPattern.length > 0) {
          predictions.push({
            action: `work_on_${pattern.name}`,
            confidence: pattern.confidence,
            reason: `You often work on these repos together: ${pattern.name}`,
            repos: pattern.repos,
          });
        }
      } else if (pattern.type === 'temporal') {
        // Time-based predictions
        const currentHour = new Date().getHours();
        const patternHour = parseInt(pattern.steps[0].replace('work_at_', ''));

        if (Math.abs(currentHour - patternHour) <= 1) {
          predictions.push({
            action: 'work_session',
            confidence: pattern.confidence,
            reason: `You usually work during this time (${patternHour}:00)`,
            repos: pattern.repos,
            timing: `${patternHour}:00`,
          });
        }
      }
    }

    // Predict based on access history
    const topRepos = this.db.getTopReposByFrecency(5);
    const recentRepos = topRepos
      .filter(r => {
        const repo = repos.find(repo => repo.path === r.repo_path);
        return repo && (repo.status === 'uncommitted' || repo.status === 'both');
      });

    if (recentRepos.length > 0) {
      predictions.push({
        action: 'commit_frequent_repos',
        confidence: 0.75,
        reason: 'You frequently work on these repos and they have uncommitted changes',
        repos: recentRepos.map(r => r.repo_path),
      });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Predict repos needing attention by end of day
   */
  predictEndOfDayRepos(repos: EnrichedRepo[]): TimePrediction | null {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(17, 0, 0, 0); // 5 PM

    // If it's past 3 PM, predict repos that should be committed
    if (now.getHours() >= 15) {
      const reposNeedingAttention = repos.filter(r => {
        // Repos with uncommitted changes that were accessed today
        if (r.status === 'uncommitted' || r.status === 'both') {
          if (r.days_since_viewed !== null && r.days_since_viewed === 0) {
            return true;
          }
        }
        return false;
      });

      if (reposNeedingAttention.length > 0) {
        return {
          repos: reposNeedingAttention.map(r => r.path),
          reason: 'These repos were worked on today and should be committed before end of day',
          urgency: now.getHours() >= 16 ? 'high' : 'medium',
          deadline: endOfDay,
        };
      }
    }

    return null;
  }

  /**
   * Predict if pull will succeed without conflicts
   */
  predictPullSuccess(repo: GitRepo): { safe: boolean; confidence: number; reason: string } {
    try {
      // Check for uncommitted changes
      if (repo.uncommittedFiles > 0) {
        return {
          safe: false,
          confidence: 0.95,
          reason: 'Uncommitted changes present - stash or commit first',
        };
      }

      // Check if behind remote
      if (repo.unpushedCommits === 0) {
        return {
          safe: true,
          confidence: 0.9,
          reason: 'No local commits - pull should be clean',
        };
      }

      return {
        safe: true,
        confidence: 0.7,
        reason: 'Pull should succeed but may require merge',
      };
    } catch (error) {
      return {
        safe: false,
        confidence: 0.5,
        reason: 'Unable to predict pull outcome',
      };
    }
  }
}

// Singleton instance
let predictiveInstance: PredictiveService | null = null;

/**
 * Get or create predictive service
 */
export function getPredictiveService(): PredictiveService {
  if (!predictiveInstance) {
    predictiveInstance = new PredictiveService();
  }
  return predictiveInstance;
}

/**
 * Reset predictive service (for testing)
 */
export function resetPredictiveService(): void {
  predictiveInstance = null;
}
