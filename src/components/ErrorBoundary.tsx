/**
 * Error Boundary Component
 * Catches and displays errors that occur during rendering
 */

import React, { Component, ReactNode } from 'react';
import { Box, Text } from 'ink';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console for debugging
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
          <Box marginBottom={1}>
            <Text bold color="red">
              ⚠️  An error occurred
            </Text>
          </Box>

          {this.state.error && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Error:</Text>
              <Text color="red">{this.state.error.message}</Text>
            </Box>
          )}

          {this.state.errorInfo && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Stack:</Text>
              <Text dimColor>{this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}</Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text dimColor>Press Ctrl+C to exit</Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
