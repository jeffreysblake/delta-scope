/**
 * AI Agent Service
 * Handles communication with AI providers (Anthropic, OpenAI, local)
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AIConfig } from '../types/index.js';
import type {
  AgentContext,
  AgentResponse,
  AgentStatus,
  ValidationResult,
  ExecutionResult,
  AgentRecommendation,
} from '../types/agent.js';
import {
  SYSTEM_PROMPT,
  buildAnalysisPrompt,
  buildFocusedPrompt,
  buildQuickInsightPrompt,
} from './prompts.js';
import { getDatabaseService } from './database.js';
import { serializeContext, truncateContext } from './agentContext.js';

/**
 * Safe commands that don't require confirmation
 */
const SAFE_COMMANDS = new Set([
  'view',
  'navigate',
  'filter',
  'sort',
  'refresh',
  'analyze',
  'review',
]);

/**
 * Commands that require user confirmation
 */
const DANGEROUS_COMMANDS = new Set([
  'commit',
  'commit_all',
  'push',
  'push_force',
  'delete',
  'reset',
  'clean',
  'stash',
]);

/**
 * AI Agent Service
 */
export class AIAgentService {
  private config: AIConfig;
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private status: AgentStatus = 'not_configured';

  constructor(config: AIConfig) {
    this.config = config;
    this.initialize();
  }

  /**
   * Initialize the AI client
   */
  private initialize(): void {
    if (!this.config.enabled) {
      this.status = 'disabled';
      return;
    }

    // For Anthropic and OpenAI, API key is required
    // For local models, API key can be anything (e.g., "local" or "not-needed")
    if (!this.config.apiKey && this.config.provider !== 'local') {
      this.status = 'not_configured';
      return;
    }

    try {
      if (this.config.provider === 'anthropic') {
        this.anthropic = new Anthropic({
          apiKey: this.config.apiKey,
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries,
        });
        this.status = 'ready';
      } else if (this.config.provider === 'openai' || this.config.provider === 'local') {
        // OpenAI-compatible API (works with OpenAI, lm-studio, ollama)
        const baseURL = this.config.endpoint ||
          (this.config.provider === 'local' ? 'http://localhost:1234/v1' : undefined);

        this.openai = new OpenAI({
          apiKey: this.config.apiKey || 'not-needed', // Local models don't need real keys
          baseURL,
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries,
        });
        this.status = 'ready';
      } else {
        this.status = 'not_configured';
      }
    } catch (error) {
      console.error('Failed to initialize AI agent:', error);
      this.status = 'error';
    }
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Update configuration
   */
  updateConfig(config: AIConfig): void {
    this.config = config;
    this.initialize();
  }

  /**
   * Call AI provider (Anthropic or OpenAI-compatible)
   */
  private async callAI(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<string> {
    if (this.config.provider === 'anthropic' && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content?.[0];
      if (!content || content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }
      return content.text;
    } else if ((this.config.provider === 'openai' || this.config.provider === 'local') && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      return content;
    } else {
      throw new Error(`Provider ${this.config.provider} not initialized`);
    }
  }

  /**
   * Analyze repository context
   */
  async analyze(context: AgentContext): Promise<AgentResponse> {
    if (this.status !== 'ready') {
      throw new Error(`Agent not ready: ${this.status}`);
    }

    const startTime = Date.now();
    this.status = 'analyzing';

    try {
      // Truncate context if needed (stay under 100k tokens)
      const truncatedContext = truncateContext(context, 100000);

      // Build prompt
      const prompt = buildAnalysisPrompt(truncatedContext);

      // Call AI provider
      const responseText = await this.callAI(SYSTEM_PROMPT, prompt);

      // Parse response
      const result = this.parseResponse(responseText);
      const processingTime = Date.now() - startTime;

      // Save context snapshot
      const db = getDatabaseService();
      db.saveContextSnapshot(
        serializeContext(truncatedContext),
        truncatedContext.scan_data.total_repos,
        'analyze'
      );

      this.status = 'ready';

      return {
        ...result,
        timestamp: new Date(),
        processing_time_ms: processingTime,
      };
    } catch (error) {
      this.status = 'error';
      console.error('AI analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get recommendations with optional focus
   */
  async recommend(context: AgentContext, focus?: string): Promise<AgentResponse> {
    if (this.status !== 'ready') {
      throw new Error(`Agent not ready: ${this.status}`);
    }

    const startTime = Date.now();
    this.status = 'analyzing';

    try {
      const truncatedContext = truncateContext(context, 100000);
      const prompt = focus
        ? buildFocusedPrompt(truncatedContext, focus)
        : buildAnalysisPrompt(truncatedContext);

      const responseText = await this.callAI(SYSTEM_PROMPT, prompt);
      const result = this.parseResponse(responseText);
      const processingTime = Date.now() - startTime;

      // Save context snapshot
      const db = getDatabaseService();
      db.saveContextSnapshot(
        serializeContext(truncatedContext),
        truncatedContext.scan_data.total_repos,
        focus ? `recommend:${focus}` : 'recommend'
      );

      this.status = 'ready';

      return {
        ...result,
        timestamp: new Date(),
        processing_time_ms: processingTime,
      };
    } catch (error) {
      this.status = 'error';
      console.error('AI recommendation failed:', error);
      throw error;
    }
  }

  /**
   * Quick insight (faster, less detailed)
   */
  async quickInsight(context: AgentContext): Promise<AgentResponse> {
    if (this.status !== 'ready') {
      throw new Error(`Agent not ready: ${this.status}`);
    }

    const startTime = Date.now();
    this.status = 'analyzing';

    try {
      const prompt = buildQuickInsightPrompt(context);
      const responseText = await this.callAI(SYSTEM_PROMPT, prompt, 1024); // Smaller for quick insights
      const result = this.parseResponse(responseText);
      const processingTime = Date.now() - startTime;

      this.status = 'ready';

      return {
        ...result,
        timestamp: new Date(),
        processing_time_ms: processingTime,
      };
    } catch (error) {
      this.status = 'error';
      console.error('Quick insight failed:', error);
      throw error;
    }
  }

  /**
   * Validate an action before execution
   */
  validate(recommendation: AgentRecommendation, actionId: string): ValidationResult {
    const action = recommendation.actions.find((a) => a.id === actionId);

    if (!action) {
      return {
        valid: false,
        safe: false,
        warnings: ['Action not found'],
        required_confirmations: [],
      };
    }

    const warnings: string[] = [];
    const confirmations: string[] = [];

    // Check if command is safe
    const isSafe = SAFE_COMMANDS.has(action.command);
    const isDangerous = DANGEROUS_COMMANDS.has(action.command);

    if (isDangerous) {
      warnings.push(`This action performs a potentially destructive operation: ${action.command}`);
      confirmations.push(`Execute ${action.label}?`);
    }

    // Check affected repos
    if (recommendation.affected_repos.length > 1) {
      warnings.push(`This action will affect ${recommendation.affected_repos.length} repositories`);
      confirmations.push(`Confirm action on ${recommendation.affected_repos.length} repos?`);
    }

    // If action explicitly requires confirmation
    if (action.requires_confirmation) {
      confirmations.push(`Confirm: ${action.label}`);
    }

    return {
      valid: true,
      safe: isSafe && !isDangerous,
      warnings,
      required_confirmations: confirmations,
    };
  }

  /**
   * Execute an action
   * Note: Actual git operations are handled by Dashboard component.
   * This method validates the action and returns metadata for execution.
   */
  async execute(
    recommendation: AgentRecommendation,
    actionId: string,
    _context: AgentContext
  ): Promise<ExecutionResult> {
    const validation = this.validate(recommendation, actionId);

    if (!validation.valid) {
      return {
        success: false,
        action_id: actionId,
        message: validation.warnings.join('; '),
        affected_repos: [],
        rollback_possible: false,
      };
    }

    const action = recommendation.actions.find((a) => a.id === actionId);
    if (!action) {
      return {
        success: false,
        action_id: actionId,
        message: 'Action not found in recommendation',
        affected_repos: recommendation.affected_repos,
        rollback_possible: false,
      };
    }

    // For safe actions, mark as success and let Dashboard handle execution
    // For dangerous actions, Dashboard will show confirmation dialog first
    const isDangerous = DANGEROUS_COMMANDS.has(action.command);
    const needsConfirmation = action.requires_confirmation || isDangerous;

    return {
      success: true,
      action_id: actionId,
      message: needsConfirmation
        ? 'Action ready for execution (requires confirmation)'
        : 'Action can be executed safely',
      affected_repos: recommendation.affected_repos,
      rollback_possible: ['stash'].includes(action.command),
    };
  }

  /**
   * Parse AI response JSON
   */
  private parseResponse(text: string): Omit<AgentResponse, 'timestamp' | 'processing_time_ms'> {
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      const parsed = JSON.parse(jsonText);

      // Validate structure
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid response: missing recommendations array');
      }

      if (!parsed.insights || typeof parsed.insights !== 'object') {
        throw new Error('Invalid response: missing insights object');
      }

      // Limit recommendations
      const recommendations = parsed.recommendations.slice(0, this.config.maxRecommendations);

      return {
        recommendations,
        insights: parsed.insights,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Response text:', text);

      // Return fallback response
      return {
        recommendations: [],
        insights: {
          repos_needing_attention: 0,
          potential_archival: 0,
          health_improving: false,
          workflow_patterns: [],
          anomalies: ['Failed to parse AI response'],
        },
      };
    }
  }
}

// Singleton instance
let agentInstance: AIAgentService | null = null;

/**
 * Get or create AI agent service
 */
export function getAIAgentService(config: AIConfig): AIAgentService {
  if (!agentInstance) {
    agentInstance = new AIAgentService(config);
  } else {
    agentInstance.updateConfig(config);
  }
  return agentInstance;
}

/**
 * Reset AI agent service (for testing)
 */
export function resetAIAgentService(): void {
  agentInstance = null;
}
