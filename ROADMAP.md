# Delta-Scope Development Roadmap

**Vision:** Transform delta-scope from a simple TUI repo viewer into a comprehensive development workspace manager with AI assistance and cross-machine sync capabilities.

---

## Milestones Overview

```
v0.1.0 (Current) ──> v0.2.0 (MVP Complete) ──> v0.3.0 (Persistent) ──> v0.4.0 (Sync) ──> v1.0.0 (AI)
     |                    |                        |                      |                  |
  Current State      Fix & Complete          SQLite + Events       Multi-Machine      AI Features
  ~55% MVP          100% Phase 1 MVP         Lifecycle Tracking      Clone & Sync    Classification
                                                                                      Suggestions
```

---

## v0.1.0 - Current State (Released)

**Status:** ✅ Released
**Date:** 2025-11-09
**Completion:** 55% of Phase 1 MVP

### What Works
- ✅ Repository scanning and discovery
- ✅ Git status detection (branch, changes, unpushed)
- ✅ Color-coded status grouping
- ✅ Basic keyboard navigation (groups only)
- ✅ Sort modes (name, status, recent, changes)
- ✅ Debug mode
- ✅ Help system
- ✅ Configuration management (CLI commands)

### Known Issues
- 🔴 Navigation broken (can't select individual repos)
- 🔴 Filter, detail view, favorites not implemented despite being shown
- 🔴 No service layer tests
- 🔴 React hooks warnings
- 🔴 1 failing test

---

## v0.2.0 - MVP Complete

**Target Date:** 2-3 weeks
**Goal:** Fix all critical issues and complete Phase 1 MVP promises

### Week 1: Critical Fixes
**Blockers for any release**

- [ ] Fix navigation system (select individual repos)
  - Track both group and repo selection
  - Navigate within expanded groups
  - Visual selection indicator
  - **Estimated:** 4-6 hours

- [ ] Remove non-functional shortcuts from UI
  - Update Footer to only show working shortcuts
  - Add "Coming Soon" section to README
  - **Estimated:** 15 minutes

- [ ] Fix linting errors
  - Remove unused imports in test files
  - **Estimated:** 10 minutes

- [ ] Fix failing HelpView test
  - Update test expectations to match actual help text
  - **Estimated:** 5 minutes

- [ ] Add Dashboard component tests
  - Navigation logic
  - Keyboard input handling
  - State management
  - View routing
  - Minimum 50% coverage
  - **Estimated:** 4-6 hours

- [ ] Fix React hooks warnings
  - Wrap `groupRepos` in useCallback
  - Fix dependency arrays
  - **Estimated:** 1 hour

**Week 1 Total:** ~12-16 hours

### Week 2: Complete MVP Features
**Deliver on README promises**

- [ ] Implement fuzzy filter
  - Add filter input component (ink-text-input)
  - Add filter state management
  - Implement fuzzy matching (fuzzy library)
  - Filter mode UI (show/hide input)
  - Clear filter action
  - **Estimated:** 4-6 hours

- [ ] Implement detail view
  - Create DetailView component
  - Show full repo info (path, branches, commits, remotes)
  - Add commit history (last 10 commits)
  - Add diff details
  - Navigation to/from detail view
  - Keyboard shortcuts in detail view
  - **Estimated:** 6-8 hours

- [ ] Connect favorite toggle
  - Wire up 'f' key to configManager.toggleFavorite()
  - Update isFavorite state
  - Refresh display
  - Test favoriting workflow
  - **Estimated:** 2-3 hours

- [ ] Add service layer tests
  - gitStatus.ts - comprehensive mocking
  - gitScanner.ts - integration tests
  - configManager.ts - CRUD operations
  - Minimum 70% service coverage
  - **Estimated:** 6-8 hours

**Week 2 Total:** ~20-28 hours

### Week 3: Polish & Optimize
**User experience improvements**

- [ ] Add React performance optimizations
  - useCallback for handlers
  - useMemo for expensive computations
  - React.memo for components
  - **Estimated:** 3-4 hours

- [ ] Add UI improvements
  - Sort mode indicator in header
  - Total/filtered repo count
  - Scroll indicators (↓ More below)
  - Loading state for refresh
  - **Estimated:** 2-3 hours

- [ ] Add error boundary
  - Wrap Dashboard in ErrorBoundary
  - Graceful error display
  - Recovery actions
  - **Estimated:** 2 hours

- [ ] Add utility tests
  - colors.ts - all mapping functions
  - keybindings.ts - if needed
  - **Estimated:** 2-3 hours

- [ ] Fix type safety issues
  - Replace `any` types with proper Ink types
  - **Estimated:** 1 hour

- [ ] Replace process.exit()
  - Use Ink's useApp().exit()
  - Add cleanup logic
  - **Estimated:** 1 hour

**Week 3 Total:** ~12-16 hours

### v0.2.0 Deliverables
- ✅ 100% of Phase 1 MVP features working
- ✅ All critical bugs fixed
- ✅ 70%+ test coverage
- ✅ No linting errors or warnings
- ✅ Optimized for 100+ repos
- ✅ Professional UX (no broken features shown)

**Total Effort:** ~44-60 hours (3-4 weeks part-time)

---

## v0.3.0 - Persistence Foundation

**Target Date:** 4-5 weeks after v0.2.0
**Goal:** Add SQLite database and repo lifecycle tracking

### Phase 2: Database Setup (Week 1)

- [ ] Install better-sqlite3
  - Add to package.json
  - Create database connection utility
  - **Estimated:** 1 hour

- [ ] Design and create schema
  - repositories table (path, status, metadata)
  - repo_history table (track changes over time)
  - machines table (track different computers)
  - Create migration system
  - **Estimated:** 4-6 hours

- [ ] Implement Repository pattern
  - RepoRepository class (CRUD operations)
  - HistoryRepository class (query history)
  - Database initialization
  - **Estimated:** 6-8 hours

- [ ] Write database tests
  - Repository CRUD operations
  - Transaction handling
  - Migration tests
  - **Estimated:** 4-6 hours

**Week 1 Total:** ~16-22 hours

### Phase 2: Lifecycle Tracking (Week 2)

- [ ] Implement RepoLifecycleService
  - processDiscoveredRepo (new, restored, updated)
  - markMissingAsGhosts (repos removed from disk)
  - detectDuplicates (same repo, multiple paths)
  - detectMoves (repo relocated)
  - **Estimated:** 8-10 hours

- [ ] Implement event system
  - EventBus class (EventEmitter wrapper)
  - Define event types (repo:discovered, repo:changed, etc.)
  - Emit events from lifecycle service
  - **Estimated:** 3-4 hours

- [ ] Implement hook system
  - Built-in hooks (log-discoveries, detect-duplicates, track-moves)
  - Hook registration and execution
  - User-defined hooks (load from ~/.config/delta-scope/hooks/)
  - **Estimated:** 4-6 hours

- [ ] Update TUI to use persistence
  - Load repos from DB instead of just scanning
  - Show ghost repos (removed from disk)
  - Show repo history (when was it discovered, last change, etc.)
  - **Estimated:** 4-6 hours

**Week 2 Total:** ~20-28 hours

### Phase 2: Testing & Documentation (Week 3)

- [ ] Write persistence tests
  - Lifecycle service tests
  - Event system tests
  - Hook system tests
  - Integration tests (scan → persist → load)
  - **Estimated:** 8-10 hours

- [ ] Update documentation
  - Add database schema docs
  - Add event/hook documentation
  - Update ARCHITECTURE.md
  - Add migration guide for existing users
  - **Estimated:** 3-4 hours

- [ ] Performance testing
  - Test with 100+ repos
  - Test with 1000+ repos
  - Optimize queries if needed
  - **Estimated:** 2-3 hours

**Week 3 Total:** ~14-18 hours

### v0.3.0 Deliverables
- ✅ SQLite persistence for all repo data
- ✅ Repo lifecycle tracking (discovered, moved, removed, restored)
- ✅ Event-driven architecture
- ✅ Extensible hook system
- ✅ Ghost repo view (see removed repos)
- ✅ Duplicate detection
- ✅ Repo history (when discovered, status changes)

**Total Effort:** ~50-68 hours (4-5 weeks part-time)

---

## v0.4.0 - Cross-Machine Sync

**Target Date:** 6-7 weeks after v0.3.0
**Goal:** Enable syncing repos between different computers

### Phase 3: Sync Infrastructure (Week 1-2)

- [ ] Implement machines table
  - Track different computers (hostname, OS, username)
  - Detect current machine
  - **Estimated:** 2-3 hours

- [ ] Design sync format
  - JSON export format (RepoDump interface)
  - Include repo metadata, paths, remote URLs
  - Version the format for future compatibility
  - **Estimated:** 2-3 hours

- [ ] Implement export command
  - `delta-scope export <file>`
  - Export all repos to JSON
  - Include machine info
  - Include configurable paths (relative to home dir)
  - **Estimated:** 4-6 hours

- [ ] Implement import command
  - `delta-scope import <file>`
  - Read dump file
  - Compare with local repos
  - Show what's different
  - **Estimated:** 4-6 hours

- [ ] Implement clone command
  - `delta-scope import <file> --clone`
  - Clone repos that don't exist locally
  - Path mapping (source → target)
  - Interactive mode (prompt for each repo)
  - Dry-run mode (show what would be done)
  - **Estimated:** 8-10 hours

**Week 1-2 Total:** ~20-28 hours

### Phase 3: Sync UI & Testing (Week 3)

- [ ] Add sync UI to TUI
  - View for import/export status
  - Show repos that would be cloned
  - Show path conflicts
  - Interactive selection of repos to clone
  - **Estimated:** 6-8 hours

- [ ] Implement conflict resolution
  - Repo exists at different path
  - Different versions of same repo
  - User-friendly resolution UI
  - **Estimated:** 4-6 hours

- [ ] Write sync tests
  - Export/import round-trip
  - Path mapping
  - Conflict detection
  - Clone operations
  - **Estimated:** 6-8 hours

- [ ] Update documentation
  - Sync workflow guide
  - CLI command examples
  - Cross-platform considerations
  - **Estimated:** 2-3 hours

**Week 3 Total:** ~18-25 hours

### v0.4.0 Deliverables
- ✅ Export repos to JSON dump
- ✅ Import repos from dump (compare with local)
- ✅ Clone repos from dump (batch clone)
- ✅ Path mapping (adapt to different machine paths)
- ✅ Interactive mode (choose what to clone)
- ✅ Dry-run mode (preview changes)
- ✅ Conflict resolution (duplicates, path conflicts)
- ✅ Multi-machine tracking

**Total Effort:** ~38-53 hours (5-7 weeks part-time)

---

## v0.5.0 - AI Integration (Phase 1)

**Target Date:** 10-12 weeks after v0.4.0
**Goal:** Add AI-powered classification and suggestions

### Phase 4: AI Foundation (Week 1-2)

- [ ] Design AI service architecture
  - Pluggable provider system (Anthropic, OpenAI, local)
  - Provider interface
  - Configuration for API keys
  - **Estimated:** 3-4 hours

- [ ] Implement Anthropic provider
  - Use Claude API for classification
  - Prompt engineering for repo classification
  - Error handling and retries
  - **Estimated:** 4-6 hours

- [ ] Implement OpenAI provider
  - Use GPT-4 API for classification
  - Adapt prompts for OpenAI
  - **Estimated:** 3-4 hours

- [ ] Implement local model provider
  - Use llama.cpp or similar
  - Lighter classification (may be less accurate)
  - Privacy-first option
  - **Estimated:** 6-8 hours

- [ ] Create AI classifications table
  - Cache classification results
  - Track confidence scores
  - Store reasoning
  - **Estimated:** 2-3 hours

**Week 1-2 Total:** ~18-25 hours

### Phase 4: Classification Features (Week 3-4)

- [ ] Implement repo classification
  - Analyze repo structure (files, package.json, README)
  - Classify by category (web-app, library, tool, etc.)
  - Detect primary language
  - Detect frameworks
  - **Estimated:** 8-10 hours

- [ ] Add classification UI
  - Show AI classification in repo details
  - Bulk classify all repos
  - Manual override (correct wrong classifications)
  - Filter/group by classification
  - **Estimated:** 6-8 hours

- [ ] Implement caching
  - Store classifications in DB
  - Re-classify only when repo changes
  - Configurable cache expiry
  - **Estimated:** 3-4 hours

- [ ] Write AI service tests
  - Mock AI providers
  - Test classification logic
  - Test caching
  - **Estimated:** 4-6 hours

**Week 3-4 Total:** ~21-28 hours

### v0.5.0 Deliverables
- ✅ Pluggable AI provider system
- ✅ Anthropic Claude integration
- ✅ OpenAI GPT-4 integration
- ✅ Local model support (privacy option)
- ✅ Repo classification (category, language, frameworks)
- ✅ Cached classifications
- ✅ Classification UI in TUI
- ✅ Filter/group by AI classification

**Total Effort:** ~39-53 hours (8-11 weeks part-time)

---

## v1.0.0 - AI Suggestions & Coordination

**Target Date:** 14-16 weeks after v0.5.0
**Goal:** AI-assisted work planning and reminders

### Phase 5: Suggestions (Week 1-2)

- [ ] Implement suggestion generation
  - Analyze all repos (status, classifications)
  - Generate prioritized action list
  - "What should I work on next?"
  - **Estimated:** 8-10 hours

- [ ] Add suggestion UI
  - Suggestion panel in TUI
  - Show reasoning for each suggestion
  - Accept/dismiss suggestions
  - **Estimated:** 4-6 hours

- [ ] Write suggestion tests
  - Mock AI responses
  - Test prioritization logic
  - **Estimated:** 3-4 hours

**Week 1-2 Total:** ~15-20 hours

### Phase 5: Itineraries (Week 3-5)

- [ ] Implement itinerary generation
  - User provides goal (e.g., "finish all web apps")
  - AI creates ordered work plan
  - Estimate time for each task
  - **Estimated:** 10-12 hours

- [ ] Create itinerary tables
  - itineraries (id, title, status)
  - itinerary_items (repo, task, order, estimated_duration)
  - **Estimated:** 2-3 hours

- [ ] Add itinerary UI
  - View current itinerary
  - Mark items complete
  - Reorder items
  - Generate new itinerary
  - **Estimated:** 8-10 hours

- [ ] Write itinerary tests
  - Generation logic
  - State management
  - UI interactions
  - **Estimated:** 4-6 hours

**Week 3-5 Total:** ~24-31 hours

### Phase 5: Reminders (Week 6)

- [ ] Implement reminder system
  - reminders table (repo_id, message, remind_at)
  - Background check (every minute)
  - Desktop notifications
  - **Estimated:** 4-6 hours

- [ ] Add reminder UI
  - Create reminders for repos
  - View upcoming reminders
  - Snooze/dismiss reminders
  - Recurring reminders (daily, weekly)
  - **Estimated:** 4-6 hours

- [ ] Write reminder tests
  - Scheduling logic
  - Notification triggering
  - **Estimated:** 2-3 hours

**Week 6 Total:** ~10-15 hours

### v1.0.0 Deliverables
- ✅ AI-generated suggestions (what to work on)
- ✅ AI-generated itineraries (coordinated work plans)
- ✅ Task tracking (mark items complete)
- ✅ Reminder system (don't lose track of work)
- ✅ Desktop notifications
- ✅ Recurring reminders
- ✅ Complete AI-assisted workflow

**Total Effort:** ~49-66 hours (12-16 weeks part-time)

---

## Post-v1.0 (Future Phases)

### v1.1 - Git Operations from TUI
- Commit changes directly from TUI
- Push/pull operations
- Branch operations
- Stash management
- Interactive rebase helper

### v1.2 - Quick Actions & Integrations
- Open repo in editor (VS Code, vim, etc.)
- Open repo in terminal
- Open repo in browser (GitHub, GitLab)
- Copy path to clipboard
- Run custom commands

### v1.3 - Team Features
- Share itineraries with team
- Collaborative repo recommendations
- Team sync (pull repos based on team manifest)

### v1.4 - Plugin System
- User-defined plugins
- Plugin marketplace
- Hook extensions
- Custom TUI views

### v2.0 - Web Dashboard (Optional)
- Web UI alternative to TUI
- Real-time updates via WebSocket
- Team collaboration features
- Mobile-responsive

### v2.1 - Mobile App (Optional)
- iOS/Android companion app
- Push notifications for reminders
- View repo status on the go
- Trigger actions remotely

---

## Open Questions & Decisions

See `ARCHITECTURE.md` for:
1. Database location
2. Default AI provider
3. Sync conflict resolution strategy
4. Ghost repo retention policy
5. Event hook security model

---

## Success Metrics

### v0.2.0 Targets
- 100% of Phase 1 MVP features working
- 70%+ test coverage
- 0 linting errors
- <200ms load time for 50 repos
- No crashes in 1-hour stress test

### v0.3.0 Targets
- Handle 500+ repos without performance degradation
- <100ms query time for most DB operations
- 0% data loss (all repo state persisted correctly)
- Event system handles 100+ events/sec

### v0.4.0 Targets
- Clone 20 repos in <5 minutes (network dependent)
- 100% accuracy in duplicate detection
- 0 path conflicts in standard use cases

### v1.0.0 Targets
- 80%+ user satisfaction with AI suggestions
- <5 seconds to generate itinerary for 50 repos
- 90%+ reminder delivery success rate

---

## Contributors & Maintainers

**Lead Developer:** Jeffrey Blake (jeffreysblake)
**AI Assistant:** Claude (Anthropic)
**Testing:** Vitest + ink-testing-library
**Architecture:** Event-driven, persistence-first

---

**Roadmap Status:** 🟢 Active Development
**Current Milestone:** v0.2.0 - MVP Complete
**Last Updated:** 2025-11-09
**Next Review:** After v0.2.0 release
