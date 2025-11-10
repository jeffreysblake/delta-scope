/**
 * Footer component - displays keyboard shortcuts
 */

import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  view: string;
}

export const Footer: React.FC<FooterProps> = ({ view }) => {
  if (view === 'help') {
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text dimColor>Press any key to return</Text>
      </Box>
    );
  }

  if (view === 'detail') {
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text dimColor>Esc/h: Back | </Text>
        <Text dimColor>r: Refresh | </Text>
        <Text dimColor>?: Help | </Text>
        <Text dimColor>q: Quit</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1}>
      <Text dimColor>↑/↓: Navigate | </Text>
      <Text dimColor>Enter: Expand/Details | </Text>
      <Text dimColor>d: Details | </Text>
      <Text dimColor>/: Filter | </Text>
      <Text dimColor>s: Sort | </Text>
      <Text dimColor>r: Refresh | </Text>
      <Text dimColor>h: Home | </Text>
      <Text dimColor>?: Help | </Text>
      <Text dimColor>q: Quit</Text>
    </Box>
  );
};
