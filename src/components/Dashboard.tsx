/**
 * Main Dashboard component - router and state manager
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, useInput, Text, useApp, type Key } from 'ink';
import Spinner from 'ink-spinner';
import fuzzy from 'fuzzy';
import type { GitRepo, RepoGroup, View, SortMode, DebugInfo, AppConfig, AIConfig } from '../types/index.js';

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
import { AgentView } from './AgentView.js';
import { ConfirmationDialog } from './ConfirmationDialog.js';
import { ValidationWarning } from './ValidationWarning.js';
import { Notification, type NotificationType } from './Notification.js';
import { ErrorNotification } from './ErrorNotification.js';
import { AISetupWizard } from './AISetupWizard.js';
import { scanForRepos } from '../services/gitScanner.js';
import { getMultipleRepoStatus } from '../services/gitStatus.js';
import { configManager } from '../services/configManager.js';
import { getDatabaseService, closeDatabaseService } from '../services/database.js';
import { getAIAgentService } from '../services/aiAgent.js';
import { buildAgentContext } from '../services/agentContext.js';
import { getActionExecutorService, type ActionDefinition, type ActionType } from '../services/actionExecutor.js';
import { executeGitOperationBatch } from '../services/gitOperations.js';
import { validateConfig, type ValidationIssue } from '../services/configValidator.js';
import type { AgentResponse, AgentStatus, AgentRecommendation, RecommendedAction } from '../types/agent.js';

const isDev = process.env.DEV === 'true';

export const Dashboard: React.FC = () => {
  // Hooks
  const { exit } = useApp();

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
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('not_configured');
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    title: string;
    message: string;
    warnings: string[];
    onConfirm: () => void;
  } | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);

  /**
   * Show notification that auto-dismisses after 3 seconds
   */
  const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  /**
   * Handle AI wizard completion
   */
  const handleAIWizardComplete = useCallback((aiConfig: AIConfig) => {
    // Save AI config
    const currentConfig = configManager.get();
    configManager.set({ ...currentConfig, ai: aiConfig });

    // Update agent service
    const agentService = getAIAgentService(aiConfig);
    setAgentStatus(agentService.getStatus());

    // Close wizard and show success message
    setShowAIWizard(false);
    showNotification('AI configuration saved successfully!', 'success');
  }, [showNotification]);

  /**
   * Handle AI wizard skip
   */
  const handleAIWizardSkip = useCallback(() => {
    setShowAIWizard(false);
    showNotification('AI setup skipped. You can configure it later in Settings.', 'info');
  }, [showNotification]);

  /**
   * Filter dismissed recommendations from agent response
   */
  const filterDismissedRecommendations = useCallback((response: AgentResponse | null): AgentResponse | null => {
    if (!response) return null;

    const db = getDatabaseService();
    const dismissedIds = new Set(db.getDismissedRecommendations());

    const filteredRecommendations = response.recommendations.filter(
      (rec) => !dismissedIds.has(rec.id)
    );

    return {
      ...response,
      recommendations: filteredRecommendations,
    };
  }, []);

  /**
   * Run AI agent analysis
   */
  const runAgentAnalysis = useCallback(async (reposToAnalyze: GitRepo[]) => {
    const config = configManager.get();

    if (!config.ai?.enabled || !config.ai?.apiKey) {
      return;
    }

    setAgentLoading(true);
    setAgentError(null);

    try {
      const agent = getAIAgentService(config.ai);
      setAgentStatus(agent.getStatus());

      const context = buildAgentContext(reposToAnalyze, config);
      const response = await agent.analyze(context);

      // Filter out dismissed recommendations
      const filteredResponse = filterDismissedRecommendations(response);
      setAgentResponse(filteredResponse);
      setAgentStatus(agent.getStatus());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setAgentError(errorMessage);
      setAgentStatus('error');
    } finally {
      setAgentLoading(false);
    }
  }, [filterDismissedRecommendations]);

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

      // Calculate frecency scores after loading repos
      const db = getDatabaseService();
      db.calculateFrecency();

      // Run AI analysis if auto-analyze is enabled
      if (config.ai?.enabled && config.ai?.autoAnalyze && config.ai?.apiKey) {
        runAgentAnalysis(repoStatuses);
      } else if (config.ai) {
        // Update agent status based on config
        const agent = getAIAgentService(config.ai);
        setAgentStatus(agent.getStatus());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [runAgentAnalysis]);

  /**
   * Handle config changes from settings view
   */
  const handleConfigChange = useCallback((changes: Partial<AppConfig>) => {
    configManager.set(changes);
    // Note: Config changes take effect immediately but don't require repo reload
    // unless basePaths/excludePatterns change (not editable in UI yet)
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
      case 'frecency': {
        const db = getDatabaseService();
        return sorted.sort((a, b) => {
          const scoreA = db.getFrecencyScore(a.path);
          const scoreB = db.getFrecencyScore(b.path);
          return scoreB - scoreA; // Higher scores first
        });
      }
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

  // Initialize database and load repos on mount
  useEffect(() => {
    // Validate configuration on startup
    const config = configManager.get();
    const validation = validateConfig(config);

    if (validation.issues.length > 0) {
      setValidationIssues(validation.issues);
      setShowValidation(true);
    }

    // Check if AI setup wizard should be shown
    // Only show if validation can proceed (no blocking errors) and AI is not configured
    if (validation.canProceed) {
      const aiEnabled = config.ai?.enabled ?? false;
      const aiConfigured =
        config.ai?.provider &&
        config.ai?.model &&
        (config.ai.provider === 'local' || config.ai?.apiKey);

      // Show wizard if AI is not enabled or not properly configured
      if (!aiEnabled || !aiConfigured) {
        // Delay showing wizard until after validation is dismissed
        setTimeout(() => {
          setShowAIWizard(true);
        }, 500);
      }
    }

    // Initialize database service (singleton)
    const db = getDatabaseService();

    // Clean up old history on startup (90+ days old)
    db.cleanupOldHistory();

    loadRepos();

    // Cleanup on unmount
    return () => {
      closeDatabaseService();
    };
  }, [loadRepos]);

  // Compute filtered and grouped repos with useMemo for better performance
  const memoizedFilteredRepos = useMemo(() => {
    return filterRepos(repos, filterQuery);
  }, [repos, filterQuery, filterRepos]);

  const memoizedGroupedRepos = useMemo(() => {
    return groupRepos(memoizedFilteredRepos);
  }, [memoizedFilteredRepos, groupRepos]);

  // Update groups state when computed value changes
  useEffect(() => {
    setGroups(memoizedGroupedRepos);
  }, [memoizedGroupedRepos]);

  // Record search queries (separate side effect)
  useEffect(() => {
    if (filterQuery.trim() && filterActive) {
      const db = getDatabaseService();
      db.recordSearch(filterQuery, memoizedFilteredRepos.length);
    }
  }, [filterQuery, filterActive, memoizedFilteredRepos.length]);

  // Load search history when filter becomes active
  useEffect(() => {
    if (filterActive) {
      const db = getDatabaseService();
      const history = db.getSearchHistory(10);
      setSearchSuggestions(history);
    }
  }, [filterActive]);

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
  const toggleGroup = useCallback((groupIndex: number) => {
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
  }, []);

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
  const cycleSortMode = useCallback(() => {
    const modes: SortMode[] = ['status', 'name', 'recent', 'changes', 'frecency'];
    const currentIndex = modes.indexOf(sortMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSortMode(modes[nextIndex]);
  }, [sortMode]);

  /**
   * Keyboard input handler
   */
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

    if (input === '/') {
      setFilterActive(true);
      return;
    }

    if (input === 'h') {
      setView('home');
      return;
    }

    if (input === 'i') {
      // Trigger manual analysis if repos are loaded and AI is configured
      const config = configManager.get();
      if (config.ai?.enabled && config.ai?.apiKey && repos.length > 0) {
        runAgentAnalysis(repos);
      }
      setView('agent');
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
          // Track access for frecency
          const db = getDatabaseService();
          db.recordAccess(repo.path, 'view');
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
          // Track access for frecency
          const db = getDatabaseService();
          db.recordAccess(repo.path, 'view');
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
          // Track favorite action for frecency
          const db = getDatabaseService();
          db.recordAccess(repo.path, 'favorite');
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

  /**
   * Handle dismissing a recommendation
   */
  const handleDismissRecommendation = useCallback((recommendationId: string) => {
    try {
      const db = getDatabaseService();
      db.dismissRecommendation(recommendationId);

      // Update response to remove dismissed recommendation
      setAgentResponse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recommendations: prev.recommendations.filter((rec) => rec.id !== recommendationId),
        };
      });

      showNotification('Recommendation dismissed', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to dismiss';
      showNotification(errorMessage, 'error');
    }
  }, [showNotification]);

  /**
   * Execute an action (internal, bypasses confirmation)
   */
  const executeActionInternal = useCallback(async (action: RecommendedAction, recommendation: AgentRecommendation) => {
    // Handle simple UI actions first
    switch (action.command) {
      case 'view':
      case 'navigate':
        if (recommendation.affected_repos.length > 0) {
          const repo = repos.find((r: GitRepo) => r.path === recommendation.affected_repos[0]);
          if (repo) {
            setSelectedRepo(repo);
            setView('detail');
            showNotification(`Viewing ${repo.name}`, 'success');
          }
        } else {
          showNotification('No repos to navigate to', 'error');
        }
        return;

      case 'filter':
        if (action.args?.query) {
          setFilterQuery(action.args.query as string);
          setFilterActive(true);
          showNotification(`Applied filter: ${action.args.query}`, 'success');
        } else {
          showNotification('No filter query specified', 'error');
        }
        return;

      case 'sort':
        if (action.args?.mode) {
          const mode = action.args.mode as SortMode;
          setSortMode(mode);
          showNotification(`Sorted by: ${mode}`, 'success');
        } else {
          showNotification('No sort mode specified', 'error');
        }
        return;

      case 'refresh':
        loadRepos();
        showNotification('Refreshing repositories...', 'success');
        return;

      case 'analyze':
      case 'review':
        runAgentAnalysis(repos);
        showNotification('Running analysis...', 'success');
        return;

      case 'stash':
        // Stash changes in affected repos
        if (recommendation.affected_repos.length > 0) {
          const stashMessage = action.args?.message as string | undefined;
          executeGitOperationBatch(recommendation.affected_repos, 'stash', { message: stashMessage })
            .then((results) => {
              const successCount = Array.from(results.values()).filter((r) => r.success).length;
              const failCount = results.size - successCount;

              if (successCount > 0) {
                showNotification(
                  `Stashed changes in ${successCount} repo(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
                  failCount > 0 ? 'error' : 'success'
                );
              } else {
                showNotification('Failed to stash changes in all repos', 'error');
              }

              // Refresh repos to show updated status
              loadRepos();
            })
            .catch((err) => {
              showNotification(`Error stashing: ${err.message}`, 'error');
            });
        } else {
          showNotification('No repos to stash', 'error');
        }
        return;

      case 'commit':
      case 'commit_all':
        // Commit changes
        if (recommendation.affected_repos.length > 0) {
          const message = (action.args?.message as string) || 'Automated commit';
          const addAll = action.command === 'commit_all';

          executeGitOperationBatch(recommendation.affected_repos, 'commit', { message, addAll })
            .then((results) => {
              const successCount = Array.from(results.values()).filter((r) => r.success).length;
              const failCount = results.size - successCount;

              if (successCount > 0) {
                showNotification(
                  `Committed changes in ${successCount} repo(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
                  failCount > 0 ? 'error' : 'success'
                );
              } else {
                showNotification('Failed to commit changes in all repos', 'error');
              }

              // Refresh repos to show updated status
              loadRepos();
            })
            .catch((err) => {
              showNotification(`Error committing: ${err.message}`, 'error');
            });
        } else {
          showNotification('No repos to commit', 'error');
        }
        return;

      case 'push':
        // Push changes
        if (recommendation.affected_repos.length > 0) {
          const remote = (action.args?.remote as string) || 'origin';
          const branch = action.args?.branch as string | undefined;

          executeGitOperationBatch(recommendation.affected_repos, 'push', { remote, branch })
            .then((results) => {
              const successCount = Array.from(results.values()).filter((r) => r.success).length;
              const failCount = results.size - successCount;

              if (successCount > 0) {
                showNotification(
                  `Pushed changes in ${successCount} repo(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
                  failCount > 0 ? 'error' : 'success'
                );
              } else {
                showNotification('Failed to push changes in all repos', 'error');
              }

              // Refresh repos to show updated status
              loadRepos();
            })
            .catch((err) => {
              showNotification(`Error pushing: ${err.message}`, 'error');
            });
        } else {
          showNotification('No repos to push', 'error');
        }
        return;
    }

    // For complex actions, use ActionExecutor
    try {
      const config = configManager.get();
      const executor = getActionExecutorService(config);

      // Map command to ActionType
      const actionTypeMap: Record<string, ActionType> = {
        'batch_favorite': 'batch_favorite',
        'save_filter': 'save_filter_preset',
        'generate_report': 'generate_report',
        'optimize_config': 'optimize_config',
        'smart_commit': 'smart_commit',
        'batch_pull': 'batch_pull',
        'batch_stash': 'batch_stash',
        'branch_cleanup': 'branch_cleanup',
      };

      const actionType = actionTypeMap[action.command];
      if (!actionType) {
        showNotification(`Action "${action.label}" not yet implemented`, 'error');
        return;
      }

      // Create ActionDefinition
      const actionDef: ActionDefinition = {
        id: action.id,
        type: actionType,
        label: action.label,
        description: recommendation.description || '',
        params: {
          repo_paths: recommendation.affected_repos,
          ...action.args,
        },
      };

      // Execute action
      showNotification(`Executing: ${action.label}...`, 'info');
      const result = await executor.executeAction(actionDef, repos);

      if (result.success) {
        showNotification(result.message, 'success');
        // Refresh repos if they were modified
        if (result.affected_repos.length > 0) {
          loadRepos();
        }
      } else {
        showNotification(result.message, 'error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      showNotification(errorMessage, 'error');
    }
  }, [repos, showNotification, loadRepos, runAgentAnalysis]);

  /**
   * Handle executing an action from a recommendation
   */
  const handleExecuteAction = useCallback((recommendationId: string, actionId: string) => {
    try {
      const recommendation = agentResponse?.recommendations.find((r) => r.id === recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      const action = recommendation.actions.find((a) => a.id === actionId);
      if (!action) {
        throw new Error('Action not found');
      }

      // Validate action safety
      const config = configManager.get();
      const agent = getAIAgentService(config.ai!);
      const validation = agent.validate(recommendation, actionId);

      if (!validation.valid) {
        throw new Error(validation.warnings.join('; '));
      }

      // Safe actions execute immediately
      if (validation.safe) {
        executeActionInternal(action, recommendation);
        return;
      }

      // Unsafe actions require confirmation
      setConfirmationDialog({
        title: 'Confirm Dangerous Action',
        message: `Are you sure you want to execute "${action.label}"?`,
        warnings: validation.warnings,
        onConfirm: () => {
          setConfirmationDialog(null);
          executeActionInternal(action, recommendation);
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action';
      showNotification(errorMessage, 'error');
    }
  }, [agentResponse, executeActionInternal, showNotification]);

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
      <Header
        totalRepos={repos.length}
        needsAttention={needsAttention}
        lastRefresh={lastRefresh}
        view={view}
        currentRepoName={selectedRepo?.name}
        agentStatus={agentStatus}
        agentEnabled={configManager.get().ai?.enabled || false}
      />

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
          <ErrorNotification
            context={{
              error,
              category: 'general',
              retryable: true,
            }}
            onDismiss={() => setError(null)}
            onRetry={loadRepos}
          />
        )}

        {!isLoading && !error && view === 'home' && (
          <>
            {filterActive && (
              <FilterInput
                value={filterQuery}
                onChange={setFilterQuery}
                matchCount={filteredRepos.length}
                totalCount={repos.length}
                suggestions={searchSuggestions}
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

        {view === 'settings' && (
          <SettingsView config={configManager.get()} onConfigChange={handleConfigChange} />
        )}

        {view === 'detail' && selectedRepo && <DetailView repo={selectedRepo} />}

        {view === 'agent' && (
          <AgentView
            response={agentResponse}
            isLoading={agentLoading}
            error={agentError}
            onDismiss={handleDismissRecommendation}
            onExecute={handleExecuteAction}
          />
        )}
      </Box>

      {/* Notification display */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          dismissible={false}
        />
      )}

      {/* Confirmation dialog */}
      {confirmationDialog && (
        <ConfirmationDialog
          title={confirmationDialog.title}
          message={confirmationDialog.message}
          warnings={confirmationDialog.warnings}
          onConfirm={confirmationDialog.onConfirm}
          onCancel={() => setConfirmationDialog(null)}
        />
      )}

      {/* Validation warning */}
      {showValidation && validationIssues.length > 0 && (
        <ValidationWarning issues={validationIssues} />
      )}

      {/* AI Setup Wizard */}
      {showAIWizard && (
        <AISetupWizard onComplete={handleAIWizardComplete} onSkip={handleAIWizardSkip} />
      )}

      <Footer view={view} />

      {/* Debug panel (only in dev mode) */}
      {isDev && <DebugPanel info={debugInfo} />}
    </Box>
  );
};
