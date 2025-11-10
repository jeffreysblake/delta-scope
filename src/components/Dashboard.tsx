/**
 * Main Dashboard component - router and state manager
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, useInput, Text, type Key } from 'ink';
import Spinner from 'ink-spinner';
import type { GitRepo, RepoGroup, View, SortMode, DebugInfo } from '../types/index.js';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { RepoList } from './RepoList.js';
import { HelpView } from './HelpView.js';
import { DebugPanel } from './DebugPanel.js';
import { scanForRepos } from '../services/gitScanner.js';
import { getMultipleRepoStatus } from '../services/gitStatus.js';
import { configManager } from '../services/configManager.js';

const isDev = process.env.DEV === 'true';

export const Dashboard: React.FC = () => {
  // State
  const [view, setView] = useState<View>('home');
  const [repos, setRepos] = useState<GitRepo[]>([]);
  const [groups, setGroups] = useState<RepoGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedRepoIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [lastKeypress, setLastKeypress] = useState<string>('');
  const [renderTime, setRenderTime] = useState<number>(0);

  // Load repos on mount
  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // Group repos whenever they change
  useEffect(() => {
    const grouped = groupRepos(repos);
    setGroups(grouped);
  }, [repos, sortMode, groupRepos]);

  // Track render time for debug
  useEffect(() => {
    if (!isDev) return;
    const start = Date.now();
    return () => {
      setRenderTime(Date.now() - start);
    };
  });

  /**
   * Load all repositories
   */
  const loadRepos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config = configManager.get();
      const repoPaths = await scanForRepos(config);
      const repoStatuses = await getMultipleRepoStatus(repoPaths);

      setRepos(repoStatuses);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sort repos based on mode
   */
  const sortRepos = useCallback((reposToSort: GitRepo[], mode: SortMode): GitRepo[] => {
    const sorted = [...reposToSort];

    switch (mode) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'status':
        return sorted; // Already grouped by status
      case 'recent':
        return sorted.sort((a, b) => {
          if (!a.lastCommitDate) return 1;
          if (!b.lastCommitDate) return -1;
          return b.lastCommitDate.getTime() - a.lastCommitDate.getTime();
        });
      case 'changes':
        return sorted.sort(
          (a, b) =>
            b.linesAdded + b.linesDeleted - (a.linesAdded + a.linesDeleted)
        );
      default:
        return sorted;
    }
  }, []);

  /**
   * Group repos by status
   */
  const groupRepos = useCallback((allRepos: GitRepo[]): RepoGroup[] => {
    const grouped: Record<string, GitRepo[]> = {
      clean: [],
      uncommitted: [],
      unpushed: [],
      both: [],
    };

    allRepos.forEach((repo) => {
      grouped[repo.status].push(repo);
    });

    // Sort repos within each group based on sortMode
    Object.keys(grouped).forEach((status) => {
      grouped[status] = sortRepos(grouped[status], sortMode);
    });

    // Return groups (expand 'both' and 'uncommitted' by default)
    return [
      { status: 'both', repos: grouped.both, expanded: grouped.both.length > 0 },
      { status: 'uncommitted', repos: grouped.uncommitted, expanded: grouped.uncommitted.length > 0 },
      { status: 'unpushed', repos: grouped.unpushed, expanded: false },
      { status: 'clean', repos: grouped.clean, expanded: false },
    ];
  }, [sortMode, sortRepos]);

  /**
   * Toggle group expansion
   */
  const toggleGroup = (groupIndex: number) => {
    setGroups((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex ? { ...group, expanded: !group.expanded } : group
      )
    );
  };

  /**
   * Navigate up
   */
  const navigateUp = () => {
    // TODO: Implement proper navigation between repos in expanded groups
    setSelectedGroupIndex((prev) => Math.max(0, prev - 1));
  };

  /**
   * Navigate down
   */
  const navigateDown = () => {
    // TODO: Implement proper navigation between repos in expanded groups
    setSelectedGroupIndex((prev) => Math.min(groups.length - 1, prev + 1));
  };

  /**
   * Cycle sort mode
   */
  const cycleSortMode = () => {
    const modes: SortMode[] = ['status', 'name', 'recent', 'changes'];
    const currentIndex = modes.indexOf(sortMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSortMode(modes[nextIndex]);
  };

  /**
   * Keyboard input handler
   */
  useInput((input: string, key: Key) => {
    if (isDev) {
      setLastKeypress(input || JSON.stringify(key));
    }

    // Help view - any key returns to home
    if (view === 'help') {
      setView('home');
      return;
    }

    // Global shortcuts
    if (input === 'q') {
      process.exit(0);
    }

    if (input === '?') {
      setView('help');
      return;
    }

    if (input === 'r') {
      loadRepos();
      return;
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      navigateUp();
    }

    if (key.downArrow || input === 'j') {
      navigateDown();
    }

    if (key.return) {
      toggleGroup(selectedGroupIndex);
    }

    if (input === 's') {
      cycleSortMode();
    }

    // TODO: Implement other shortcuts (filter, favorite, detail, etc.)
  });

  // Calculate stats
  const needsAttention = repos.filter(
    (r) => r.status === 'uncommitted' || r.status === 'both'
  ).length;

  // Debug info
  const debugInfo: DebugInfo = {
    view,
    selectedIndex: selectedGroupIndex,
    repoCount: repos.length,
    filterActive: false,
    lastKeypress,
    renderTime,
  };

  // Render
  return (
    <Box flexDirection="column">
      <Header totalRepos={repos.length} needsAttention={needsAttention} lastRefresh={lastRefresh} />

      {/* Main content area */}
      <Box flexDirection="column" paddingY={1} minHeight={10}>
        {isLoading && (
          <Box>
            <Text color="cyan">
              <Spinner type="dots" /> Loading repositories...
            </Text>
          </Box>
        )}

        {error && (
          <Box borderStyle="bold" borderColor="red" padding={1}>
            <Text color="red">Error: {error}</Text>
          </Box>
        )}

        {!isLoading && !error && view === 'home' && (
          <RepoList
            groups={groups}
            selectedGroupIndex={selectedGroupIndex}
            selectedRepoIndex={selectedRepoIndex}
            onToggleGroup={toggleGroup}
          />
        )}

        {view === 'help' && <HelpView />}
      </Box>

      <Footer view={view} />

      {/* Debug panel (only in dev mode) */}
      {isDev && <DebugPanel info={debugInfo} />}
    </Box>
  );
};
