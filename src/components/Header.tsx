/**
 * Header component - displays app title, breadcrumbs, and stats
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { View } from '../types/index.js';

interface HeaderProps {
  totalRepos: number;
  needsAttention: number;
  lastRefresh: Date | null;
  view: View;
  currentRepoName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  totalRepos,
  needsAttention,
  lastRefresh,
  view,
  currentRepoName,
}) => {
  const refreshText = lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never';

  // Build breadcrumb trail
  const getBreadcrumb = () => {
    const base = (
      <Text bold color="magenta">
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
