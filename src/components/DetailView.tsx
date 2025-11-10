/**
 * Detail view component - displays detailed repository information
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { GitRepo } from '../types/index.js';
import { StatusBadge } from './StatusBadge.js';

interface DetailViewProps {
  repo: GitRepo;
}

export const DetailView: React.FC<DetailViewProps> = ({ repo }) => {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {repo.name}
        </Text>
        <Text dimColor> </Text>
        <StatusBadge status={repo.status} />
        {repo.isFavorite && (
          <>
            <Text dimColor> </Text>
            <Text color="yellow">★</Text>
          </>
        )}
      </Box>

      {/* Repository Info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text bold>Path: </Text>
          <Text dimColor>{repo.path}</Text>
        </Text>
        <Text>
          <Text bold>Branch: </Text>
          <Text color="cyan">{repo.branch}</Text>
        </Text>
      </Box>

      {/* Status Details */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          Status:
        </Text>
        {repo.uncommittedFiles > 0 && (
          <Text>
            <Text dimColor>  • </Text>
            <Text color="yellow">{repo.uncommittedFiles} uncommitted files</Text>
          </Text>
        )}
        {repo.unpushedCommits > 0 && (
          <Text>
            <Text dimColor>  • </Text>
            <Text color="yellow">{repo.unpushedCommits} unpushed commits</Text>
          </Text>
        )}
        {repo.linesAdded > 0 && (
          <Text>
            <Text dimColor>  • </Text>
            <Text color="green">+{repo.linesAdded} lines added</Text>
          </Text>
        )}
        {repo.linesDeleted > 0 && (
          <Text>
            <Text dimColor>  • </Text>
            <Text color="red">-{repo.linesDeleted} lines deleted</Text>
          </Text>
        )}
        {repo.status === 'clean' && (
          <Text dimColor>  • Working directory clean</Text>
        )}
      </Box>

      {/* Remotes */}
      {repo.remotes.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            Remotes:
          </Text>
          {repo.remotes.map((remote) => (
            <Text key={remote}>
              <Text dimColor>  • </Text>
              <Text>{remote}</Text>
            </Text>
          ))}
        </Box>
      )}

      {/* Last Commit */}
      {repo.lastCommitMessage && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="magenta">
            Last Commit:
          </Text>
          <Text>
            <Text dimColor>  </Text>
            <Text>{repo.lastCommitMessage}</Text>
          </Text>
          {repo.lastCommitDate && (
            <Text dimColor>
              {'  '}
              {repo.lastCommitDate.toLocaleString()}
            </Text>
          )}
        </Box>
      )}

      {/* Footer hint */}
      <Box marginTop={1} borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text dimColor>Press Escape or h to return to main view</Text>
      </Box>
    </Box>
  );
};
