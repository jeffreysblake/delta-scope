/**
 * Configuration validation service
 * Validates config on startup and provides helpful warnings
 */

import { existsSync, statSync } from 'fs';
import type { AppConfig } from '../types/index.js';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'paths' | 'ai' | 'performance' | 'general';
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  canProceed: boolean; // Can app start despite issues?
}

/**
 * Validate the application configuration
 */
export function validateConfig(config: AppConfig): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Validate base paths
  validateBasePaths(config, issues);

  // Validate AI configuration if enabled
  if (config.ai?.enabled) {
    validateAIConfig(config, issues);
  }

  // Validate performance settings
  validatePerformanceSettings(config, issues);

  // Validate general settings
  validateGeneralSettings(config, issues);

  // Determine if app can proceed
  const hasErrors = issues.some((i) => i.type === 'error');
  const canProceed = !hasErrors;

  return {
    valid: issues.length === 0,
    issues,
    canProceed,
  };
}

/**
 * Validate base paths exist and are accessible
 */
function validateBasePaths(config: AppConfig, issues: ValidationIssue[]): void {
  if (!config.basePaths || config.basePaths.length === 0) {
    issues.push({
      type: 'error',
      category: 'paths',
      message: 'No base paths configured',
      suggestion: 'Press "c" to open Settings and configure repository paths',
    });
    return;
  }

  for (const basePath of config.basePaths) {
    // Expand home directory
    const expandedPath = basePath.replace(/^~/, process.env.HOME || '~');

    // Check if path exists
    if (!existsSync(expandedPath)) {
      issues.push({
        type: 'warning',
        category: 'paths',
        message: `Base path does not exist: ${basePath}`,
        suggestion: 'Remove this path from config or create the directory',
      });
      continue;
    }

    // Check if path is a directory
    try {
      const stats = statSync(expandedPath);
      if (!stats.isDirectory()) {
        issues.push({
          type: 'error',
          category: 'paths',
          message: `Base path is not a directory: ${basePath}`,
          suggestion: 'Ensure base paths point to directories, not files',
        });
      }
    } catch (error) {
      issues.push({
        type: 'warning',
        category: 'paths',
        message: `Cannot access base path: ${basePath}`,
        suggestion: 'Check file permissions',
      });
    }
  }
}

/**
 * Validate AI configuration
 */
function validateAIConfig(config: AppConfig, issues: ValidationIssue[]): void {
  const ai = config.ai;

  if (!ai) {
    return;
  }

  // Check provider is valid
  const validProviders = ['anthropic', 'openai', 'local'];
  if (!validProviders.includes(ai.provider)) {
    issues.push({
      type: 'error',
      category: 'ai',
      message: `Invalid AI provider: ${ai.provider}`,
      suggestion: 'Provider must be one of: anthropic, openai, local',
    });
  }

  // Check API key for cloud providers
  if (ai.provider === 'anthropic' || ai.provider === 'openai') {
    if (!ai.apiKey || ai.apiKey === '' || ai.apiKey === 'your-api-key-here') {
      issues.push({
        type: 'error',
        category: 'ai',
        message: `${ai.provider} requires an API key`,
        suggestion: 'Press "c" then "k" to set your API key',
      });
    }

    // Validate API key format
    if (ai.provider === 'anthropic' && ai.apiKey && !ai.apiKey.startsWith('sk-ant-')) {
      issues.push({
        type: 'warning',
        category: 'ai',
        message: 'Anthropic API key should start with "sk-ant-"',
        suggestion: 'Verify your API key is correct',
      });
    }

    if (ai.provider === 'openai' && ai.apiKey && !ai.apiKey.startsWith('sk-')) {
      issues.push({
        type: 'warning',
        category: 'ai',
        message: 'OpenAI API key should start with "sk-"',
        suggestion: 'Verify your API key is correct',
      });
    }
  }

  // Check model is set
  if (!ai.model || ai.model === '') {
    issues.push({
      type: 'error',
      category: 'ai',
      message: 'AI model not specified',
      suggestion: 'Press "c" then "m" to set the model name',
    });
  }

  // Check endpoint for local/OpenAI
  if (ai.provider === 'local' || ai.provider === 'openai') {
    if (!ai.endpoint || ai.endpoint === '') {
      const defaultEndpoint =
        ai.provider === 'local' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1';
      issues.push({
        type: 'warning',
        category: 'ai',
        message: `No endpoint specified for ${ai.provider}`,
        suggestion: `Default will be used: ${defaultEndpoint}`,
      });
    }

    // Validate endpoint format
    if (ai.endpoint && !ai.endpoint.startsWith('http://') && !ai.endpoint.startsWith('https://')) {
      issues.push({
        type: 'error',
        category: 'ai',
        message: 'AI endpoint must start with http:// or https://',
        suggestion: 'Example: http://localhost:11434/v1',
      });
    }
  }

  // Warn about timeout if too low
  if (ai.timeout && ai.timeout < 10000) {
    issues.push({
      type: 'warning',
      category: 'ai',
      message: 'AI timeout is very low (< 10s)',
      suggestion: 'Recommended: 30000ms (30s) or higher for complex analysis',
    });
  }

  // Warn about auto-analyze with cloud providers (cost)
  if (ai.autoAnalyze && (ai.provider === 'anthropic' || ai.provider === 'openai')) {
    issues.push({
      type: 'info',
      category: 'ai',
      message: 'Auto-analyze is enabled with a paid AI provider',
      suggestion: 'This will incur API costs on every refresh. Consider using local models or disabling auto-analyze',
    });
  }
}

/**
 * Validate performance settings
 */
function validatePerformanceSettings(config: AppConfig, issues: ValidationIssue[]): void {
  // Warn if maxDepth is very high
  if (config.maxDepth && config.maxDepth > 10) {
    issues.push({
      type: 'warning',
      category: 'performance',
      message: `maxDepth is very high (${config.maxDepth})`,
      suggestion: 'High depth can slow down scanning. Recommended: 3-5',
    });
  }

  // Warn if refreshInterval is very low
  if (config.refreshInterval && config.refreshInterval < 10000) {
    issues.push({
      type: 'warning',
      category: 'performance',
      message: `refreshInterval is very low (${config.refreshInterval}ms)`,
      suggestion: 'Frequent refreshes can slow down the UI. Recommended: 60000ms (1 min)',
    });
  }

  // Suggest exclude patterns if none set
  if (!config.excludePatterns || config.excludePatterns.length === 0) {
    issues.push({
      type: 'info',
      category: 'performance',
      message: 'No exclude patterns configured',
      suggestion: 'Consider excluding: node_modules, dist, build, .venv, target',
    });
  }

  // Warn if common patterns are missing
  const commonPatterns = ['node_modules', 'dist', 'build', '.venv', 'target', 'vendor'];
  const missingPatterns = commonPatterns.filter(
    (pattern) => !config.excludePatterns?.includes(pattern)
  );

  if (missingPatterns.length > 0 && config.excludePatterns && config.excludePatterns.length > 0) {
    issues.push({
      type: 'info',
      category: 'performance',
      message: `Consider excluding: ${missingPatterns.join(', ')}`,
      suggestion: 'These directories can slow down scanning',
    });
  }
}

/**
 * Validate general settings
 */
function validateGeneralSettings(config: AppConfig, issues: ValidationIssue[]): void {
  // Check theme is valid
  if (config.theme && config.theme !== 'dark' && config.theme !== 'light') {
    issues.push({
      type: 'warning',
      category: 'general',
      message: `Unknown theme: ${config.theme}`,
      suggestion: 'Theme must be "dark" or "light"',
    });
  }
}

/**
 * Quick validation - returns true if config is minimally valid
 */
export function isConfigValid(config: AppConfig): boolean {
  // Must have at least one base path
  if (!config.basePaths || config.basePaths.length === 0) {
    return false;
  }

  // If AI is enabled, must have provider and model
  if (config.ai?.enabled) {
    if (!config.ai.provider || !config.ai.model) {
      return false;
    }

    // Cloud providers must have API key
    if (
      (config.ai.provider === 'anthropic' || config.ai.provider === 'openai') &&
      (!config.ai.apiKey || config.ai.apiKey === '')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Format validation issues for display
 */
export function formatIssues(issues: ValidationIssue[]): string {
  const errors = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');
  const infos = issues.filter((i) => i.type === 'info');

  const lines: string[] = [];

  if (errors.length > 0) {
    lines.push('ERRORS:');
    errors.forEach((issue) => {
      lines.push(`  ❌ ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`     💡 ${issue.suggestion}`);
      }
    });
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('WARNINGS:');
    warnings.forEach((issue) => {
      lines.push(`  ⚠️  ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`     💡 ${issue.suggestion}`);
      }
    });
    lines.push('');
  }

  if (infos.length > 0) {
    lines.push('SUGGESTIONS:');
    infos.forEach((issue) => {
      lines.push(`  ℹ️  ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`     💡 ${issue.suggestion}`);
      }
    });
  }

  return lines.join('\n');
}
