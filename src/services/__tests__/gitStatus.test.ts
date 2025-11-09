import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepoStatus, getMultipleRepoStatus } from '../gitStatus.js';

// Mock simple-git
vi.mock('simple-git', () => {
  return {
    default: vi.fn((repoPath: string) => {
      // Return different mocks based on path for testing
      if (repoPath.includes('invalid')) {
        return {
          checkIsRepo: vi.fn().mockResolvedValue(false),
        };
      }

      if (repoPath.includes('clean')) {
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          revparse: vi.fn().mockResolvedValue('main'),
          status: vi.fn().mockResolvedValue({
            modified: [],
            created: [],
            deleted: [],
            renamed: [],
            not_added: [],
            files: [],
            ahead: 0,
            behind: 0,
          }),
          diffSummary: vi.fn().mockResolvedValue({
            insertions: 0,
            deletions: 0,
          }),
          log: vi.fn().mockResolvedValue({
            latest: {
              date: '2024-01-15',
              message: 'Initial commit',
            },
          }),
          getRemotes: vi.fn().mockResolvedValue([
            { name: 'origin' },
          ]),
        };
      }

      if (repoPath.includes('uncommitted')) {
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          revparse: vi.fn().mockResolvedValue('feature-branch'),
          status: vi.fn().mockResolvedValue({
            modified: ['file1.ts', 'file2.ts'],
            created: ['file3.ts'],
            deleted: [],
            renamed: [],
            not_added: ['file4.ts'],
            files: [
              { path: 'file1.ts', index: 'M', working_dir: 'M' },
              { path: 'file2.ts', index: 'M', working_dir: 'M' },
              { path: 'file3.ts', index: 'A', working_dir: 'A' },
              { path: 'file4.ts', index: '?', working_dir: '?' },
            ],
            ahead: 0,
            behind: 0,
          }),
          diffSummary: vi.fn().mockResolvedValue({
            insertions: 47,
            deletions: 12,
          }),
          log: vi.fn().mockResolvedValue({
            latest: {
              date: '2024-01-15',
              message: 'Work in progress',
            },
          }),
          getRemotes: vi.fn().mockResolvedValue([
            { name: 'origin' },
          ]),
        };
      }

      if (repoPath.includes('unpushed')) {
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          revparse: vi.fn().mockResolvedValue('main'),
          status: vi.fn().mockResolvedValue({
            modified: [],
            created: [],
            deleted: [],
            renamed: [],
            not_added: [],
            files: [],
            ahead: 3,
            behind: 0,
          }),
          diffSummary: vi.fn().mockResolvedValue({
            insertions: 0,
            deletions: 0,
          }),
          log: vi.fn().mockResolvedValue({
            latest: {
              date: '2024-01-16',
              message: 'Add feature',
            },
          }),
          getRemotes: vi.fn().mockResolvedValue([
            { name: 'origin' },
          ]),
        };
      }

      if (repoPath.includes('both')) {
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          revparse: vi.fn().mockResolvedValue('dev'),
          status: vi.fn().mockResolvedValue({
            modified: ['README.md'],
            created: [],
            deleted: [],
            renamed: [],
            not_added: [],
            files: [
              { path: 'README.md', index: 'M', working_dir: 'M' },
            ],
            ahead: 2,
            behind: 0,
          }),
          diffSummary: vi.fn().mockResolvedValue({
            insertions: 10,
            deletions: 5,
          }),
          log: vi.fn().mockResolvedValue({
            latest: {
              date: '2024-01-17',
              message: 'Update docs',
            },
          }),
          getRemotes: vi.fn().mockResolvedValue([
            { name: 'origin' },
            { name: 'upstream' },
          ]),
        };
      }

      // Default mock
      return {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        revparse: vi.fn().mockResolvedValue('main'),
        status: vi.fn().mockResolvedValue({
          modified: [],
          created: [],
          deleted: [],
          renamed: [],
          not_added: [],
          files: [],
          ahead: 0,
          behind: 0,
        }),
        diffSummary: vi.fn().mockResolvedValue({
          insertions: 0,
          deletions: 0,
        }),
        log: vi.fn().mockResolvedValue({
          latest: null,
        }),
        getRemotes: vi.fn().mockResolvedValue([]),
      };
    }),
  };
});

// Mock configManager
vi.mock('../configManager.js', () => ({
  configManager: {
    isFavorite: vi.fn(() => false),
  },
}));

describe('gitStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRepoStatus', () => {
    it('should return null for invalid repo', async () => {
      const result = await getRepoStatus('/path/to/invalid-repo');
      expect(result).toBeNull();
    });

    it('should return clean status for clean repo', async () => {
      const result = await getRepoStatus('/path/to/clean-repo');

      expect(result).toBeDefined();
      expect(result?.status).toBe('clean');
      expect(result?.branch).toBe('main');
      expect(result?.uncommittedFiles).toBe(0);
      expect(result?.unpushedCommits).toBe(0);
      expect(result?.linesAdded).toBe(0);
      expect(result?.linesDeleted).toBe(0);
    });

    it('should return uncommitted status for repo with changes', async () => {
      const result = await getRepoStatus('/path/to/uncommitted-repo');

      expect(result).toBeDefined();
      expect(result?.status).toBe('uncommitted');
      expect(result?.branch).toBe('feature-branch');
      expect(result?.uncommittedFiles).toBe(4); // 2 modified + 1 created + 1 not_added
      expect(result?.unpushedCommits).toBe(0);
      expect(result?.linesAdded).toBe(47);
      expect(result?.linesDeleted).toBe(12);
    });

    it('should return unpushed status for repo with unpushed commits', async () => {
      const result = await getRepoStatus('/path/to/unpushed-repo');

      expect(result).toBeDefined();
      expect(result?.status).toBe('unpushed');
      expect(result?.branch).toBe('main');
      expect(result?.uncommittedFiles).toBe(0);
      expect(result?.unpushedCommits).toBe(3);
    });

    it('should return both status for repo with uncommitted and unpushed', async () => {
      const result = await getRepoStatus('/path/to/both-repo');

      expect(result).toBeDefined();
      expect(result?.status).toBe('both');
      expect(result?.branch).toBe('dev');
      expect(result?.uncommittedFiles).toBe(1);
      expect(result?.unpushedCommits).toBe(2);
      expect(result?.linesAdded).toBe(10);
      expect(result?.linesDeleted).toBe(5);
    });

    it('should extract repo name from path', async () => {
      const result = await getRepoStatus('/home/user/projects/my-awesome-repo');

      expect(result).toBeDefined();
      expect(result?.name).toBe('my-awesome-repo');
    });

    it('should include last commit info', async () => {
      const result = await getRepoStatus('/path/to/clean-repo');

      expect(result).toBeDefined();
      expect(result?.lastCommitMessage).toBe('Initial commit');
      expect(result?.lastCommitDate).toBeInstanceOf(Date);
    });

    it('should include remote info', async () => {
      const result = await getRepoStatus('/path/to/both-repo');

      expect(result).toBeDefined();
      expect(result?.remotes).toEqual(['origin', 'upstream']);
    });

    it('should handle repos with no commits', async () => {
      const result = await getRepoStatus('/path/to/default-repo');

      expect(result).toBeDefined();
      expect(result?.lastCommitDate).toBeNull();
      expect(result?.lastCommitMessage).toBeNull();
    });
  });

  describe('getMultipleRepoStatus', () => {
    it('should get status for multiple repos in parallel', async () => {
      const paths = [
        '/path/to/clean-repo',
        '/path/to/uncommitted-repo',
        '/path/to/unpushed-repo',
      ];

      const results = await getMultipleRepoStatus(paths);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('clean');
      expect(results[1].status).toBe('uncommitted');
      expect(results[2].status).toBe('unpushed');
    });

    it('should filter out invalid repos', async () => {
      const paths = [
        '/path/to/clean-repo',
        '/path/to/invalid-repo',
        '/path/to/uncommitted-repo',
      ];

      const results = await getMultipleRepoStatus(paths);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('clean');
      expect(results[1].status).toBe('uncommitted');
    });

    it('should handle empty array', async () => {
      const results = await getMultipleRepoStatus([]);

      expect(results).toHaveLength(0);
    });
  });
});
