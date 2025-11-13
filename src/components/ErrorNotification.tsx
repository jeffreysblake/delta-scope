/**
 * ErrorNotification component
 * Displays user-friendly error notifications with helpful context and suggestions
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface ErrorContext {
  error: Error | string;
  category?: 'network' | 'git' | 'ai' | 'config' | 'general';
  suggestion?: string;
  retryable?: boolean;
}

interface ErrorNotificationProps {
  context: ErrorContext;
  onDismiss?: () => void;
  onRetry?: () => void;
}

/**
 * Generate user-friendly error message and suggestion based on error type
 */
function enhanceError(context: ErrorContext): { message: string; suggestion: string } {
  const errorMessage = context.error instanceof Error ? context.error.message : context.error;

  // Return custom message if provided
  if (context.suggestion) {
    return { message: errorMessage, suggestion: context.suggestion };
  }

  // Network errors
  if (
    context.category === 'network' ||
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('timeout') ||
    errorMessage.toLowerCase().includes('fetch failed') ||
    errorMessage.toLowerCase().includes('econnrefused')
  ) {
    return {
      message: errorMessage,
      suggestion: 'Check your internet connection. The operation will retry automatically.',
    };
  }

  // Git errors
  if (
    context.category === 'git' ||
    errorMessage.toLowerCase().includes('git') ||
    errorMessage.toLowerCase().includes('repository') ||
    errorMessage.toLowerCase().includes('commit') ||
    errorMessage.toLowerCase().includes('push')
  ) {
    if (errorMessage.includes('lock') || errorMessage.includes('locked')) {
      return {
        message: errorMessage,
        suggestion: 'Git lock detected. Wait a moment and try again.',
      };
    }
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return {
        message: errorMessage,
        suggestion: 'Permission denied. Verify your git credentials and branch permissions.',
      };
    }
    if (errorMessage.includes('ahead') || errorMessage.includes('behind')) {
      return {
        message: errorMessage,
        suggestion: 'Branch diverged. Pull latest changes or force push (use with caution).',
      };
    }
    return {
      message: errorMessage,
      suggestion: 'Git operation failed. Check repository status and try again.',
    };
  }

  // AI errors
  if (
    context.category === 'ai' ||
    errorMessage.toLowerCase().includes('api key') ||
    errorMessage.toLowerCase().includes('anthropic') ||
    errorMessage.toLowerCase().includes('openai') ||
    errorMessage.toLowerCase().includes('model')
  ) {
    if (errorMessage.includes('API key') || errorMessage.includes('apiKey')) {
      return {
        message: errorMessage,
        suggestion: 'Press "c" to open Settings and configure your AI API key.',
      };
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        message: errorMessage,
        suggestion: 'Rate limit exceeded. Wait a moment before retrying.',
      };
    }
    if (errorMessage.includes('timeout')) {
      return {
        message: errorMessage,
        suggestion: 'AI request timed out. Try increasing timeout in settings or use a simpler prompt.',
      };
    }
    return {
      message: errorMessage,
      suggestion: 'AI provider error. Check your API key and configuration in Settings.',
    };
  }

  // Config errors
  if (context.category === 'config' || errorMessage.toLowerCase().includes('config')) {
    return {
      message: errorMessage,
      suggestion: 'Press "c" to open Settings and check your configuration.',
    };
  }

  // Default
  return {
    message: errorMessage,
    suggestion: 'Try the operation again or check the logs for more details.',
  };
}

/**
 * Get icon for error category
 */
function getErrorIcon(category?: string): string {
  switch (category) {
    case 'network':
      return '🌐';
    case 'git':
      return '🔀';
    case 'ai':
      return '🤖';
    case 'config':
      return '⚙️';
    default:
      return '❌';
  }
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  context,
  onDismiss,
  onRetry,
}) => {
  const enhanced = enhanceError(context);
  const icon = getErrorIcon(context.category);

  return (
    <Box
      flexDirection="column"
      borderStyle="bold"
      borderColor="red"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color="red">
          {icon} Error
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="red">{enhanced.message}</Text>
      </Box>

      {enhanced.suggestion && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>💡 {enhanced.suggestion}</Text>
        </Box>
      )}

      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {context.retryable && onRetry && 'Press "r" to retry • '}
          {onDismiss && 'Press any key to dismiss'}
        </Text>
      </Box>
    </Box>
  );
};
