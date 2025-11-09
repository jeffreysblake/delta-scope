import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { RepoItem } from '../RepoItem.js';
import type { GitRepo } from '../../types/index.js';

describe('RepoItem', () => {
  const mockRepo: GitRepo = {
    path: '/home/user/projects/my-project',
    name: 'my-project',
    branch: 'feature-xyz',
    status: 'uncommitted',
    linesAdded: 47,
    linesDeleted: 12,
    uncommittedFiles: 3,
    unpushedCommits: 0,
    lastCommitDate: new Date('2024-01-15'),
    lastCommitMessage: 'WIP: Add feature',
    remotes: ['origin'],
    isFavorite: false,
  };

  describe('compact mode', () => {
    it('should render repo name in compact mode', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={true} />
      );

      expect(lastFrame()).toContain('my-project');
    });

    it('should render branch in compact mode', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={true} />
      );

      expect(lastFrame()).toContain('feature-xyz');
    });

    it('should show favorite star in compact mode', () => {
      const favoriteRepo = { ...mockRepo, isFavorite: true };
      const { lastFrame } = render(
        <RepoItem repo={favoriteRepo} isSelected={false} compact={true} />
      );

      expect(lastFrame()).toContain('★');
    });
  });

  describe('full mode', () => {
    it('should render repo name in full mode', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).toContain('my-project');
    });

    it('should render repo path', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).toContain('/home/user/projects/my-project');
    });

    it('should render branch name', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).toContain('feature-xyz');
    });

    it('should show line changes when present', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).toContain('+47');
      expect(lastFrame()).toContain('-12');
    });

    it('should show uncommitted files count', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).toContain('3 uncommitted files');
    });

    it('should show unpushed commits when present', () => {
      const repoWithUnpushed = { ...mockRepo, unpushedCommits: 5 };
      const { lastFrame } = render(
        <RepoItem repo={repoWithUnpushed} isSelected={false} compact={false} />
      );

      expect(lastFrame()).toContain('5 unpushed commits');
    });

    it('should not show uncommitted files when zero', () => {
      const cleanRepo = { ...mockRepo, uncommittedFiles: 0 };
      const { lastFrame } = render(
        <RepoItem repo={cleanRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).not.toContain('uncommitted files');
    });

    it('should not show unpushed commits when zero', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).not.toContain('unpushed commits');
    });

    it('should show favorite star', () => {
      const favoriteRepo = { ...mockRepo, isFavorite: true };
      const { lastFrame } = render(
        <RepoItem repo={favoriteRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).toContain('★');
    });

    it('should not show star for non-favorites', () => {
      const { lastFrame } = render(
        <RepoItem repo={mockRepo} isSelected={false} compact={false} />
      );

      expect(lastFrame()).not.toContain('★');
    });

    it('should not show line changes when zero', () => {
      const repoNoChanges = { ...mockRepo, linesAdded: 0, linesDeleted: 0 };
      const { lastFrame } = render(
        <RepoItem repo={repoNoChanges} isSelected={false} compact={false} />
      );

      expect(lastFrame()).not.toContain('Changes:');
    });
  });

  it('should handle selection state', () => {
    const { lastFrame: selectedFrame } = render(
      <RepoItem repo={mockRepo} isSelected={true} compact={false} />
    );
    const { lastFrame: unselectedFrame } = render(
      <RepoItem repo={mockRepo} isSelected={false} compact={false} />
    );

    // Both should contain the repo name
    expect(selectedFrame()).toContain('my-project');
    expect(unselectedFrame()).toContain('my-project');
  });
});
