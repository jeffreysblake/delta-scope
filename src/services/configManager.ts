/**
 * Configuration management using 'conf' library
 * Inspired by DOH's config pattern
 */

import Conf from 'conf';
import type { AppConfig } from '../types/index.js';
import { homedir } from 'os';
import { join } from 'path';

const DEFAULT_CONFIG: AppConfig = {
  basePaths: [join(homedir(), 'projects'), join(homedir(), 'git')],
  excludePatterns: [
    'node_modules',
    'dist',
    'build',
    '.venv',
    'venv',
    'target',
    '.cargo',
    '.npm',
    '.cache',
  ],
  theme: 'dark',
  refreshInterval: 60,
  favorites: [],
  maxDepth: 5,
  showHidden: false,
};

class ConfigManager {
  private config: Conf<AppConfig>;

  constructor() {
    this.config = new Conf<AppConfig>({
      projectName: 'delta-scope',
      defaults: DEFAULT_CONFIG,
      schema: {
        basePaths: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        excludePatterns: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        theme: {
          type: 'string',
          enum: ['dark', 'light'],
        },
        refreshInterval: {
          type: 'number',
          minimum: 10,
        },
        favorites: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        maxDepth: {
          type: 'number',
          minimum: 1,
          maximum: 10,
        },
        showHidden: {
          type: 'boolean',
        },
      },
    });
  }

  get(): AppConfig {
    return this.config.store;
  }

  set(config: Partial<AppConfig>): void {
    this.config.set(config);
  }

  addBasePath(path: string): void {
    const basePaths = this.config.get('basePaths');
    if (!basePaths.includes(path)) {
      this.config.set('basePaths', [...basePaths, path]);
    }
  }

  removeBasePath(path: string): void {
    const basePaths = this.config.get('basePaths');
    this.config.set(
      'basePaths',
      basePaths.filter((p: string) => p !== path)
    );
  }

  addFavorite(repoPath: string): void {
    const favorites = this.config.get('favorites');
    if (!favorites.includes(repoPath)) {
      this.config.set('favorites', [...favorites, repoPath]);
    }
  }

  removeFavorite(repoPath: string): void {
    const favorites = this.config.get('favorites');
    this.config.set(
      'favorites',
      favorites.filter((p: string) => p !== repoPath)
    );
  }

  toggleFavorite(repoPath: string): void {
    const favorites = this.config.get('favorites');
    if (favorites.includes(repoPath)) {
      this.removeFavorite(repoPath);
    } else {
      this.addFavorite(repoPath);
    }
  }

  isFavorite(repoPath: string): boolean {
    return this.config.get('favorites').includes(repoPath);
  }

  reset(): void {
    this.config.clear();
  }

  getConfigPath(): string {
    return this.config.path;
  }
}

export const configManager = new ConfigManager();
