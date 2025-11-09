# Delta-Scope: Workflows & Pain Point Solutions

**Purpose:** Define common developer workflows and how delta-scope addresses specific pain points with configurable features.

---

## Common Developer Pain Points

### 1. End of Day (EOD) Push Forgotten
**Problem:** Developer finishes work for the day with uncommitted or unpushed changes, forgets to push before leaving.

**Impact:**
- Work lost if laptop fails
- Can't switch computers easily
- Team can't see progress
- CI/CD doesn't run
- Code review delayed

**Delta-Scope Solution:**

```yaml
# ~/.config/delta-scope/workflows/eod-reminder.yml

workflow:
  name: "End of Day Push Reminder"
  type: "scheduled_check"

  trigger:
    schedule: "17:00"              # 5 PM daily
    timezone: "local"
    days: ["mon", "tue", "wed", "thu", "fri"]

  conditions:
    - has_uncommitted: true
    OR
    - has_unpushed: true

  actions:
    - notify:
        title: "⏰ End of Day Reminder"
        message: "You have {count} repos with uncommitted or unpushed changes"
        priority: "high"
        sound: true
        actions:
          - label: "Show Repos"
            command: "delta-scope --filter status:uncommitted,unpushed"
          - label: "Snooze 30 min"
            snooze: 1800
          - label: "Dismiss"

    - if_dismissed:
        repeat_after: 900        # Nag again in 15 minutes
        max_repeats: 3

    - if_no_action_after: 3600   # 1 hour
        escalate:
          notify:
            title: "⚠️ URGENT: Unpushed Changes"
            message: "You still have uncommitted work. Don't lose your progress!"
            priority: "critical"

  exceptions:
    - repo_tags: ["wip", "experimental"]  # Don't nag for WIP repos
    - repo_name_pattern: "^scratch-"      # Skip scratch repos
```

---

### 2. Context Switching Between Projects
**Problem:** Developer works on multiple projects, loses track of which repo they were working on, what they were doing.

**Impact:**
- Time wasted remembering context
- Miss important work
- Forget to finish features
- Stale branches pile up

**Delta-Scope Solution:**

```yaml
# ~/.config/delta-scope/workflows/context-tracking.yml

workflow:
  name: "Active Context Tracking"
  type: "automatic"

  # Track which repos user is actively working on
  tracking:
    activity_signals:
      - file_changes           # Files modified in last N hours
      - git_commits            # Commits in last N days
      - git_checkouts          # Branch switches
      - editor_opened          # If integrated with editor

    context_window: "24h"      # What counts as "active"

  context_detection:
    # Automatically detect "active work" repos
    active_threshold:
      uncommitted_files: 1
      OR
      commits_last_24h: 1
      OR
      branch_created_last_week: true

  actions:
    - on_startup:
        show:
          title: "Active Work"
          repos:
            - status: ["uncommitted", "both"]
            - recent_commits: "24h"
          sort: "last_modified"

    - on_context_switch:   # When user switches to delta-scope
        suggest:
          message: "You were working on {repo_name}. Continue?"
          actions:
            - "Open in editor"
            - "Show status"
            - "View recent commits"

  reminders:
    - if_stale:      # Repo was active but no changes in N days
        condition:
          last_activity: ">3 days"
          has_uncommitted: true
        action:
          notify:
            message: "You haven't touched {repo_name} in 3 days. Still working on it?"
            actions:
              - "Show changes"
              - "Commit changes"
              - "Archive (mark as stale)"
```

---

### 3. Forgotten Feature Branches
**Problem:** Developer creates feature branch, works on it, then forgets about it. Branch never gets merged or deleted.

**Impact:**
- Stale branches clutter repo
- Work gets lost
- Can't remember what feature was for
- Branches conflict with current work

**Delta-Scope Solution:**

```yaml
# ~/.config/delta-scope/workflows/branch-cleanup.yml

workflow:
  name: "Stale Branch Detection"
  type: "periodic"

  trigger:
    schedule: "weekly"           # Check every Monday
    day: "mon"
    time: "09:00"

  detection:
    stale_branch:
      criteria:
        - not_default_branch: true
        - last_commit_age: ">30 days"
        - not_merged: true
        - no_remote_tracking: false  # Has remote

  actions:
    - notify:
        title: "🗑️  Stale Branch Cleanup"
        message: "Found {count} stale feature branches"

    - generate_report:
        output: "~/.config/delta-scope/reports/stale-branches.md"
        format: |
          # Stale Branches Report
          Generated: {date}

          {for branch in stale_branches}
          ## {branch.repo} / {branch.name}
          - Last commit: {branch.last_commit_date}
          - Author: {branch.last_author}
          - Message: {branch.last_commit_message}
          - Recommendation: {ai_suggestion}
          {endfor}

    - interactive:
        prompt: "Review stale branches?"
        if_yes:
          show_tui:
            view: "branch_cleanup"
            actions_per_branch:
              - "Merge to main"
              - "Delete (local only)"
              - "Delete (local + remote)"
              - "Keep (mark as important)"
              - "Snooze (check again in 30 days)"
```

---

### 4. Multi-Machine Development
**Problem:** Developer works from office desktop and home laptop. Repos get out of sync, hard to remember what's where.

**Impact:**
- Work on wrong version
- Duplicate work
- Merge conflicts
- Lost changes

**Delta-Scope Solution:**

```yaml
# ~/.config/delta-scope/workflows/multi-machine-sync.yml

workflow:
  name: "Multi-Machine Sync"
  type: "automatic"

  machines:
    - name: "work-desktop"
      hostname: "dev-box-42"
      base_paths: ["/home/user/projects", "/opt/work"]

    - name: "home-laptop"
      hostname: "personal-mbp"
      base_paths: ["/Users/user/code", "/Users/user/projects"]

  sync_strategy:
    # When delta-scope starts, check for repo differences
    on_startup:
      - check_last_sync: true
      - if_sync_older_than: "24h"
        action:
          notify:
            message: "Haven't synced with {other_machine} in 24 hours"
            actions:
              - "Show differences"
              - "Sync now"

    # Auto-export catalog periodically
    auto_export:
      enabled: true
      schedule: "daily"
      time: "18:00"
      location: "~/Dropbox/delta-scope/catalogs/"
      filename: "{hostname}-{date}.json"

    # Auto-import from shared location
    auto_import:
      enabled: true
      watch_location: "~/Dropbox/delta-scope/catalogs/"
      on_new_catalog:
        action:
          notify:
            message: "New catalog from {source_machine}"
            actions:
              - "Compare with local"
              - "Import & clone missing"
              - "Ignore"

  conflict_resolution:
    # Same repo, different paths on different machines
    if_path_differs:
      action: "map_paths"
      rules:
        - source: "/home/user/projects/{name}"
          target: "/Users/user/code/{name}"

    # Same repo exists on both machines
    if_duplicate:
      action: "choose_primary"
      prefer: "most_recent_commit"

  reminders:
    - if_diverged:
        condition:
          same_repo: true
          different_commit: true
          machines: ["work-desktop", "home-laptop"]
        action:
          notify:
            message: "{repo_name} has diverged between machines!"
            priority: "high"
            actions:
              - "Show diff"
              - "Pull from {other_machine}"
              - "Mark as independent (different purposes)"
```

---

### 5. Cleanup of Old Projects
**Problem:** Developer accumulates dozens of old repos. Don't want to delete them, but clutter makes it hard to find active work.

**Impact:**
- Slow scans
- Visual clutter
- Hard to find active repos
- Waste disk space

**Delta-Scope Solution:**

```yaml
# ~/.config/delta-scope/workflows/repo-archival.yml

workflow:
  name: "Automatic Archival"
  type: "periodic"

  trigger:
    schedule: "monthly"
    day: 1
    time: "10:00"

  archival_criteria:
    inactive_repo:
      criteria:
        - no_commits_in: ">90 days"
        - not_opened_in: ">60 days"     # Track file access if possible
        - is_clean: true                # No uncommitted changes
        - not_tagged: ["active", "important"]

  actions:
    - classify:
        # AI helps decide what to do
        ai_suggestion:
          categories:
            - "archive_safe": "Old, finished, no activity"
            - "maybe_archive": "Old but might be useful reference"
            - "keep_active": "Old but likely to need again"
            - "delete_safe": "Experimental, low value"

    - interactive:
        show_tui:
          view: "archival_review"
          group_by: "ai_classification"
          actions_per_repo:
            - "Archive (compress, move to ~/Archives/)"
            - "Keep active (add 'important' tag)"
            - "Delete (confirm first)"
            - "Snooze (check again in 90 days)"

  archival_actions:
    - compress:
        format: "tar.gz"
        location: "~/Archives/repos/"
        preserve:
          - "git_log": true     # Extract git log to text file
          - "readme": true      # Keep README.md
          - "metadata": true    # Delta-scope metadata

    - update_db:
        mark_as: "archived"
        archive_location: "{path}"
        archived_date: "{date}"

    - cleanup:
        remove_from_disk: true
        keep_in_db: true        # Track as "ghost" repo

  restore:
    # Make it easy to restore archived repos
    command: "delta-scope restore {repo_name}"
    action:
      - find_archive: "~/Archives/repos/{repo_name}.tar.gz"
      - extract_to: "{original_path}"
      - update_db: "mark_as_present"
```

---

### 6. Team Coordination (Shared Repos)
**Problem:** Team works on same repos, hard to know who's working on what, avoid conflicts.

**Impact:**
- Duplicate work
- Merge conflicts
- Blocking each other
- Poor coordination

**Delta-Scope Solution:**

```yaml
# ~/.config/delta-scope/workflows/team-coordination.yml

workflow:
  name: "Team Coordination"
  type: "continuous"

  team:
    members:
      - name: "Alice"
        repos_role: "lead"

      - name: "Bob"
        repos_role: "contributor"

    shared_repos:
      - "company/main-app"
      - "company/api-service"
      - "company/admin-dashboard"

  coordination:
    # Track who's working on what
    presence:
      broadcast:
        enabled: true
        method: "shared_file"   # Or webhook, or git notes
        location: "~/Dropbox/team/delta-scope/presence.json"
        update_frequency: "5m"

      show:
        current_work:
          - user: "Alice"
            repo: "main-app"
            branch: "feature/auth"
            since: "2h ago"

    # Detect potential conflicts
    conflict_detection:
      - if_same_repo:
          multiple_users: true
          action:
            notify:
              message: "{user} is also working on {repo_name}"
              suggestion: "Coordinate on {branch_name}?"

      - if_same_files:
          multiple_users: true
          files: ["same_file.ts"]
          action:
            notify:
              message: "⚠️  You and {user} are both editing {file_name}"
              priority: "high"

  team_reminders:
    - daily_standup:
        schedule: "09:00"
        days: ["mon", "tue", "wed", "thu", "fri"]
        action:
          generate_report:
            title: "Team Activity Summary"
            content: |
              # Yesterday's Work
              {for user in team}
              ## {user.name}
              - Committed to: {user.repos_with_commits}
              - Currently on: {user.current_branch}
              - Status: {user.repos_status}
              {endfor}

    - eod_summary:
        schedule: "17:00"
        action:
          team_broadcast:
            message: "EOD Status: {repos_count} repos active, {uncommitted_count} uncommitted"
            share_with: ["alice@company.com", "bob@company.com"]
```

---

### 7. CI/CD Integration
**Problem:** Developer pushes code but forgets to check CI/CD status. Tests fail, deployments break.

**Impact:**
- Broken builds
- Blocked teammates
- Failed deployments
- Delayed feedback

**Delta-Scope Solution:**

```yaml
# ~/.config/delta-scope/workflows/ci-cd-integration.yml

workflow:
  name: "CI/CD Monitoring"
  type: "continuous"

  integrations:
    - github_actions:
        enabled: true
        repos:
          - pattern: "company/*"
            check_frequency: "5m"

    - jenkins:
        enabled: true
        url: "https://ci.company.com"
        repos:
          - "legacy-app"
          - "api-service"

    - gitlab_ci:
        enabled: false

  monitoring:
    on_push:
      - wait_for_ci: true
        timeout: "10m"

      - if_ci_fails:
          notify:
            title: "❌ CI Failed for {repo_name}"
            message: "{test_failures} test(s) failed on {branch}"
            priority: "high"
            actions:
              - "View logs"
              - "View diff"
              - "Revert commit"

      - if_ci_succeeds:
          notify:
            title: "✅ CI Passed for {repo_name}"
            priority: "normal"
            auto_dismiss: "30s"

    periodic_check:
      schedule: "hourly"

      check:
        - main_branch_status: true
        - pr_status: true

      if_main_broken:
        notify:
          title: "🔥 Main Branch Broken!"
          message: "{repo_name} main branch is failing CI"
          priority: "critical"
          actions:
            - "View logs"
            - "Assign to on-call"

  pre_push_checks:
    # Before allowing push, run local checks
    enabled: true

    checks:
      - lint: true
      - type_check: true
      - unit_tests: true

    on_failure:
      action: "block_push"
      message: "Fix {errors} before pushing"

    on_skip:
      confirm: "Are you sure? Local checks failed."
```

---

### 8. Learning & Knowledge Retention
**Problem:** Developer works on unfamiliar repo, forgets learnings when switching away, has to relearn context.

**Impact:**
- Wasted time relearning
- Repeated mistakes
- Poor documentation
- Lost tribal knowledge

**Delta-Scope Solution:**

```yaml
# ~/.config/delta-scope/workflows/knowledge-retention.yml

workflow:
  name: "Knowledge Capture"
  type: "interactive"

  # Prompt for notes when leaving a repo
  capture:
    trigger:
      on_context_switch: true
      min_time_spent: "30m"      # Only if spent meaningful time

    prompt:
      message: "You spent {duration} on {repo_name}. Add notes?"
      quick_capture:
        - "What did you learn?"
        - "What's tricky about this repo?"
        - "What needs to be documented?"
        - "Where did you get stuck?"

    storage:
      location: "{repo_path}/.delta-scope/notes.md"
      format: |
        ## {date} - {user}
        **Duration:** {duration}
        **Activity:** {description}
        **Notes:**
        {notes}

  retrieval:
    # Show notes when returning to repo
    on_repo_open:
      show_last_notes: true
      if_first_time:
        show_all_notes: true

  ai_assistance:
    # AI helps generate repo summary
    generate_summary:
      trigger: "on_request"
      prompt: |
        Based on this repo structure and my notes, create a README for future me:
        - What is this repo for?
        - How do I run it?
        - What are the gotchas?
        - What's the architecture?

  team_knowledge:
    # Share learnings with team
    share:
      enabled: true
      location: "{repo_path}/.delta-scope/team-notes.md"
      contributors: ["alice", "bob", "charlie"]

    on_repo_open:
      show_team_tips: true
      format: "💡 Tip from {author}: {tip}"
```

---

## Configuration Schema

### Global Config

```typescript
// ~/.config/delta-scope/config.yml

delta_scope:
  version: "1.0.0"

  # Base repository scanning
  scanning:
    base_paths:
      - "/home/user/projects"
      - "/home/user/work"
    exclude_patterns:
      - "node_modules"
      - "dist"
      - ".venv"
    max_depth: 5
    show_hidden: false

  # Database & persistence
  database:
    location: "~/.local/share/delta-scope/delta-scope.db"
    backup:
      enabled: true
      frequency: "daily"
      location: "~/.local/share/delta-scope/backups/"
      retention: "30d"

  # UI preferences
  ui:
    theme: "dark"
    compact_mode: false
    show_debug_panel: false
    default_sort: "status"
    default_view: "grouped"

  # Notifications
  notifications:
    enabled: true
    priority_threshold: "normal"  # normal, high, critical
    quiet_hours:
      enabled: true
      start: "22:00"
      end: "08:00"
    sounds:
      enabled: true
      critical_only: false

  # Workflows
  workflows:
    enabled: true
    location: "~/.config/delta-scope/workflows/"
    auto_load: true

  # AI features
  ai:
    enabled: false              # Opt-in
    provider: "anthropic"       # anthropic, openai, local
    api_key_env: "ANTHROPIC_API_KEY"
    cache_duration: "7d"
    auto_classify: false        # Classify new repos automatically

  # Team features
  team:
    enabled: false
    name: "engineering-team"
    shared_location: "~/Dropbox/team/delta-scope/"
    presence_broadcast: false

  # Machine tracking
  machine:
    current:
      name: "work-laptop"
      hostname: "auto-detect"
      base_paths_mapping:
        "/Users/user/projects": "{home}/projects"
```

---

## Pre-Built Workflow Templates

Users can enable these with one command:

```bash
# Install workflow template
delta-scope workflows install eod-reminder
delta-scope workflows install context-tracking
delta-scope workflows install stale-branches

# List available templates
delta-scope workflows list

# Customize template
delta-scope workflows customize eod-reminder
# Opens in editor: ~/.config/delta-scope/workflows/eod-reminder.yml

# Enable/disable workflows
delta-scope workflows enable eod-reminder
delta-scope workflows disable context-tracking

# Test workflow
delta-scope workflows test eod-reminder --dry-run
```

---

## Implementation Phases

### Phase 1: Basic Workflows (v0.3.0)
- [ ] Scheduled checks (EOD reminder)
- [ ] Simple notifications
- [ ] Workflow configuration format
- [ ] Enable/disable workflows

### Phase 2: Advanced Workflows (v0.4.0)
- [ ] Context tracking
- [ ] Multi-machine coordination
- [ ] Interactive workflow actions
- [ ] Workflow templates library

### Phase 3: AI-Powered Workflows (v1.0.0)
- [ ] AI-driven suggestions
- [ ] Knowledge capture
- [ ] Itinerary generation
- [ ] Smart reminders

### Phase 4: Team Workflows (v1.1.0)
- [ ] Team coordination
- [ ] Shared presence
- [ ] Collaborative workflows
- [ ] Team analytics

---

## Open Questions

1. **Workflow Execution:** Should workflows run in main process or separate daemon?
2. **Notification System:** Use node-notifier or integrate with system (notify-send, osascript)?
3. **Workflow Language:** YAML config or JavaScript/TypeScript for advanced logic?
4. **Security:** How to sandbox user-defined workflows?
5. **Performance:** How many workflows can run simultaneously without degradation?

---

**Status:** 🟡 Planning Phase
**Next:** Implement workflow system in v0.3.0
**Owner:** Jeffrey Blake
