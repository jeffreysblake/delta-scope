/**
 * Settings view component - displays and edits configuration
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { AppConfig } from '../types/index.js';

interface SettingsViewProps {
  config: AppConfig;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config }) => {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Settings
        </Text>
      </Box>

      {/* General Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          [General]
        </Text>

        <Box marginLeft={2} flexDirection="column">
          <Text>
            <Text dimColor>Base Paths:</Text>
          </Text>
          {config.basePaths.map((path, idx) => (
            <Text key={idx}>
              <Text dimColor>  • </Text>
              <Text>{path}</Text>
            </Text>
          ))}

          <Box marginTop={1}>
            <Text>
              <Text dimColor>Exclude Patterns:</Text>
            </Text>
          </Box>
          {config.excludePatterns.slice(0, 5).map((pattern, idx) => (
            <Text key={idx}>
              <Text dimColor>  • </Text>
              <Text>{pattern}</Text>
            </Text>
          ))}
          {config.excludePatterns.length > 5 && (
            <Text dimColor>  ... and {config.excludePatterns.length - 5} more</Text>
          )}

          <Box marginTop={1}>
            <Text>
              <Text dimColor>Max Depth: </Text>
              <Text>{config.maxDepth}</Text>
            </Text>
          </Box>

          <Text>
            <Text dimColor>Show Hidden: </Text>
            <Text>{config.showHidden ? 'Yes' : 'No'}</Text>
          </Text>
        </Box>
      </Box>

      {/* UI Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          [UI]
        </Text>

        <Box marginLeft={2} flexDirection="column">
          <Text>
            <Text dimColor>Theme: </Text>
            <Text>{config.theme}</Text>
          </Text>

          <Text>
            <Text dimColor>Refresh Interval: </Text>
            <Text>{config.refreshInterval}s</Text>
          </Text>
        </Box>
      </Box>

      {/* Favorites Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          [Favorites] <Text dimColor>(Read-only)</Text>
        </Text>

        <Box marginLeft={2} flexDirection="column">
          {config.favorites.length === 0 ? (
            <Text dimColor>  No favorites yet</Text>
          ) : (
            config.favorites.slice(0, 5).map((fav, idx) => (
              <Text key={idx}>
                <Text dimColor>  ★ </Text>
                <Text>{fav}</Text>
              </Text>
            ))
          )}
          {config.favorites.length > 5 && (
            <Text dimColor>  ... and {config.favorites.length - 5} more</Text>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text dimColor>Press Escape or c to close | Editing coming soon</Text>
      </Box>
    </Box>
  );
};
