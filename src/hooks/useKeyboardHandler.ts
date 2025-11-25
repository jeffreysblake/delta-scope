/**
 * Custom hook for keyboard handling in Dashboard
 * Extracts the large useInput block into a reusable hook
 */

import { useCallback } from 'react';
import { useInput, type Key, useApp } from 'ink';
import type { GitRepo, View, RepoGroup } from '../types/index.js';
import { configManager } from '../services/configManager.js';
import { getDatabaseService } from '../services/database.js';

/**
 * Navigation item in flattened list
 */
type NavItem =
  | { type: 'group-header'; groupIndex: number }
  | { type: 'repo'; groupIndex: number; repoIndex: number };

interface UseKeyboardHandlerOptions {
  // State
  view: View;
  groups: RepoGroup[];
  navItems: NavItem[];
  selectedNavIndex: number;
  filterActive: boolean;
  showValidation: boolean;
  error: string | null;
  confirmationDialog: unknown | null;
  showSystemRepos: boolean;
  repos: GitRepo[];
  isDev: boolean;

  // Setters
  setView: (view: View) => void;
  setSelectedNavIndex: (index: number | ((prev: number) => number)) => void;
  setFilterActive: (active: boolean) => void;
  setFilterQuery: (query: string) => void;
  setShowValidation: (show: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedRepo: (repo: GitRepo | null) => void;
  setShowSystemRepos: (show: boolean) => void;
  setRepos: React.Dispatch<React.SetStateAction<GitRepo[]>>;
  setLastKeypress: (key: string) => void;

  // Actions
  loadRepos: (forceFullScan?: boolean) => void;
  toggleGroup: (groupIndex: number) => void;
  cycleSortMode: () => void;
  runAgentAnalysis: (repos: GitRepo[]) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useKeyboardHandler(options: UseKeyboardHandlerOptions): void {
  const { exit } = useApp();

  const {
    view,
    groups,
    navItems,
    selectedNavIndex,
    filterActive,
    showValidation,
    error,
    confirmationDialog,
    showSystemRepos,
    repos,
    isDev,
    setView,
    setSelectedNavIndex,
    setFilterActive,
    setFilterQuery,
    setShowValidation,
    setError,
    setSelectedRepo,
    setShowSystemRepos,
    setRepos,
    setLastKeypress,
    loadRepos,
    toggleGroup,
    cycleSortMode,
    runAgentAnalysis,
    showNotification,
  } = options;

  // Get current selection info
  const currentNavItem = navItems[selectedNavIndex] || navItems[0];

  /**
   * Navigate up through flattened list
   */
  const navigateUp = useCallback(() => {
    setSelectedNavIndex((prev) => Math.max(0, prev - 1));
  }, [setSelectedNavIndex]);

  /**
   * Navigate down through flattened list
   */
  const navigateDown = useCallback(() => {
    setSelectedNavIndex((prev) => Math.min(navItems.length - 1, prev + 1));
  }, [navItems.length, setSelectedNavIndex]);

  /**
   * Handle Enter key on current selection
   */
  const handleEnter = useCallback(() => {
    if (currentNavItem && currentNavItem.type === 'group-header') {
      toggleGroup(currentNavItem.groupIndex);
    } else if (currentNavItem && currentNavItem.type === 'repo') {
      const group = groups[currentNavItem.groupIndex];
      const repo = group?.repos[currentNavItem.repoIndex];
      if (repo) {
        setSelectedRepo(repo);
        setView('detail');
        const db = getDatabaseService();
        db.recordAccess(repo.path, 'view');
      }
    }
  }, [currentNavItem, groups, toggleGroup, setSelectedRepo, setView]);

  /**
   * Handle 'd' key for detail view
   */
  const handleDetailView = useCallback(() => {
    if (currentNavItem && currentNavItem.type === 'repo') {
      const group = groups[currentNavItem.groupIndex];
      const repo = group?.repos[currentNavItem.repoIndex];
      if (repo) {
        setSelectedRepo(repo);
        setView('detail');
        const db = getDatabaseService();
        db.recordAccess(repo.path, 'view');
      }
    }
  }, [currentNavItem, groups, setSelectedRepo, setView]);

  /**
   * Handle 'f' key for favorite toggle
   */
  const handleFavoriteToggle = useCallback(() => {
    if (currentNavItem && currentNavItem.type === 'repo') {
      const group = groups[currentNavItem.groupIndex];
      const repo = group?.repos[currentNavItem.repoIndex];
      if (repo) {
        configManager.toggleFavorite(repo.path);
        setRepos((prevRepos) =>
          prevRepos.map((r) =>
            r.path === repo.path ? { ...r, isFavorite: !r.isFavorite } : r
          )
        );
        const db = getDatabaseService();
        db.recordAccess(repo.path, 'favorite');
      }
    }
  }, [currentNavItem, groups, setRepos]);

  /**
   * Handle 'x' key for disable/enable repo
   */
  const handleDisableToggle = useCallback(() => {
    if (currentNavItem && currentNavItem.type === 'repo') {
      const group = groups[currentNavItem.groupIndex];
      const repo = group?.repos[currentNavItem.repoIndex];
      if (repo) {
        const db = getDatabaseService();
        if (repo.isDisabled) {
          db.enableRepo(repo.path);
          setRepos((prevRepos) =>
            prevRepos.map((r) =>
              r.path === repo.path ? { ...r, isDisabled: false } : r
            )
          );
          showNotification(`Enabled: ${repo.name}`, 'success');
        } else {
          db.disableRepo(repo.path, 'User disabled');
          setRepos((prevRepos) => prevRepos.filter((r) => r.path !== repo.path));
          showNotification(`Disabled: ${repo.name} (won't appear in future scans)`, 'info');
        }
      }
    }
  }, [currentNavItem, groups, setRepos, showNotification]);

  /**
   * Handle 'y' key for system repos toggle
   */
  const handleSystemReposToggle = useCallback(() => {
    const newValue = !showSystemRepos;
    setShowSystemRepos(newValue);
    configManager.set({ showSystemRepos: newValue });
    showNotification(
      newValue ? 'System repos shown' : 'System repos hidden',
      'info'
    );
  }, [showSystemRepos, setShowSystemRepos, showNotification]);

  /**
   * Handle 'i' key for agent view
   */
  const handleAgentView = useCallback(() => {
    const config = configManager.get();
    if (config.ai?.enabled && config.ai?.apiKey && repos.length > 0) {
      runAgentAnalysis(repos);
    }
    setView('agent');
  }, [repos, runAgentAnalysis, setView]);

  // Main keyboard handler
  useInput((input: string, key: Key) => {
    if (isDev) {
      setLastKeypress(input || JSON.stringify(key));
    }

    // Validation warning is showing - any key dismisses it
    if (showValidation) {
      setShowValidation(false);
      return;
    }

    // Error is showing - 'r' retries, any other key dismisses
    if (error) {
      if (input === 'r') {
        setError(null);
        loadRepos();
      } else {
        setError(null);
      }
      return;
    }

    // Confirmation dialog is open - handled by the dialog itself
    if (confirmationDialog) {
      return;
    }

    // Filter is active - Escape closes it, other keys handled by TextInput
    if (filterActive) {
      if (key.escape) {
        setFilterActive(false);
        setFilterQuery('');
      }
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

    // Agent view - Escape or i returns to home
    if (view === 'agent') {
      if (key.escape || input === 'i') {
        setView('home');
      }
      return;
    }

    // Global shortcuts
    if (input === 'q') {
      exit();
      return;
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

    // F5 - Force full filesystem scan (escape sequence for F5 is typically [15~)
    if (input.includes('[15~') || input === 'R') {
      loadRepos(true);
      return;
    }

    // x - Disable/enable repo
    if (input === 'x') {
      handleDisableToggle();
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

    if (input === 'i') {
      handleAgentView();
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
      handleEnter();
    }

    if (input === 'd') {
      handleDetailView();
    }

    if (input === 's') {
      cycleSortMode();
    }

    if (input === 'f') {
      handleFavoriteToggle();
    }

    if (input === 'y') {
      handleSystemReposToggle();
    }
  });
}
