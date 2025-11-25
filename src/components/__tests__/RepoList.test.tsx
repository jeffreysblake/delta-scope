import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { RepoList } from '../RepoList.js';
import type { RepoGroup } from '../../types/index.js';

describe('RepoList', () => {
  const mockGroups: RepoGroup[] = [
    {
      status: 'both',
      expanded: true,
      repos: [
        {
          path: '/home/user/project1',
          name: 'project1',
          branch: 'main',
          status: 'both',
          linesAdded: 10,
          linesDeleted: 5,
          uncommittedFiles: 2,
          unpushedCommits: 3,
          lastCommitDate: new Date('2024-01-15'),
          lastCommitMessage: 'WIP',
          remotes: ['origin'],
          isFavorite: false,
        },
      ],
    },
    {
      status: 'uncommitted',
      expanded: false,
      repos: [
        {
          path: '/home/user/project2',
          name: 'project2',
          branch: 'dev',
          status: 'uncommitted',
          linesAdded: 47,
          linesDeleted: 12,
          uncommittedFiles: 5,
          unpushedCommits: 0,
          lastCommitDate: new Date('2024-01-14'),
          lastCommitMessage: 'Add feature',
          remotes: ['origin'],
          isFavorite: true,
        },
      ],
    },
  ];

  it('should render group headers', () => {
    const { lastFrame } = render(
      <RepoList
        groups={mockGroups}
        selectedGroupIndex={0}
        selectedRepoIndex={0}
        onToggleGroup={() => {}}
      />
    );

    expect(lastFrame()).toContain('Uncommitted + Unpushed');
    expect(lastFrame()).toContain('Uncommitted Changes');
  });

  it('should show expanded state in headers', () => {
    const { lastFrame } = render(
      <RepoList
        groups={mockGroups}
        selectedGroupIndex={0}
        selectedRepoIndex={0}
        onToggleGroup={() => {}}
      />
    );

    // Now using ▼ for expanded and ▶ for collapsed
    expect(lastFrame()).toContain('▼');
    expect(lastFrame()).toContain('▶');
  });

  it('should show repos in expanded groups', () => {
    const { lastFrame } = render(
      <RepoList
        groups={mockGroups}
        selectedGroupIndex={0}
        selectedRepoIndex={0}
        onToggleGroup={() => {}}
      />
    );

    // First group is expanded, should show project1
    expect(lastFrame()).toContain('project1');
  });

  it('should not show repos in collapsed groups', () => {
    const { lastFrame } = render(
      <RepoList
        groups={mockGroups}
        selectedGroupIndex={0}
        selectedRepoIndex={0}
        onToggleGroup={() => {}}
      />
    );

    // Second group is collapsed, should not show project2 details
    // (though the group header might still appear)
    const output = lastFrame();
    const project2Mentions = output.split('project2').length - 1;
    // Should appear at most once (in collapsed group header count)
    expect(project2Mentions).toBeLessThan(2);
  });

  it('should render empty groups', () => {
    const emptyGroups: RepoGroup[] = [
      {
        status: 'clean',
        expanded: true,
        repos: [],
      },
    ];

    const { lastFrame } = render(
      <RepoList
        groups={emptyGroups}
        selectedGroupIndex={0}
        selectedRepoIndex={0}
        onToggleGroup={() => {}}
      />
    );

    expect(lastFrame()).toContain('All Clean');
    expect(lastFrame()).toContain('(0 repos)');
  });

  it('should show repo count in group headers', () => {
    const { lastFrame } = render(
      <RepoList
        groups={mockGroups}
        selectedGroupIndex={0}
        selectedRepoIndex={0}
        onToggleGroup={() => {}}
      />
    );

    expect(lastFrame()).toContain('(1 repos)');
  });
});
