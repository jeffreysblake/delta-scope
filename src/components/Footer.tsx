/**
 * Footer component - displays keyboard shortcuts
 */

import React from 'react';
import { Box, Text, useStdout } from 'ink';

interface FooterProps {
  view: string;
}

export const Footer: React.FC<FooterProps> = ({ view }) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const isNarrow = terminalWidth < 100;

  if (view === 'help') {
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
        <Text dimColor>Press any key to return</Text>
      </Box>
    );
  }

  if (view === 'settings') {
    if (isNarrow) {
      return (
        <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
          <Text dimColor>Esc/c | ?: Help | q: Quit | </Text>
          <Text color="yellow">Edit soon</Text>
        </Box>
      );
    }
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
        <Text dimColor>Esc/c: Close | </Text>
        <Text dimColor>?: Help | </Text>
        <Text dimColor>q: Quit | </Text>
        <Text color="yellow">Editing coming soon</Text>
      </Box>
    );
  }

  if (view === 'detail') {
    if (isNarrow) {
      return (
        <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
          <Text dimColor>Esc/h | x | r | F5 | ?: Help | q</Text>
        </Box>
      );
    }
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
        <Text dimColor>Esc/h: Back | </Text>
        <Text dimColor>x: Disable | </Text>
        <Text dimColor>r: Refresh | </Text>
        <Text dimColor>F5: Full Scan | </Text>
        <Text dimColor>?: Help | </Text>
        <Text dimColor>q: Quit</Text>
      </Box>
    );
  }

  if (view === 'agent') {
    if (isNarrow) {
      return (
        <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
          <Text dimColor>↑↓/kj | ⏎/␣ | e | x | Esc/i | ? | q</Text>
        </Box>
      );
    }
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
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

  // Home view
  if (isNarrow) {
    return (
      <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
        <Text dimColor>↑↓ | ⏎ | d | f | / | s | y | r | F5 | i | c | ? | q</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%" height={3}>
      <Text dimColor>↑/↓: Navigate | </Text>
      <Text dimColor>Enter: Expand | </Text>
      <Text dimColor>d: Details | </Text>
      <Text dimColor>f: Fav | </Text>
      <Text dimColor>/: Filter | </Text>
      <Text dimColor>s: Sort | </Text>
      <Text dimColor>y: System | </Text>
      <Text dimColor>r: Refresh | </Text>
      <Text dimColor>F5: Scan | </Text>
      <Text dimColor>i: AI | </Text>
      <Text dimColor>c: Config | </Text>
      <Text dimColor>?: Help | </Text>
      <Text dimColor>q: Quit</Text>
    </Box>
  );
};
