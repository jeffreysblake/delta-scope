/**
 * Configuration management using 'conf' library
 * Inspired by DOH's config pattern
 */

import Conf from 'conf';
import type { AppConfig } from '../types/index.js';

const DEFAULT_CONFIG: AppConfig = {
  // System-wide scanning: scan all user directories and root for mounted partitions
  basePaths: ['/home', '/'],
  excludePatterns: [
    // Virtual/pseudo filesystems (must exclude)
    '/proc',
    '/sys',
    '/dev',
    '/run',
    '/tmp',
    // NAS mounts (specific to user's machine)
    '/media/nas',
    '/media/nas1',
    '/media/nas2',
    '/mnt/nas',
    '/mnt/network',
    // System directories
    '/boot',
    '/lost+found',
    // Snap packages (OS-level)
    '/snap',
    '/var/snap',
    // System package directories
    '/usr/share',
    '/var/lib',
    '/var/cache',
    // Build artifacts and package managers
    'node_modules',
    'dist',
    'build',
    '.venv',
    'venv',
    'target',
    '.cargo',
    '.npm',
    '.cache',
    '.bundle', // Ruby bundler cache
    // User-specific exclusions
    'Decisiv', // Old job folder
  ],
  theme: 'dark',
  refreshInterval: 60000, // 60 seconds in milliseconds
  favorites: [],
  maxDepth: 8, // Deeper to handle nested mounts
  showHidden: false,
  showSystemRepos: false, // Hide system repos by default
  ai: {
    enabled: false,
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    timeout: 30000,
    maxRetries: 3,
    autoAnalyze: false,
    maxRecommendations: 5,
  },
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
        showSystemRepos: {
          type: 'boolean',
        },
        ai: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
            },
            provider: {
              type: 'string',
              enum: ['anthropic', 'openai', 'local'],
            },
            model: {
              type: 'string',
            },
            apiKey: {
              type: 'string',
            },
            endpoint: {
              type: 'string',
            },
            timeout: {
              type: 'number',
              minimum: 1000,
            },
            maxRetries: {
              type: 'number',
              minimum: 0,
              maximum: 10,
            },
            autoAnalyze: {
              type: 'boolean',
            },
            maxRecommendations: {
              type: 'number',
              minimum: 1,
              maximum: 20,
            },
          },
          required: ['enabled', 'provider', 'model', 'timeout', 'maxRetries', 'autoAnalyze', 'maxRecommendations'],
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

/**
 * Get the config manager instance
 */
export function getConfigManager(): ConfigManager {
  return configManager;
}

/**
 * Update config (convenience function)
 */
export function updateConfig(config: Partial<AppConfig>): void {
  configManager.set(config);
}
