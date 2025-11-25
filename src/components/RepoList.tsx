/**
 * Repository list component - displays repos grouped by status
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { RepoGroup, DisplayMode } from '../types/index.js';
import { StatusBadge } from './StatusBadge.js';
import { RepoItem } from './RepoItem.js';
import { NAV_SYMBOLS, getSeverityColor, isSevereBold } from '../utils/colors.js';
import { formatCompactNumber } from '../utils/format.js';

interface RepoListProps {
  groups: RepoGroup[];
  selectedGroupIndex: number;
  selectedRepoIndex: number;
  onToggleGroup: (groupIndex: number) => void;
  scrollPosition?: { current: number; total: number };
  displayMode?: DisplayMode;
}

export const RepoList: React.FC<RepoListProps> = ({
  groups,
  selectedGroupIndex,
  selectedRepoIndex,
  scrollPosition,
  displayMode = 'detailed',
}) => {
  // Calculate group summary stats
  const getGroupStats = (group: RepoGroup) => {
    const totalFiles = group.repos.reduce((sum, r) => sum + r.uncommittedFiles, 0);
    const totalCommits = group.repos.reduce((sum, r) => sum + r.unpushedCommits, 0);
    return { totalFiles, totalCommits };
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Scroll position indicator */}
      {scrollPosition && scrollPosition.total > 0 && (
        <Box justifyContent="flex-end" marginBottom={0}>
          <Text dimColor>
            [{scrollPosition.current}/{scrollPosition.total}]
          </Text>
        </Box>
      )}

      {groups.map((group, groupIndex) => {
        const isGroupHeaderSelected = groupIndex === selectedGroupIndex && selectedRepoIndex === -1;
        const stats = getGroupStats(group);
        const filesColor = getSeverityColor(stats.totalFiles);
        const filesBold = isSevereBold(stats.totalFiles);

        return (
          <Box key={group.status} flexDirection="column" marginY={0}>
            {/* Group header with expand/collapse indicator */}
            <Box>
              <Text inverse={isGroupHeaderSelected}>
                <Text>{group.expanded ? NAV_SYMBOLS.expanded : NAV_SYMBOLS.collapsed}</Text>
                <Text> </Text>
                <StatusBadge status={group.status} showLabel count={group.repos.length} />
              </Text>
              {/* Group summary stats */}
              {stats.totalFiles > 0 && (
                <Text color={filesColor} bold={filesBold}>
                  {' '}({formatCompactNumber(stats.totalFiles)} files)
                </Text>
              )}
              {stats.totalCommits > 0 && (
                <Text color="blue">
                  {stats.totalFiles > 0 ? '' : ' '}({stats.totalCommits} commits)
                </Text>
              )}
            </Box>

            {/* Group items (if expanded) */}
            {group.expanded && (
              <Box flexDirection="column" paddingLeft={2}>
                {group.repos.map((repo, repoIndex) => {
                  const isSelected = groupIndex === selectedGroupIndex && repoIndex === selectedRepoIndex;
                  const isLast = repoIndex === group.repos.length - 1;
                  return (
                    <RepoItem
                      key={repo.path}
                      repo={repo}
                      isSelected={isSelected}
                      isLast={isLast}
                      compact={displayMode === 'compact'}
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
