/**
 * Integrations Service
 * Handles external tool integrations (GitHub, GitLab, Slack, Discord, VS Code, tmux)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { GitRepo } from '../types/index.js';
import type { AgentRecommendation } from '../types/agent.js';

export interface GitHubPRStatus {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface GitLabMRStatus {
  iid: number;
  title: string;
  state: 'opened' | 'closed' | 'merged';
  author: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface CIStatus {
  status: 'success' | 'failed' | 'pending' | 'unknown';
  pipeline_url?: string;
  jobs: Array<{
    name: string;
    status: string;
  }>;
}

export interface NotificationConfig {
  webhook_url: string;
  enabled: boolean;
  notify_on_scan?: boolean;
  notify_on_recommendations?: boolean;
  notify_on_alerts?: boolean;
}

export interface IntegrationConfig {
  github?: {
    token?: string;
    enabled: boolean;
  };
  gitlab?: {
    token?: string;
    base_url?: string;
    enabled: boolean;
  };
  slack?: NotificationConfig;
  discord?: NotificationConfig;
  vscode?: {
    enabled: boolean;
    executable_path?: string;
  };
  tmux?: {
    enabled: boolean;
    session_prefix?: string;
  };
}

/**
 * Integrations Service
 */
export class IntegrationsService {
  private config: IntegrationConfig;

  constructor(config?: IntegrationConfig) {
    this.config = config || this.loadConfig();
  }

  /**
   * Load integration config from disk
   */
  private loadConfig(): IntegrationConfig {
    const configPath = join(homedir(), '.config', 'delta-scope', 'integrations.json');

    if (existsSync(configPath)) {
      try {
        const data = readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
      } catch {
        // Fall through to default
      }
    }

    return {
      github: { enabled: false },
      gitlab: { enabled: false },
      vscode: { enabled: false },
      tmux: { enabled: false },
    };
  }

  /**
   * Save integration config to disk
   */
  saveConfig(config: IntegrationConfig): void {
    const configPath = join(homedir(), '.config', 'delta-scope', 'integrations.json');
    const configDir = join(homedir(), '.config', 'delta-scope');

    try {
      // Ensure directory exists
      if (!existsSync(configDir)) {
        execSync(`mkdir -p "${configDir}"`, { stdio: 'ignore' });
      }

      writeFileSync(configPath, JSON.stringify(config, null, 2));
      this.config = config;
    } catch (error) {
      console.error('Failed to save integration config:', error);
    }
  }

  /**
   * Get current config
   */
  getConfig(): IntegrationConfig {
    return this.config;
  }

  // ===== GitHub Integration =====

  /**
   * Check if repo has GitHub remote
   */
  hasGitHubRemote(repo: GitRepo): boolean {
    return repo.remotes.some(remote =>
      remote.includes('github.com')
    );
  }

  /**
   * Get GitHub PR status for a repo
   */
  async getGitHubPRs(repo: GitRepo): Promise<GitHubPRStatus[]> {
    if (!this.config.github?.enabled || !this.config.github.token) {
      return [];
    }

    try {
      // Extract owner/repo from remote URL
      const githubRemote = repo.remotes.find(r => r.includes('github.com'));
      if (!githubRemote) return [];

      const match = githubRemote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
      if (!match) return [];

      const [, owner, repoName] = match;

      // Use GitHub CLI if available
      const result = execSync(
        `gh pr list --repo ${owner}/${repoName} --json number,title,state,author,url,createdAt,updatedAt --limit 10`,
        { encoding: 'utf-8', cwd: repo.path }
      );

      const prs = JSON.parse(result) as Array<{
        number: number;
        title: string;
        state: string;
        author?: { login: string };
        url: string;
        createdAt: string;
        updatedAt: string;
      }>;
      return prs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state.toLowerCase() as 'open' | 'closed' | 'merged',
        author: pr.author?.login || 'unknown',
        url: pr.url,
        created_at: pr.createdAt,
        updated_at: pr.updatedAt,
      }));
    } catch (error) {
      // gh CLI not available or error
      return [];
    }
  }

  /**
   * Get GitHub Actions CI status
   */
  async getGitHubCIStatus(repo: GitRepo): Promise<CIStatus> {
    if (!this.config.github?.enabled || !this.config.github.token) {
      return { status: 'unknown', jobs: [] };
    }

    try {
      const githubRemote = repo.remotes.find(r => r.includes('github.com'));
      if (!githubRemote) return { status: 'unknown', jobs: [] };

      const match = githubRemote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
      if (!match) return { status: 'unknown', jobs: [] };

      const [, owner, repoName] = match;

      // Get latest workflow run
      const result = execSync(
        `gh run list --repo ${owner}/${repoName} --json status,conclusion,databaseId,workflowName --limit 1`,
        { encoding: 'utf-8', cwd: repo.path }
      );

      const runs = JSON.parse(result);
      if (runs.length === 0) return { status: 'unknown', jobs: [] };

      const run = runs[0];
      const status = run.conclusion || run.status;

      return {
        status: status === 'success' ? 'success' : status === 'failure' ? 'failed' : 'pending',
        pipeline_url: `https://github.com/${owner}/${repoName}/actions/runs/${run.databaseId}`,
        jobs: [{ name: run.workflowName, status }],
      };
    } catch (error) {
      return { status: 'unknown', jobs: [] };
    }
  }

  // ===== GitLab Integration =====

  /**
   * Check if repo has GitLab remote
   */
  hasGitLabRemote(repo: GitRepo): boolean {
    return repo.remotes.some(remote =>
      remote.includes('gitlab.com') || remote.includes('gitlab.')
    );
  }

  /**
   * Get GitLab MR status for a repo
   */
  async getGitLabMRs(repo: GitRepo): Promise<GitLabMRStatus[]> {
    if (!this.config.gitlab?.enabled || !this.config.gitlab.token) {
      return [];
    }

    try {
      const gitlabRemote = repo.remotes.find(r => r.includes('gitlab'));
      if (!gitlabRemote) return [];

      // Use glab CLI if available
      const result = execSync(
        'glab mr list --per-page 10 --output json',
        { encoding: 'utf-8', cwd: repo.path }
      );

      const mrs = JSON.parse(result) as Array<{
        iid: number;
        title: string;
        state: string;
        author?: { username: string };
        web_url: string;
        created_at: string;
        updated_at: string;
      }>;
      return mrs.map((mr) => ({
        iid: mr.iid,
        title: mr.title,
        state: mr.state as 'opened' | 'closed' | 'merged',
        author: mr.author?.username || 'unknown',
        url: mr.web_url,
        created_at: mr.created_at,
        updated_at: mr.updated_at,
      }));
    } catch (error) {
      // glab CLI not available or error
      return [];
    }
  }

  /**
   * Get GitLab CI status
   */
  async getGitLabCIStatus(repo: GitRepo): Promise<CIStatus> {
    if (!this.config.gitlab?.enabled || !this.config.gitlab.token) {
      return { status: 'unknown', jobs: [] };
    }

    try {
      // Use glab CLI if available
      const result = execSync(
        'glab ci view --output json',
        { encoding: 'utf-8', cwd: repo.path }
      );

      const ci = JSON.parse(result) as {
        status: string;
        web_url: string;
        jobs?: Array<{ name: string; status: string }>;
      };
      return {
        status: ci.status === 'success' ? 'success' : ci.status === 'failed' ? 'failed' : 'pending',
        pipeline_url: ci.web_url,
        jobs: ci.jobs?.map((job) => ({
          name: job.name,
          status: job.status,
        })) || [],
      };
    } catch (error) {
      return { status: 'unknown', jobs: [] };
    }
  }

  // ===== Slack Integration =====

  /**
   * Send Slack notification
   */
  async sendSlackNotification(message: string, blocks?: unknown[]): Promise<boolean> {
    if (!this.config.slack?.enabled || !this.config.slack.webhook_url) {
      return false;
    }

    try {
      const payload = blocks ? { blocks } : { text: message };

      execSync(
        `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' "${this.config.slack.webhook_url}"`,
        { stdio: 'ignore' }
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send scan summary to Slack
   */
  async sendScanSummaryToSlack(summary: {
    total_repos: number;
    clean: number;
    uncommitted: number;
    unpushed: number;
    both: number;
    stale: number;
  }): Promise<boolean> {
    if (!this.config.slack?.notify_on_scan) {
      return false;
    }

    const message = `📊 *Delta-Scope Scan Complete*\n` +
      `• Total Repositories: ${summary.total_repos}\n` +
      `• Clean: ${summary.clean} ✅\n` +
      `• Uncommitted: ${summary.uncommitted} 📝\n` +
      `• Unpushed: ${summary.unpushed} 📤\n` +
      `• Both: ${summary.both} ⚠️\n` +
      `• Stale (30+ days): ${summary.stale} 💤`;

    return this.sendSlackNotification(message);
  }

  /**
   * Send recommendations to Slack
   */
  async sendRecommendationsToSlack(recommendations: AgentRecommendation[]): Promise<boolean> {
    if (!this.config.slack?.notify_on_recommendations || recommendations.length === 0) {
      return false;
    }

    const highPriority = recommendations.filter(r => r.priority === 'high');

    let message = `🤖 *Delta-Scope AI Recommendations*\n`;
    message += `Found ${recommendations.length} recommendations (${highPriority.length} high priority)\n\n`;

    // Show top 5 high priority
    for (const rec of highPriority.slice(0, 5)) {
      message += `• *${rec.title}*\n  ${rec.description}\n`;
    }

    return this.sendSlackNotification(message);
  }

  // ===== Discord Integration =====

  /**
   * Send Discord notification
   */
  async sendDiscordNotification(message: string, embed?: unknown): Promise<boolean> {
    if (!this.config.discord?.enabled || !this.config.discord.webhook_url) {
      return false;
    }

    try {
      const payload = embed ? { embeds: [embed] } : { content: message };

      execSync(
        `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' "${this.config.discord.webhook_url}"`,
        { stdio: 'ignore' }
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send scan summary to Discord
   */
  async sendScanSummaryToDiscord(summary: {
    total_repos: number;
    clean: number;
    uncommitted: number;
    unpushed: number;
    both: number;
    stale: number;
  }): Promise<boolean> {
    if (!this.config.discord?.notify_on_scan) {
      return false;
    }

    const embed = {
      title: '📊 Delta-Scope Scan Complete',
      color: 0x00ff00,
      fields: [
        { name: 'Total Repositories', value: `${summary.total_repos}`, inline: true },
        { name: 'Clean ✅', value: `${summary.clean}`, inline: true },
        { name: 'Uncommitted 📝', value: `${summary.uncommitted}`, inline: true },
        { name: 'Unpushed 📤', value: `${summary.unpushed}`, inline: true },
        { name: 'Both ⚠️', value: `${summary.both}`, inline: true },
        { name: 'Stale 💤', value: `${summary.stale}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    return this.sendDiscordNotification('', embed);
  }

  /**
   * Send recommendations to Discord
   */
  async sendRecommendationsToDiscord(recommendations: AgentRecommendation[]): Promise<boolean> {
    if (!this.config.discord?.notify_on_recommendations || recommendations.length === 0) {
      return false;
    }

    const highPriority = recommendations.filter(r => r.priority === 'high');

    const embed = {
      title: '🤖 Delta-Scope AI Recommendations',
      description: `Found ${recommendations.length} recommendations (${highPriority.length} high priority)`,
      color: 0x0099ff,
      fields: highPriority.slice(0, 5).map(rec => ({
        name: rec.title,
        value: rec.description,
      })),
      timestamp: new Date().toISOString(),
    };

    return this.sendDiscordNotification('', embed);
  }

  // ===== VS Code Integration =====

  /**
   * Open repo in VS Code
   */
  async openInVSCode(repoPath: string): Promise<boolean> {
    if (!this.config.vscode?.enabled) {
      return false;
    }

    try {
      const executable = this.config.vscode.executable_path || 'code';
      execSync(`${executable} "${repoPath}"`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Open multiple repos in VS Code workspace
   */
  async openMultipleInVSCode(repoPaths: string[]): Promise<boolean> {
    if (!this.config.vscode?.enabled || repoPaths.length === 0) {
      return false;
    }

    try {
      const executable = this.config.vscode.executable_path || 'code';

      // Create temporary workspace file
      const workspace = {
        folders: repoPaths.map(path => ({ path })),
      };

      const workspacePath = join(homedir(), '.delta-scope-workspace.code-workspace');
      writeFileSync(workspacePath, JSON.stringify(workspace, null, 2));

      execSync(`${executable} "${workspacePath}"`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===== tmux Integration =====

  /**
   * Check if tmux is available
   */
  isTmuxAvailable(): boolean {
    try {
      execSync('which tmux', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Open repo in tmux session
   */
  async openInTmux(repo: GitRepo): Promise<boolean> {
    if (!this.config.tmux?.enabled || !this.isTmuxAvailable()) {
      return false;
    }

    try {
      const sessionName = `${this.config.tmux.session_prefix || 'delta-scope'}-${repo.name}`;

      // Check if session already exists
      try {
        execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`, { stdio: 'ignore' });
        // Session exists, attach to it
        execSync(`tmux switch-client -t "${sessionName}" 2>/dev/null || tmux attach -t "${sessionName}"`, {
          stdio: 'inherit',
        });
      } catch {
        // Create new session
        execSync(`tmux new-session -d -s "${sessionName}" -c "${repo.path}"`, { stdio: 'ignore' });
        execSync(`tmux switch-client -t "${sessionName}" 2>/dev/null || tmux attach -t "${sessionName}"`, {
          stdio: 'inherit',
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List active tmux sessions for delta-scope
   */
  listTmuxSessions(): string[] {
    if (!this.config.tmux?.enabled || !this.isTmuxAvailable()) {
      return [];
    }

    try {
      const prefix = this.config.tmux.session_prefix || 'delta-scope';
      const result = execSync('tmux list-sessions -F "#{session_name}"', {
        encoding: 'utf-8',
      });

      return result
        .split('\n')
        .filter(name => name.startsWith(prefix))
        .map(name => name.trim());
    } catch {
      return [];
    }
  }

  /**
   * Kill a tmux session
   */
  async killTmuxSession(sessionName: string): Promise<boolean> {
    if (!this.config.tmux?.enabled || !this.isTmuxAvailable()) {
      return false;
    }

    try {
      execSync(`tmux kill-session -t "${sessionName}"`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let integrationsInstance: IntegrationsService | null = null;

/**
 * Get or create integrations service
 */
export function getIntegrationsService(config?: IntegrationConfig): IntegrationsService {
  if (!integrationsInstance) {
    integrationsInstance = new IntegrationsService(config);
  }
  return integrationsInstance;
}

/**
 * Reset integrations service (for testing)
 */
export function resetIntegrationsService(): void {
  integrationsInstance = null;
}
