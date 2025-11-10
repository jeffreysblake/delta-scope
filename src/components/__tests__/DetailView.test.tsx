import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { DetailView } from '../DetailView.js';
import type { GitRepo } from '../../types/index.js';

const mockRepo: GitRepo = {
  path: '/home/user/projects/test-repo',
  name: 'test-repo',
  branch: 'main',
  status: 'both',
  linesAdded: 50,
  linesDeleted: 20,
  uncommittedFiles: 3,
  unpushedCommits: 2,
  lastCommitDate: new Date('2025-01-15T10:30:00'),
  lastCommitMessage: 'Add new feature',
  remotes: ['origin', 'upstream'],
  isFavorite: true,
};

describe('DetailView', () => {
  describe('Rendering', () => {
    it('should render repository name and status', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('test-repo');
      expect(lastFrame()).toContain('⚡'); // Status badge symbol for 'both'
    });

    it('should render favorite star for favorite repos', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('★');
    });

    it('should not render favorite star for non-favorite repos', () => {
      const nonFavoriteRepo = { ...mockRepo, isFavorite: false };
      const { lastFrame } = render(<DetailView repo={nonFavoriteRepo} />);

      const output = lastFrame();
      // Star might appear in other contexts, so check it's not after the name
      const nameIndex = output.indexOf('test-repo');
      const starIndex = output.indexOf('★');
      expect(starIndex === -1 || starIndex < nameIndex).toBe(true);
    });

    it('should render repository path and branch', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('/home/user/projects/test-repo');
      expect(lastFrame()).toContain('main');
    });
  });

  describe('Status Details', () => {
    it('should render uncommitted files count', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('3 uncommitted files');
    });

    it('should render unpushed commits count', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('2 unpushed commits');
    });

    it('should render lines added', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('+50 lines added');
    });

    it('should render lines deleted', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('-20 lines deleted');
    });

    it('should show clean status for clean repos', () => {
      const cleanRepo: GitRepo = {
        ...mockRepo,
        status: 'clean',
        uncommittedFiles: 0,
        unpushedCommits: 0,
        linesAdded: 0,
        linesDeleted: 0,
      };
      const { lastFrame } = render(<DetailView repo={cleanRepo} />);

      expect(lastFrame()).toContain('Working directory clean');
    });
  });

  describe('Remotes', () => {
    it('should render all remotes', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('origin');
      expect(lastFrame()).toContain('upstream');
    });

    it('should not show remotes section when there are none', () => {
      const noRemotesRepo = { ...mockRepo, remotes: [] };
      const { lastFrame } = render(<DetailView repo={noRemotesRepo} />);

      expect(lastFrame()).not.toContain('Remotes:');
    });
  });

  describe('Last Commit', () => {
    it('should render last commit message', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('Add new feature');
    });

    it('should render last commit date', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      // Date format varies by locale, just check it contains date components
      const output = lastFrame();
      expect(output).toContain('2025');
    });

    it('should not show commit info when none available', () => {
      const noCommitRepo = { ...mockRepo, lastCommitMessage: null, lastCommitDate: null };
      const { lastFrame } = render(<DetailView repo={noCommitRepo} />);

      expect(lastFrame()).not.toContain('Last Commit:');
    });
  });

  describe('Footer', () => {
    it('should show navigation hint', () => {
      const { lastFrame } = render(<DetailView repo={mockRepo} />);

      expect(lastFrame()).toContain('Press Escape or h to return');
    });
  });
});
