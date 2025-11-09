/**
 * Individual repository item component
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { GitRepo } from '../types/index.js';
import { StatusBadge } from './StatusBadge.js';

interface RepoItemProps {
  repo: GitRepo;
  isSelected: boolean;
  compact?: boolean;
}

export const RepoItem: React.FC<RepoItemProps> = ({ repo, isSelected, compact = false }) => {
  if (compact) {
    return (
      <Box>
        <StatusBadge status={repo.status} />
        <Text inverse={isSelected}> {repo.name}</Text>
        <Text dimColor> [{repo.branch}]</Text>
        {repo.isFavorite && <Text color="magenta"> ★</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box>
        <StatusBadge status={repo.status} />
        <Text bold inverse={isSelected}> {repo.name}</Text>
        {repo.isFavorite && <Text color="magenta"> ★</Text>}
      </Box>
      <Box paddingLeft={2}>
        <Text dimColor>Path: {repo.path}</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text dimColor>Branch: </Text>
        <Text color="cyan">{repo.branch}</Text>
        {(repo.linesAdded > 0 || repo.linesDeleted > 0) && (
          <>
            <Text dimColor> | Changes: </Text>
            <Text color="green">+{repo.linesAdded}</Text>
            <Text> </Text>
            <Text color="red">-{repo.linesDeleted}</Text>
          </>
        )}
      </Box>
      {repo.uncommittedFiles > 0 && (
        <Box paddingLeft={2}>
          <Text color="yellow">{repo.uncommittedFiles} uncommitted files</Text>
        </Box>
      )}
      {repo.unpushedCommits > 0 && (
        <Box paddingLeft={2}>
          <Text color="blue">{repo.unpushedCommits} unpushed commits</Text>
        </Box>
      )}
    </Box>
  );
};
