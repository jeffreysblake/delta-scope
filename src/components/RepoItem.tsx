/**
 * Individual repository item component
 */

import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { GitRepo } from '../types/index.js';
import { StatusBadge } from './StatusBadge.js';
import { getSeverityColor, isSevereBold, NAV_SYMBOLS } from '../utils/colors.js';
import { truncatePath, formatRelativeTime, formatCompactNumber, diffBar } from '../utils/format.js';

interface RepoItemProps {
  repo: GitRepo;
  isSelected: boolean;
  compact?: boolean;
  isLast?: boolean;
}

export const RepoItem: React.FC<RepoItemProps> = ({ repo, isSelected, compact = false, isLast = false }) => {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 100;
  const pathMaxWidth = Math.max(40, termWidth - 40);

  const uncommittedColor = getSeverityColor(repo.uncommittedFiles);
  const uncommittedBold = isSevereBold(repo.uncommittedFiles);

  if (compact) {
    return (
      <Box>
        <Text dimColor>{isLast ? NAV_SYMBOLS.corner : NAV_SYMBOLS.branch}</Text>
        <StatusBadge status={repo.status} />
        <Text inverse={isSelected}> {repo.name}</Text>
        <Text dimColor> [{repo.branch}]</Text>
        {repo.uncommittedFiles > 0 && (
          <Text color={uncommittedColor} bold={uncommittedBold}>
            {' '}{formatCompactNumber(repo.uncommittedFiles)} files
          </Text>
        )}
        {repo.isFavorite && <Text color="magenta"> ★</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {/* Repo name line */}
      <Box>
        <Text dimColor>{isLast ? NAV_SYMBOLS.corner : NAV_SYMBOLS.branch}</Text>
        <Text> </Text>
        <StatusBadge status={repo.status} />
        <Text bold inverse={isSelected}> {repo.name}</Text>
        {repo.isFavorite && <Text color="magenta"> ★</Text>}
      </Box>

      {/* Path line - truncated */}
      <Box paddingLeft={4}>
        <Text dimColor>Path: {truncatePath(repo.path, pathMaxWidth)}</Text>
      </Box>

      {/* Branch and changes line */}
      <Box paddingLeft={4}>
        <Text dimColor>Branch: </Text>
        <Text color="cyan">{repo.branch}</Text>
        {(repo.linesAdded > 0 || repo.linesDeleted > 0) && (
          <>
            <Text dimColor> {NAV_SYMBOLS.separator} </Text>
            <Text color="green">+{formatCompactNumber(repo.linesAdded)}</Text>
            <Text> </Text>
            <Text color="red">-{formatCompactNumber(repo.linesDeleted)}</Text>
            <Text dimColor> </Text>
            <Text>{diffBar(repo.linesAdded, repo.linesDeleted, 6)}</Text>
          </>
        )}
        {repo.lastCommitDate && (
          <>
            <Text dimColor> {NAV_SYMBOLS.separator} </Text>
            <Text dimColor>{formatRelativeTime(repo.lastCommitDate)}</Text>
          </>
        )}
      </Box>

      {/* Status details line */}
      {(repo.uncommittedFiles > 0 || repo.unpushedCommits > 0) && (
        <Box paddingLeft={4}>
          {repo.uncommittedFiles > 0 && (
            <>
              <Text color={uncommittedColor} bold={uncommittedBold}>
                {formatCompactNumber(repo.uncommittedFiles)} uncommitted
              </Text>
              {repo.unpushedCommits > 0 && <Text dimColor> {NAV_SYMBOLS.separator} </Text>}
            </>
          )}
          {repo.unpushedCommits > 0 && (
            <Text color="blue">{repo.unpushedCommits} unpushed</Text>
          )}
        </Box>
      )}
    </Box>
  );
};
