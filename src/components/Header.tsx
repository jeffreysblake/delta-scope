/**
 * Header component - displays app title and stats
 */

import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  totalRepos: number;
  needsAttention: number;
  lastRefresh: Date | null;
}

export const Header: React.FC<HeaderProps> = ({ totalRepos, needsAttention, lastRefresh }) => {
  const refreshText = lastRefresh
    ? lastRefresh.toLocaleTimeString()
    : 'Never';

  return (
    <Box borderStyle="single" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="magenta">
          delta-scope v0.1.0
        </Text>
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
        <Text dimColor>[?] Help</Text>
      </Box>
    </Box>
  );
};
