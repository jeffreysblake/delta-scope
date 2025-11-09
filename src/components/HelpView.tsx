/**
 * Help view component - displays keyboard shortcuts and usage
 */

import React from 'react';
import { Box, Text } from 'ink';
import { HELP_TEXT } from '../utils/keybindings.js';

export const HelpView: React.FC = () => {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold color="cyan">
        delta-scope Help
      </Text>
      <Text>{HELP_TEXT}</Text>
      <Box marginTop={1}>
        <Text dimColor>Press any key to return to the main view</Text>
      </Box>
    </Box>
  );
};
