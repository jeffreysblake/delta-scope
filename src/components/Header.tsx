/**
 * Header component - displays app title, breadcrumbs, and stats
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { View } from '../types/index.js';
import type { AgentStatus } from '../types/agent.js';

interface HeaderProps {
  totalRepos: number;
  needsAttention: number;
  lastRefresh: Date | null;
  view: View;
  currentRepoName?: string;
  agentStatus?: AgentStatus;
  agentEnabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalRepos,
  needsAttention,
  lastRefresh,
  view,
  currentRepoName,
  agentStatus = 'not_configured',
  agentEnabled = false,
}) => {
  const refreshText = lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never';

  // Agent status indicator
  const getAgentStatusIndicator = () => {
    if (!agentEnabled) {
      return null;
    }

    const statusConfig = {
      ready: { symbol: '🟢', text: 'AI: Ready', color: 'green' },
      analyzing: { symbol: '🟡', text: 'AI: Analyzing', color: 'yellow' },
      error: { symbol: '🔴', text: 'AI: Error', color: 'red' },
      disabled: { symbol: '⚪', text: 'AI: Disabled', color: 'gray' },
      not_configured: { symbol: '⚪', text: 'AI: Not Configured', color: 'gray' },
    };

    const config = statusConfig[agentStatus];
    return (
      <>
        <Text> | </Text>
        <Text color={config.color as 'green' | 'yellow' | 'red' | 'gray'}>
          {config.symbol} {config.text}
        </Text>
      </>
    );
  };

  // Build breadcrumb trail
  const getBreadcrumb = () => {
    const base = (
      <Text key="base" bold color="magenta">
        delta-scope v0.2.0
      </Text>
    );

    if (view === 'home') {
      return base;
    }

    const parts = [base];

    if (view === 'detail' && currentRepoName) {
      parts.push(
        <Text key="sep1" dimColor>
          {' > '}
        </Text>,
        <Text key="detail" color="cyan">
          {currentRepoName}
        </Text>
      );
    } else if (view === 'settings') {
      parts.push(
        <Text key="sep1" dimColor>
          {' > '}
        </Text>,
        <Text key="settings" color="yellow">
          Settings
        </Text>
      );
    } else if (view === 'help') {
      parts.push(
        <Text key="sep1" dimColor>
          {' > '}
        </Text>,
        <Text key="help" color="green">
          Help
        </Text>
      );
    } else if (view === 'agent') {
      parts.push(
        <Text key="sep1" dimColor>
          {' > '}
        </Text>,
        <Text key="agent" color="magenta">
          AI Insights
        </Text>
      );
    }

    return <>{parts}</>;
  };

  return (
    <Box borderStyle="single" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        {getBreadcrumb()}
        <Box>
          <Text dimColor>[{totalRepos} repos</Text>
          {needsAttention > 0 && (
            <>
              <Text> | </Text>
              <Text color="yellow">{needsAttention} need attention</Text>
            </>
          )}
          {getAgentStatusIndicator()}
          <Text dimColor>]</Text>
        </Box>
      </Box>
      <Box justifyContent="space-between">
        <Text dimColor>Last refresh: {refreshText}</Text>
        <Text dimColor>[c] Settings | [?] Help</Text>
      </Box>
    </Box>
  );
};
