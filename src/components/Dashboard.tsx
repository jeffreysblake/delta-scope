/**
 * Main Dashboard component - router and state manager
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, useInput, Text, type Key } from 'ink';
import Spinner from 'ink-spinner';
import fuzzy from 'fuzzy';
import type { GitRepo, RepoGroup, View, SortMode, DebugInfo } from '../types/index.js';

/**
 * Navigation item in flattened list
 */
type NavItem =
  | { type: 'group-header'; groupIndex: number }
  | { type: 'repo'; groupIndex: number; repoIndex: number };
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { RepoList } from './RepoList.js';
import { HelpView } from './HelpView.js';
import { DebugPanel } from './DebugPanel.js';
import { FilterInput } from './FilterInput.js';
import { DetailView } from './DetailView.js';
import { SettingsView } from './SettingsView.js';
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
  const [selectedNavIndex, setSelectedNavIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [filterActive, setFilterActive] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitRepo | null>(null);
  const [lastKeypress, setLastKeypress] = useState<string>('');
  const [renderTime, setRenderTime] = useState<number>(0);

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
   * Filter repos using fuzzy matching
   */
  const filterRepos = useCallback((reposToFilter: GitRepo[], query: string): GitRepo[] => {
    if (!query.trim()) {
      return reposToFilter;
    }

    // Fuzzy match against repo name and path
    const results = fuzzy.filter(query, reposToFilter, {
      extract: (repo) => `${repo.name} ${repo.path}`,
    });

    return results.map((result) => result.original);
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

  // Load repos on mount
  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // Group repos whenever they change or filter changes
  useEffect(() => {
    const filtered = filterRepos(repos, filterQuery);
    const grouped = groupRepos(filtered);
    setGroups(grouped);
  }, [repos, sortMode, filterQuery, groupRepos, filterRepos]);

  // Track render time for debug
  useEffect(() => {
    if (!isDev) return;
    const start = Date.now();
    return () => {
      setRenderTime(Date.now() - start);
    };
  });

  /**
   * Build flattened navigation list from groups
   * This creates a linear list of all navigable items:
   * - Group headers (always visible)
   * - Repos within expanded groups
   */
  const navItems = useMemo((): NavItem[] => {
    const items: NavItem[] = [];
    groups.forEach((group, groupIndex) => {
      // Always add group header
      items.push({ type: 'group-header', groupIndex });
      // Add repos if group is expanded
      if (group.expanded) {
        group.repos.forEach((_, repoIndex) => {
          items.push({ type: 'repo', groupIndex, repoIndex });
        });
      }
    });
    return items;
  }, [groups]);

  /**
   * Get current selection info from nav index
   */
  const currentNavItem = navItems[selectedNavIndex] || navItems[0];
  const selectedGroupIndex = currentNavItem?.groupIndex ?? 0;
  const selectedRepoIndex = currentNavItem?.type === 'repo' ? currentNavItem.repoIndex : -1;

  /**
   * Toggle group expansion
   */
  const toggleGroup = (groupIndex: number) => {
    setGroups((prev) => {
      const newGroups = prev.map((group, idx) =>
        idx === groupIndex ? { ...group, expanded: !group.expanded } : group
      );

      // When toggling, try to keep selection on the same group
      // Find the new nav index for this group header
      const newItems: NavItem[] = [];
      newGroups.forEach((group, gIdx) => {
        newItems.push({ type: 'group-header', groupIndex: gIdx });
        if (group.expanded) {
          group.repos.forEach((_, rIdx) => {
            newItems.push({ type: 'repo', groupIndex: gIdx, repoIndex: rIdx });
          });
        }
      });

      // Find where the selected group header is in the new list
      const newIndex = newItems.findIndex(
        (item) => item.type === 'group-header' && item.groupIndex === groupIndex
      );
      if (newIndex !== -1) {
        setSelectedNavIndex(newIndex);
      }

      return newGroups;
    });
  };

  /**
   * Navigate up through flattened list
   */
  const navigateUp = useCallback(() => {
    setSelectedNavIndex((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Navigate down through flattened list
   */
  const navigateDown = useCallback(() => {
    setSelectedNavIndex((prev) => Math.min(navItems.length - 1, prev + 1));
  }, [navItems.length]);

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

    // Filter is active - Escape closes it, other keys handled by TextInput
    if (filterActive) {
      if (key.escape) {
        setFilterActive(false);
        setFilterQuery('');
      }
      // TextInput handles all other input
      return;
    }

    // Detail view - Escape or h returns to home
    if (view === 'detail') {
      if (key.escape || input === 'h') {
        setView('home');
        setSelectedRepo(null);
      }
      return;
    }

    // Settings view - Escape or c returns to home
    if (view === 'settings') {
      if (key.escape || input === 'c') {
        setView('home');
      }
      return;
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

    if (input === 'c') {
      setView('settings');
      return;
    }

    if (input === 'r') {
      loadRepos();
      return;
    }

    if (input === '/') {
      setFilterActive(true);
      return;
    }

    if (input === 'h') {
      setView('home');
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
      // Toggle group if we're on a group header
      if (currentNavItem && currentNavItem.type === 'group-header') {
        toggleGroup(currentNavItem.groupIndex);
      }
      // Show detail view if we're on a repo
      else if (currentNavItem && currentNavItem.type === 'repo') {
        const group = groups[currentNavItem.groupIndex];
        const repo = group?.repos[currentNavItem.repoIndex];
        if (repo) {
          setSelectedRepo(repo);
          setView('detail');
        }
      }
    }

    if (input === 'd') {
      // Show detail view for currently selected repo
      if (currentNavItem && currentNavItem.type === 'repo') {
        const group = groups[currentNavItem.groupIndex];
        const repo = group?.repos[currentNavItem.repoIndex];
        if (repo) {
          setSelectedRepo(repo);
          setView('detail');
        }
      }
    }

    if (input === 's') {
      cycleSortMode();
    }

    if (input === 'f') {
      // Toggle favorite for currently selected repo
      if (currentNavItem && currentNavItem.type === 'repo') {
        const group = groups[currentNavItem.groupIndex];
        const repo = group?.repos[currentNavItem.repoIndex];
        if (repo) {
          configManager.toggleFavorite(repo.path);
          // Update the repo in state to reflect the change
          setRepos((prevRepos) =>
            prevRepos.map((r) =>
              r.path === repo.path ? { ...r, isFavorite: !r.isFavorite } : r
            )
          );
        }
      }
    }
  });

  // Calculate stats
  const needsAttention = repos.filter(
    (r) => r.status === 'uncommitted' || r.status === 'both'
  ).length;

  // Calculate filtered repo count
  const filteredRepos = filterRepos(repos, filterQuery);

  // Debug info
  const debugInfo: DebugInfo = {
    view,
    selectedIndex: selectedNavIndex,
    repoCount: repos.length,
    filterActive,
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
          <>
            {filterActive && (
              <FilterInput
                value={filterQuery}
                onChange={setFilterQuery}
                matchCount={filteredRepos.length}
                totalCount={repos.length}
              />
            )}
            <RepoList
              groups={groups}
              selectedGroupIndex={selectedGroupIndex}
              selectedRepoIndex={selectedRepoIndex}
              onToggleGroup={toggleGroup}
            />
          </>
        )}

        {view === 'help' && <HelpView />}

        {view === 'settings' && <SettingsView config={configManager.get()} />}

        {view === 'detail' && selectedRepo && <DetailView repo={selectedRepo} />}
      </Box>

      <Footer view={view} />

      {/* Debug panel (only in dev mode) */}
      {isDev && <DebugPanel info={debugInfo} />}
    </Box>
  );
};
