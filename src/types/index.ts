/**
 * Core types for delta-scope
 */

export type RepoStatus = 'clean' | 'uncommitted' | 'unpushed' | 'both';

export interface GitRepo {
  path: string;
  name: string;
  branch: string;
  status: RepoStatus;
  linesAdded: number;
  linesDeleted: number;
  uncommittedFiles: number;
  unpushedCommits: number;
  lastCommitDate: Date | null;
  lastCommitMessage: string | null;
  remotes: string[];
  isFavorite: boolean;
}

export interface RepoGroup {
  status: RepoStatus;
  repos: GitRepo[];
  expanded: boolean;
}

export interface AppConfig {
  basePaths: string[];
  excludePatterns: string[];
  theme: 'dark' | 'light';
  refreshInterval: number; // seconds
  favorites: string[]; // repo paths
  maxDepth: number; // how deep to search for .git directories
  showHidden: boolean; // show hidden directories
}

export type View = 'home' | 'detail' | 'settings' | 'help';

export type SortMode = 'name' | 'status' | 'recent' | 'changes' | 'frecency';

export interface AppState {
  view: View;
  repos: GitRepo[];
  groups: RepoGroup[];
  selectedIndex: number;
  selectedGroupIndex: number;
  filterQuery: string;
  sortMode: SortMode;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

export interface DebugInfo {
  view: View;
  selectedIndex: number;
  repoCount: number;
  filterActive: boolean;
  lastKeypress: string;
  renderTime: number;
}
