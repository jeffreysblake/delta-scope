import { describe, it, expect } from 'vitest';
import { getRepoName } from '../gitScanner.js';

describe('GitScanner', () => {
  describe('getRepoName', () => {
    it('should extract repo name from path', () => {
      const path = '/home/user/projects/my-repo';
      const name = getRepoName(path);
      expect(name).toBe('my-repo');
    });

    it('should handle paths with trailing slash', () => {
      const path = '/home/user/projects/my-repo/';
      const name = getRepoName(path);
      // Trailing slash results in empty string as last element
      expect(name).toBe(path); // Falls back to original path
    });

    it('should handle root paths', () => {
      const path = '/';
      const name = getRepoName(path);
      // Root path results in empty string
      expect(name).toBe(path); // Falls back to original path
    });

    it('should handle simple paths', () => {
      const path = 'my-repo';
      const name = getRepoName(path);
      expect(name).toBe('my-repo');
    });
  });

  // Note: scanForRepos() tests would require mocking the filesystem
  // We'll add those in a separate integration test suite
});
