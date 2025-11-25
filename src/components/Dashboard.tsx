/**
 * Main Dashboard component - router and state manager
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import fuzzy from 'fuzzy';
import type { GitRepo, RepoGroup, View, SortMode, DebugInfo, AppConfig, AIConfig } from '../types/index.js';

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
import { configManager } from '../services/configManager.js';
import { getDatabaseService, closeDatabaseService } from '../services/database.js';
import { getAIAgentService } from '../services/aiAgent.js';
import { validateConfig, type ValidationIssue } from '../services/configValidator.js';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler.js';
import { validateCachedPaths, backgroundScanForRepos, initializeCacheFromScan } from '../services/fastScanner.js';
import { getMultipleRepoStatus } from '../services/gitStatus.js';
import { buildAgentContext } from '../services/agentContext.js';

const isDev = process.env.DEV === 'true';

/**
 * Navigation item in flattened list
 */
type NavItem =
  | { type: 'group-header'; groupIndex: number }
  | { type: 'repo'; groupIndex: number; repoIndex: number };

export const Dashboard: React.FC = () => {
  // Core state
  const [view, setView] = useState<View>('home');
  const [repos, setRepos] = useState<GitRepo[]>([]);
  const [groups, setGroups] = useState<RepoGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundScanning, setIsBackgroundScanning] = useState(false);
  const [newReposFoundCount, setNewReposFoundCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Navigation state
  const [selectedNavIndex, setSelectedNavIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [filterActive, setFilterActive] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitRepo | null>(null);

  // UI state
  const [lastKeypress, setLastKeypress] = useState<string>('');
  const [renderTime, setRenderTime] = useState<number>(0);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
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
  const [showSystemRepos, setShowSystemRepos] = useState(() => configManager.get().showSystemRepos ?? false);

  // Agent state
  const [agentResponse, setAgentResponse] = useState<import('../types/agent.js').AgentResponse | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<import('../types/agent.js').AgentStatus>('not_configured');

  // Notification helper
  const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  /**
   * Run AI agent analysis
   */
  const runAgentAnalysis = useCallback(async (reposToAnalyze: GitRepo[]) => {
    const config = configManager.get();
    if (!config.ai?.enabled || !config.ai?.apiKey) return;

    setAgentLoading(true);
    setAgentError(null);

    try {
      const agent = getAIAgentService(config.ai);
      setAgentStatus(agent.getStatus());
      const context = buildAgentContext(reposToAnalyze, config);
      const response = await agent.analyze(context);

      // Filter dismissed recommendations
      const db = getDatabaseService();
      const dismissedIds = new Set(db.getDismissedRecommendations());
      const filtered = {
        ...response,
        recommendations: response.recommendations.filter(
          (rec: { id: string }) => !dismissedIds.has(rec.id)
        ),
      };

      setAgentResponse(filtered);
      setAgentStatus(agent.getStatus());
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : 'Unknown error');
      setAgentStatus('error');
    } finally {
      setAgentLoading(false);
    }
  }, []);

  /**
   * Enrich repo paths with git status
   */
  const enrichRepoPaths = useCallback(async (
    repoPaths: string[],
    onBatchComplete?: (repos: GitRepo[]) => void
  ): Promise<GitRepo[]> => {
    const batchSize = 50;
    const enrichedRepos: GitRepo[] = [];
    let lastUIUpdate = Date.now();

    for (let i = 0; i < repoPaths.length; i += batchSize) {
      const batch = repoPaths.slice(i, i + batchSize);
      const batchStatuses = await getMultipleRepoStatus(batch);
      enrichedRepos.push(...batchStatuses);

      if (Date.now() - lastUIUpdate >= 500 || i + batchSize >= repoPaths.length) {
        onBatchComplete?.([...enrichedRepos]);
        lastUIUpdate = Date.now();
      }
    }
    return enrichedRepos;
  }, []);

  /**
   * Load repositories with smart caching
   */
  const loadRepos = useCallback(async (forceFullScan = false) => {
    setIsLoading(true);
    setError(null);
    setNewReposFoundCount(0);

    try {
      const config = configManager.get();
      const db = getDatabaseService();

      if (forceFullScan) {
        showNotification('Starting full filesystem scan...', 'info');
        const repoPaths = await initializeCacheFromScan(config, db);
        const enrichedRepos = await enrichRepoPaths(repoPaths, (r) => {
          setRepos(r);
          setLastRefresh(new Date());
        });
        setRepos(enrichedRepos);
        setLastRefresh(new Date());
        db.calculateFrecency();
        showNotification(`Found ${enrichedRepos.length} repositories`, 'success');

        if (config.ai?.enabled && config.ai?.autoAnalyze && config.ai?.apiKey) {
          runAgentAnalysis(enrichedRepos);
        } else if (config.ai) {
          setAgentStatus(getAIAgentService(config.ai).getStatus());
        }
        setIsLoading(false);
        return;
      }

      const cachedPaths = db.getCachedRepoPaths();

      if (cachedPaths.length > 0) {
        const validPaths = await validateCachedPaths(cachedPaths);
        cachedPaths.filter((p: string) => !validPaths.includes(p)).forEach((p: string) => db.markRepoInvalid(p));

        const enrichedRepos = await enrichRepoPaths(validPaths, (r) => {
          setRepos(r);
          setLastRefresh(new Date());
        });
        setRepos(enrichedRepos);
        setLastRefresh(new Date());
        setIsLoading(false);

        setIsBackgroundScanning(true);
        backgroundScanForRepos(config, db,
          async (newPath: string) => {
            const [newRepo] = await getMultipleRepoStatus([newPath]);
            if (newRepo) {
              setRepos(prev => [...prev, newRepo]);
              setNewReposFoundCount(prev => prev + 1);
            }
          },
          (removedPath: string) => setRepos(prev => prev.filter(r => r.path !== removedPath))
        ).then(({ newRepos, removedRepos }: { newRepos: string[]; removedRepos: string[] }) => {
          setIsBackgroundScanning(false);
          if (newRepos.length > 0 || removedRepos.length > 0) {
            showNotification(`Scan complete: ${newRepos.length} new, ${removedRepos.length} removed`, 'info');
          }
        }).catch(() => setIsBackgroundScanning(false));

        db.calculateFrecency();
        if (config.ai?.enabled && config.ai?.autoAnalyze && config.ai?.apiKey) {
          runAgentAnalysis(enrichedRepos);
        } else if (config.ai) {
          setAgentStatus(getAIAgentService(config.ai).getStatus());
        }
      } else {
        const repoPaths = await initializeCacheFromScan(config, db);
        const enrichedRepos = await enrichRepoPaths(repoPaths, (r) => {
          setRepos(r);
          setLastRefresh(new Date());
        });
        setRepos(enrichedRepos);
        setLastRefresh(new Date());
        setIsLoading(false);
        db.calculateFrecency();

        if (config.ai?.enabled && config.ai?.autoAnalyze && config.ai?.apiKey) {
          runAgentAnalysis(enrichedRepos);
        } else if (config.ai) {
          setAgentStatus(getAIAgentService(config.ai).getStatus());
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, [enrichRepoPaths, runAgentAnalysis, showNotification]);

  const handleConfigChange = useCallback((changes: Partial<AppConfig>) => {
    configManager.set(changes);
  }, []);

  const handleAIWizardComplete = useCallback((aiConfig: AIConfig) => {
    configManager.set({ ...configManager.get(), ai: aiConfig });
    setAgentStatus(getAIAgentService(aiConfig).getStatus());
    setShowAIWizard(false);
    showNotification('AI configuration saved!', 'success');
  }, [showNotification]);

  const handleAIWizardSkip = useCallback(() => {
    setShowAIWizard(false);
    showNotification('AI setup skipped.', 'info');
  }, [showNotification]);

  // Sorting and filtering
  const sortRepos = useCallback((reposToSort: GitRepo[], mode: SortMode): GitRepo[] => {
    const sorted = [...reposToSort];
    switch (mode) {
      case 'name': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'recent': return sorted.sort((a, b) => {
        if (!a.lastCommitDate) return 1;
        if (!b.lastCommitDate) return -1;
        return b.lastCommitDate.getTime() - a.lastCommitDate.getTime();
      });
      case 'changes': return sorted.sort((a, b) =>
        (b.linesAdded + b.linesDeleted) - (a.linesAdded + a.linesDeleted)
      );
      case 'frecency': {
        const db = getDatabaseService();
        return sorted.sort((a, b) => db.getFrecencyScore(b.path) - db.getFrecencyScore(a.path));
      }
      default: return sorted;
    }
  }, []);

  const filterRepos = useCallback((reposToFilter: GitRepo[], query: string): GitRepo[] => {
    if (!query.trim()) return reposToFilter;
    const results = fuzzy.filter(query, reposToFilter, {
      extract: (repo) => `${repo.name} ${repo.path}`,
    });
    return results.map((result) => result.original);
  }, []);

  const groupRepos = useCallback((allRepos: GitRepo[]): RepoGroup[] => {
    const grouped: Record<string, GitRepo[]> = { clean: [], uncommitted: [], unpushed: [], both: [] };
    allRepos.forEach((repo) => grouped[repo.status].push(repo));
    Object.keys(grouped).forEach((status) => {
      grouped[status] = sortRepos(grouped[status], sortMode);
    });
    return [
      { status: 'both', repos: grouped.both, expanded: grouped.both.length > 0 },
      { status: 'uncommitted', repos: grouped.uncommitted, expanded: grouped.uncommitted.length > 0 },
      { status: 'unpushed', repos: grouped.unpushed, expanded: false },
      { status: 'clean', repos: grouped.clean, expanded: false },
    ];
  }, [sortMode, sortRepos]);

  // Effects
  useEffect(() => {
    const config = configManager.get();
    const validation = validateConfig(config);
    if (validation.issues.length > 0) {
      setValidationIssues(validation.issues);
      setShowValidation(true);
    }
    if (validation.canProceed) {
      const aiConfigured = config.ai?.provider && config.ai?.model &&
        (config.ai.provider === 'local' || config.ai?.apiKey);
      if (!config.ai?.enabled || !aiConfigured) {
        setTimeout(() => setShowAIWizard(true), 500);
      }
    }
    getDatabaseService().cleanupOldHistory();
    loadRepos();
    return () => closeDatabaseService();
  }, [loadRepos]);

  const memoizedFilteredRepos = useMemo(() => {
    const reposToDisplay = showSystemRepos ? repos : repos.filter(r => !r.isSystemRepo);
    return filterRepos(reposToDisplay, filterQuery);
  }, [repos, filterQuery, filterRepos, showSystemRepos]);

  const memoizedGroupedRepos = useMemo(() => groupRepos(memoizedFilteredRepos), [memoizedFilteredRepos, groupRepos]);

  useEffect(() => setGroups(memoizedGroupedRepos), [memoizedGroupedRepos]);

  useEffect(() => {
    if (filterQuery.trim() && filterActive) {
      getDatabaseService().recordSearch(filterQuery, memoizedFilteredRepos.length);
    }
  }, [filterQuery, filterActive, memoizedFilteredRepos.length]);

  useEffect(() => {
    if (filterActive) {
      setSearchSuggestions(getDatabaseService().getSearchHistory(10));
    }
  }, [filterActive]);

  useEffect(() => {
    if (!isDev) return;
    const start = Date.now();
    return () => setRenderTime(Date.now() - start);
  });

  // Navigation
  const navItems = useMemo((): NavItem[] => {
    const items: NavItem[] = [];
    groups.forEach((group, groupIndex) => {
      items.push({ type: 'group-header', groupIndex });
      if (group.expanded) {
        group.repos.forEach((_, repoIndex) => {
          items.push({ type: 'repo', groupIndex, repoIndex });
        });
      }
    });
    return items;
  }, [groups]);

  const currentNavItem = navItems[selectedNavIndex] || navItems[0];
  const selectedGroupIndex = currentNavItem?.groupIndex ?? 0;
  const selectedRepoIndex = currentNavItem?.type === 'repo' ? currentNavItem.repoIndex : -1;

  const toggleGroup = useCallback((groupIndex: number) => {
    setGroups((prev) => {
      const newGroups = prev.map((group, idx) =>
        idx === groupIndex ? { ...group, expanded: !group.expanded } : group
      );
      const newItems: NavItem[] = [];
      newGroups.forEach((group, gIdx) => {
        newItems.push({ type: 'group-header', groupIndex: gIdx });
        if (group.expanded) {
          group.repos.forEach((_, rIdx) => {
            newItems.push({ type: 'repo', groupIndex: gIdx, repoIndex: rIdx });
          });
        }
      });
      const newIndex = newItems.findIndex(
        (item) => item.type === 'group-header' && item.groupIndex === groupIndex
      );
      if (newIndex !== -1) setSelectedNavIndex(newIndex);
      return newGroups;
    });
  }, []);

  const cycleSortMode = useCallback(() => {
    const modes: SortMode[] = ['status', 'name', 'recent', 'changes', 'frecency'];
    setSortMode(modes[(modes.indexOf(sortMode) + 1) % modes.length]);
  }, [sortMode]);

  // Keyboard handler
  useKeyboardHandler({
    view, groups, navItems, selectedNavIndex, filterActive, showValidation,
    error, confirmationDialog, showSystemRepos, repos, isDev,
    setView, setSelectedNavIndex, setFilterActive, setFilterQuery, setShowValidation,
    setError, setSelectedRepo, setShowSystemRepos, setRepos, setLastKeypress,
    loadRepos, toggleGroup, cycleSortMode, runAgentAnalysis, showNotification,
  });

  // Dismiss handler
  const handleDismissRecommendation = useCallback((id: string) => {
    getDatabaseService().dismissRecommendation(id);
    setAgentResponse((prev) => prev ? {
      ...prev,
      recommendations: prev.recommendations.filter((rec) => rec.id !== id),
    } : prev);
    showNotification('Recommendation dismissed', 'success');
  }, [showNotification]);

  // Action execution (simplified - full implementation in useAgentActions hook)
  const handleExecuteAction = useCallback((_recId: string, _actionId: string) => {
    showNotification('Action execution not yet implemented', 'info');
  }, [showNotification]);

  // Stats
  const needsAttention = repos.filter(r => r.status === 'uncommitted' || r.status === 'both').length;
  const filteredRepos = filterRepos(repos, filterQuery);

  const debugInfo: DebugInfo = {
    view, selectedIndex: selectedNavIndex, repoCount: repos.length,
    filterActive, lastKeypress, renderTime,
  };

  // Render
  const headerProps = {
    totalRepos: repos.length, needsAttention, lastRefresh, view,
    currentRepoName: selectedRepo?.name, agentStatus,
    agentEnabled: configManager.get().ai?.enabled || false,
  };

  if (showValidation && validationIssues.length > 0) {
    return (
      <Box flexDirection="column" width="100%" height="100%" padding={0}>
        <Header {...headerProps} />
        <ValidationWarning issues={validationIssues} />
        <Footer view={view} />
      </Box>
    );
  }

  if (showAIWizard) {
    return (
      <Box flexDirection="column" width="100%" height="100%" padding={0}>
        <Header {...headerProps} />
        <AISetupWizard onComplete={handleAIWizardComplete} onSkip={handleAIWizardSkip} />
        <Footer view={view} />
      </Box>
    );
  }

  if (confirmationDialog) {
    return (
      <Box flexDirection="column" width="100%" height="100%" padding={0}>
        <Header {...headerProps} />
        <ConfirmationDialog
          title={confirmationDialog.title}
          message={confirmationDialog.message}
          warnings={confirmationDialog.warnings}
          onConfirm={confirmationDialog.onConfirm}
          onCancel={() => setConfirmationDialog(null)}
        />
        <Footer view={view} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%" height="100%" padding={0}>
      <Header {...headerProps} />
      <Box flexDirection="column" paddingY={1} flexGrow={1}>
        {isLoading && (
          <Box><Text color="cyan"><Spinner type="dots" /> Loading repositories...</Text></Box>
        )}
        {!isLoading && isBackgroundScanning && (
          <Box><Text color="yellow">
            <Spinner type="dots" /> Scanning for new repos{newReposFoundCount > 0 ? ` (${newReposFoundCount} found)` : ''}...
          </Text></Box>
        )}
        {error && (
          <ErrorNotification
            context={{ error, category: 'general', retryable: true }}
            onDismiss={() => setError(null)}
            onRetry={loadRepos}
          />
        )}
        {!isLoading && !error && view === 'home' && (
          <>
            {filterActive && (
              <FilterInput
                value={filterQuery} onChange={setFilterQuery}
                matchCount={filteredRepos.length} totalCount={repos.length}
                suggestions={searchSuggestions}
              />
            )}
            <RepoList
              groups={groups} selectedGroupIndex={selectedGroupIndex}
              selectedRepoIndex={selectedRepoIndex} onToggleGroup={toggleGroup}
            />
          </>
        )}
        {view === 'help' && <HelpView />}
        {view === 'settings' && <SettingsView config={configManager.get()} onConfigChange={handleConfigChange} />}
        {view === 'detail' && selectedRepo && <DetailView repo={selectedRepo} />}
        {view === 'agent' && (
          <AgentView
            response={agentResponse} isLoading={agentLoading} error={agentError}
            onDismiss={handleDismissRecommendation} onExecute={handleExecuteAction}
          />
        )}
      </Box>
      {notification && <Notification message={notification.message} type={notification.type} dismissible={false} />}
      <Footer view={view} />
      {isDev && <DebugPanel info={debugInfo} />}
    </Box>
  );
};
