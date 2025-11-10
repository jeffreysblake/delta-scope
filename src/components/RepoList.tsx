/**
 * Repository list component - displays repos grouped by status
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { RepoGroup } from '../types/index.js';
import { StatusBadge } from './StatusBadge.js';
import { RepoItem } from './RepoItem.js';

interface RepoListProps {
  groups: RepoGroup[];
  selectedGroupIndex: number;
  selectedRepoIndex: number;
  onToggleGroup: (groupIndex: number) => void;
}

export const RepoList: React.FC<RepoListProps> = ({
  groups,
  selectedGroupIndex,
  selectedRepoIndex,
}) => {
  return (
    <Box flexDirection="column" paddingX={1}>
      {groups.map((group, groupIndex) => {
        // Group header is selected if this group is selected and no repo is selected
        const isGroupHeaderSelected = groupIndex === selectedGroupIndex && selectedRepoIndex === -1;

        return (
          <Box key={group.status} flexDirection="column" marginY={0}>
            {/* Group header */}
            <Box>
              <Text inverse={isGroupHeaderSelected}>
                <StatusBadge status={group.status} showLabel count={group.repos.length} />
                <Text dimColor> [{group.expanded ? 'expanded' : 'collapsed'}]</Text>
              </Text>
            </Box>

            {/* Group items (if expanded) */}
            {group.expanded && (
              <Box flexDirection="column" paddingLeft={2}>
                {group.repos.map((repo, repoIndex) => {
                  const isSelected = groupIndex === selectedGroupIndex && repoIndex === selectedRepoIndex;
                  return <RepoItem key={repo.path} repo={repo} isSelected={isSelected} />;
                })}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
