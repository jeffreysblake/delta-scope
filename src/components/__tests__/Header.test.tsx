import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Header } from '../Header.js';

describe('Header', () => {
  it('should render app name and version', () => {
    const { lastFrame } = render(
      <Header totalRepos={10} needsAttention={3} lastRefresh={null} view="home" />
    );

    expect(lastFrame()).toContain('delta-scope');
    expect(lastFrame()).toContain('v0.2.0');
  });

  it('should display total repos count', () => {
    const { lastFrame } = render(
      <Header totalRepos={42} needsAttention={0} lastRefresh={null} view="home" />
    );

    expect(lastFrame()).toContain('42 repos');
  });

  it('should display repos needing attention', () => {
    const { lastFrame } = render(
      <Header totalRepos={10} needsAttention={5} lastRefresh={null} view="home" />
    );

    expect(lastFrame()).toContain('5 need attention');
  });

  it('should not display "need attention" when count is zero', () => {
    const { lastFrame } = render(
      <Header totalRepos={10} needsAttention={0} lastRefresh={null} view="home" />
    );

    expect(lastFrame()).not.toContain('need attention');
  });

  it('should display last refresh time', () => {
    const refreshDate = new Date('2024-01-15T10:30:00');
    const { lastFrame } = render(
      <Header totalRepos={10} needsAttention={0} lastRefresh={refreshDate} view="home" />
    );

    expect(lastFrame()).toContain('Last refresh:');
    expect(lastFrame()).toContain(refreshDate.toLocaleTimeString());
  });

  it('should display "Never" when no refresh has occurred', () => {
    const { lastFrame } = render(
      <Header totalRepos={0} needsAttention={0} lastRefresh={null} view="home" />
    );

    expect(lastFrame()).toContain('Last refresh: Never');
  });

  it('should show settings and help shortcuts', () => {
    const { lastFrame } = render(
      <Header totalRepos={0} needsAttention={0} lastRefresh={null} view="home" />
    );

    expect(lastFrame()).toContain('[c] Settings');
    expect(lastFrame()).toContain('[?] Help');
  });

  describe('Breadcrumbs', () => {
    it('should show just app name on home view', () => {
      const { lastFrame } = render(
        <Header totalRepos={10} needsAttention={0} lastRefresh={null} view="home" />
      );

      const output = lastFrame();
      expect(output).toContain('delta-scope v0.2.0');
      expect(output).not.toContain(' > ');
    });

    it('should show breadcrumb for detail view', () => {
      const { lastFrame } = render(
        <Header
          totalRepos={10}
          needsAttention={0}
          lastRefresh={null}
          view="detail"
          currentRepoName="delta-scope"
        />
      );

      const output = lastFrame();
      expect(output).toContain('delta-scope v0.2.0');
      expect(output).toContain(' > ');
      expect(output).toContain('delta-scope');
    });

    it('should show breadcrumb for settings view', () => {
      const { lastFrame } = render(
        <Header totalRepos={10} needsAttention={0} lastRefresh={null} view="settings" />
      );

      const output = lastFrame();
      expect(output).toContain('delta-scope v0.2.0');
      expect(output).toContain(' > ');
      expect(output).toContain('Settings');
    });

    it('should show breadcrumb for help view', () => {
      const { lastFrame } = render(
        <Header totalRepos={10} needsAttention={0} lastRefresh={null} view="help" />
      );

      const output = lastFrame();
      expect(output).toContain('delta-scope v0.2.0');
      expect(output).toContain(' > ');
      expect(output).toContain('Help');
    });
  });
});
