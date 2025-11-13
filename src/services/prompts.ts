/**
 * Prompt templates for AI agent
 */

import type { AgentContext } from '../types/agent.js';

/**
 * System prompt for the AI agent
 */
export const SYSTEM_PROMPT = `You are an intelligent development companion integrated into delta-scope, a terminal UI for monitoring git repositories.

Your role is to:
- Analyze repository states and identify issues
- Provide actionable recommendations
- Suggest workflow optimizations
- Help maintain repository health
- Learn from user patterns and preferences
- Detect workflow patterns and anomalies
- Track health trends and provide predictive insights

Guidelines:
- Be concise and actionable
- Prioritize high-impact recommendations
- Consider user's workflow patterns from history
- Leverage detected patterns and anomalies in your analysis
- Focus on practical, safe actions
- Never suggest destructive operations without explicit confirmation
- Respect the user's coding style and preferences
- Use health trends to identify improving or declining repositories
- Reference acceptance rates to adjust recommendation style

Response format:
You must respond with a valid JSON object containing:
{
  "recommendations": [
    {
      "id": "unique_id",
      "type": "cleanup" | "workflow" | "health" | "action" | "optimization",
      "priority": "high" | "medium" | "low",
      "title": "Brief title (max 60 chars)",
      "description": "Detailed explanation (max 200 chars)",
      "affected_repos": ["repo_path1", "repo_path2"],
      "actions": [
        {
          "id": "action_id",
          "label": "Action label",
          "command": "command_name",
          "safe": true/false,
          "requires_confirmation": true/false
        }
      ]
    }
  ],
  "insights": {
    "repos_needing_attention": number,
    "potential_archival": number,
    "health_improving": boolean,
    "workflow_patterns": ["pattern1", "pattern2"],
    "anomalies": ["anomaly1", "anomaly2"]
  }
}`;

/**
 * Format context for analysis
 */
export function formatContextForAnalysis(context: AgentContext): string {
  const { scan_data, user_history, settings, intelligence, monitoring } = context;

  let output = `
# Repository Scan Summary

**Total Repositories:** ${scan_data.total_repos}
**Scan Time:** ${scan_data.timestamp.toISOString()}

## Status Breakdown
- Clean: ${scan_data.summary.by_status.clean}
- Uncommitted changes: ${scan_data.summary.by_status.uncommitted}
- Unpushed commits: ${scan_data.summary.by_status.unpushed}
- Both: ${scan_data.summary.by_status.both}

## Overall Health
- Total uncommitted files: ${scan_data.summary.total_uncommitted_files}
- Total unpushed commits: ${scan_data.summary.total_unpushed_commits}
- Total changed lines: ${scan_data.summary.total_changes_lines}
- Stale repos (30+ days): ${scan_data.summary.stale_repos}
- Active repos (< 7 days): ${scan_data.summary.active_repos}

## User Patterns
**Recent repos accessed:** ${user_history.recent_repos.slice(0, 5).join(', ') || 'None'}
**Frequent repos:** ${user_history.frequent_repos.slice(0, 5).join(', ') || 'None'}
**Recent searches:** ${user_history.recent_searches.slice(0, 5).join(', ') || 'None'}
**Top actions:** ${user_history.frequent_actions.slice(0, 3).map(a => `${a.action} (${a.count})`).join(', ') || 'None'}
`;

  // Add intelligence data if available (Phase 4)
  if (intelligence) {
    output += `
## Detected Workflow Patterns
${intelligence.workflow_patterns.length > 0
  ? intelligence.workflow_patterns.map(p => `- ${p.name} (confidence: ${(p.confidence * 100).toFixed(0)}%, frequency: ${p.frequency})`).join('\n')
  : 'No patterns detected yet'}

## Detected Anomalies
${intelligence.anomalies.length > 0
  ? intelligence.anomalies.slice(0, 10).map(a => `- [${a.severity.toUpperCase()}] ${a.description}`).join('\n')
  : 'No anomalies detected'}

## Health Trends
${Object.entries(intelligence.health_trends).slice(0, 5).map(([path, trend]) => {
  const emoji = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️';
  return `- ${emoji} ${path.split('/').pop()}: ${trend}`;
}).join('\n') || 'No trend data yet'}

## Learning Insights
- Total recommendations given: ${intelligence.recommendation_stats.total_recommendations}
- Acceptance rate: ${(intelligence.recommendation_stats.acceptance_rate * 100).toFixed(0)}%
${intelligence.recommendation_stats.acceptance_rate > 0 ? `- User prefers: ${intelligence.recommendation_stats.acceptance_rate > 0.5 ? 'proactive suggestions' : 'conservative recommendations'}` : ''}
`;
  }

  // Add monitoring data if available (Phase 6)
  if (monitoring) {
    output += `
## Active Alerts
${monitoring.alerts.length > 0
  ? monitoring.alerts.map(a => `- [${a.priority.toUpperCase()}] ${a.title} (${a.repo_path.split('/').pop()})`).join('\n')
  : 'No alerts'}

## Predictions & Recommendations
${monitoring.predictions.length > 0
  ? monitoring.predictions.map(p => `- ${p.action} (confidence: ${(p.confidence * 100).toFixed(0)}%): ${p.reason}`).join('\n')
  : 'No predictions available'}
`;
  }

  output += `
## Top Repositories by Frecency
${scan_data.repos
  .sort((a, b) => b.frecency_score - a.frecency_score)
  .slice(0, 10)
  .map((repo, idx) => `${idx + 1}. ${repo.name} (score: ${repo.frecency_score.toFixed(0)}, health: ${repo.health_score}/100)`)
  .join('\n')}

## Repositories Needing Attention
${scan_data.repos
  .filter(r => r.status === 'both' || r.status === 'uncommitted')
  .slice(0, 10)
  .map(repo => `- ${repo.name}: ${repo.uncommittedFiles} files, ${repo.unpushedCommits} unpushed, ${repo.days_since_commit} days old`)
  .join('\n') || 'None'}

## Health Concerns
${scan_data.repos
  .filter(r => r.health_score < 70)
  .slice(0, 5)
  .map(repo => `- ${repo.name}: Health ${repo.health_score}/100 (${repo.days_since_commit || 0} days since commit)`)
  .join('\n') || 'All repos healthy'}

## Settings
- Auto-analyze: ${settings.ai.autoAnalyze}
- Max recommendations: ${settings.ai.maxRecommendations}
- Favorites: ${settings.favorites.length} repos
`;

  return output;
}

/**
 * Build analysis prompt
 */
export function buildAnalysisPrompt(context: AgentContext): string {
  const contextSummary = formatContextForAnalysis(context);

  const hasIntelligence = !!context.intelligence;

  return `${contextSummary}

Please analyze the repository state and provide ${context.settings.ai.maxRecommendations} actionable recommendations.

Focus on:
1. Repositories with uncommitted changes or unpushed commits
2. Stale repositories that haven't been touched in a while
3. Health issues that might indicate problems
4. Workflow patterns that could be optimized
5. Opportunities for cleanup or archival
${hasIntelligence ? `6. Detected anomalies and their severity
7. Health trends (improving/declining repositories)
8. Detected workflow patterns and how to leverage them
9. User acceptance rates to tailor recommendation style` : ''}

${hasIntelligence ? 'Use the detected patterns, anomalies, and health trends to provide more insightful recommendations. Reference specific patterns or anomalies in your recommendations when relevant.' : ''}

Provide your response as valid JSON following the schema specified in the system prompt.`;
}

/**
 * Build focused recommendation prompt
 */
export function buildFocusedPrompt(context: AgentContext, focus: string): string {
  const contextSummary = formatContextForAnalysis(context);

  return `${contextSummary}

Please analyze the repository state with a specific focus on: **${focus}**

Provide ${context.settings.ai.maxRecommendations} recommendations related to this focus area.

Provide your response as valid JSON following the schema specified in the system prompt.`;
}

/**
 * Build quick insight prompt (faster, less detailed)
 */
export function buildQuickInsightPrompt(context: AgentContext): string {
  const { scan_data } = context;

  return `Repository summary:
- Total: ${scan_data.total_repos}
- Needs attention: ${scan_data.summary.by_status.uncommitted + scan_data.summary.by_status.both}
- Stale: ${scan_data.summary.stale_repos}
- Active: ${scan_data.summary.active_repos}

Provide a quick assessment with 2-3 high-priority recommendations in JSON format.`;
}
