/**
 * Header component - displays app title, breadcrumbs, and stats
 */

import React from 'react';
import { Box, Text, useStdout } from 'ink';
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
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const isNarrow = terminalWidth < 100;

  const refreshText = lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never';

  // Agent status indicator
  const getAgentStatusIndicator = () => {
    if (!agentEnabled) {
      return null;
    }

    const statusConfig = {
      ready: { symbol: '🟢', text: isNarrow ? 'AI' : 'AI: Ready', color: 'green' },
      analyzing: { symbol: '🟡', text: isNarrow ? 'AI...' : 'AI: Analyzing', color: 'yellow' },
      error: { symbol: '🔴', text: isNarrow ? 'AI!' : 'AI: Error', color: 'red' },
      disabled: { symbol: '⚪', text: isNarrow ? 'AI-' : 'AI: Disabled', color: 'gray' },
      not_configured: { symbol: '⚪', text: isNarrow ? 'AI?' : 'AI: Not Configured', color: 'gray' },
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
        {isNarrow ? 'delta-scope' : 'delta-scope v0.2.0'}
      </Text>
    );

    if (view === 'home') {
      return base;
    }

    const parts = [base];

    if (view === 'detail' && currentRepoName) {
      // Truncate repo name if too long on narrow terminals
      const displayName = isNarrow && currentRepoName.length > 20
        ? currentRepoName.substring(0, 17) + '...'
        : currentRepoName;
      parts.push(
        <Text key="sep1" dimColor>
          {' > '}
        </Text>,
        <Text key="detail" color="cyan">
          {displayName}
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
          {isNarrow ? 'AI' : 'AI Insights'}
        </Text>
      );
    }

    return <>{parts}</>;
  };

  return (
    <Box borderStyle="single" borderColor="cyan" flexDirection="column" paddingX={1} width="100%" height={4}>
      <Box justifyContent="space-between">
        {getBreadcrumb()}
        <Box>
          <Text dimColor>[{totalRepos} {isNarrow ? 'r' : 'repos'}</Text>
          {needsAttention > 0 && (
            <>
              <Text> | </Text>
              <Text color="yellow">{needsAttention} {isNarrow ? '!' : 'need attention'}</Text>
            </>
          )}
          {getAgentStatusIndicator()}
          <Text dimColor>]</Text>
        </Box>
      </Box>
      <Box justifyContent="space-between">
        <Text dimColor>{isNarrow ? 'Ref:' : 'Last refresh:'} {refreshText}</Text>
        <Text dimColor>{isNarrow ? '[c][?]' : '[c] Settings | [?] Help'}</Text>
      </Box>
    </Box>
  );
};
