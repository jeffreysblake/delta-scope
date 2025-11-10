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

  if (view === 'settings') {
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text dimColor>Esc/c: Close | </Text>
        <Text dimColor>?: Help | </Text>
        <Text dimColor>q: Quit | </Text>
        <Text color="yellow">Editing coming soon</Text>
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

  if (view === 'agent') {
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text dimColor>↑/↓/k/j: Navigate | </Text>
        <Text dimColor>Enter/Space: Expand | </Text>
        <Text dimColor>e: Execute | </Text>
        <Text dimColor>x: Dismiss | </Text>
        <Text dimColor>Esc/i: Close | </Text>
        <Text dimColor>?: Help | </Text>
        <Text dimColor>q: Quit</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1}>
      <Text dimColor>↑/↓: Navigate | </Text>
      <Text dimColor>Enter: Expand | </Text>
      <Text dimColor>d: Details | </Text>
      <Text dimColor>f: Fav | </Text>
      <Text dimColor>/: Filter | </Text>
      <Text dimColor>s: Sort | </Text>
      <Text dimColor>r: Refresh | </Text>
      <Text dimColor>i: AI | </Text>
      <Text dimColor>c: Config | </Text>
      <Text dimColor>?: Help | </Text>
      <Text dimColor>q: Quit</Text>
    </Box>
  );
};
