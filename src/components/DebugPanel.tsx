/**
 * Debug panel component - shows debug info during development
 * Only rendered when DEV=true
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { DebugInfo } from '../types/index.js';

interface DebugPanelProps {
  info: DebugInfo;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ info }) => {
  return (
    <Box borderStyle="single" borderColor="yellow" flexDirection="column" paddingX={1}>
      <Text color="yellow" bold>
        DEBUG MODE
      </Text>
      <Text dimColor>View: {info.view}</Text>
      <Text dimColor>Selected Index: {info.selectedIndex}</Text>
      <Text dimColor>Repo Count: {info.repoCount}</Text>
      <Text dimColor>Filter Active: {info.filterActive ? 'Yes' : 'No'}</Text>
      <Text dimColor>Last Keypress: {info.lastKeypress || 'none'}</Text>
      <Text dimColor>Render Time: {info.renderTime}ms</Text>
    </Box>
  );
};
