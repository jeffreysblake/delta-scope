# Phase 1.5 Implementation Plan

**Goal:** Improve UX with settings page and navigation before SQLite
**Timeline:** 1-2 weeks
**Status:** Starting

---

## Task Breakdown

### Task 1: Settings View Component ⏳ NEXT
**Estimate:** 6-8 hours
**Priority:** 🔴 HIGH

**Requirements:**
- Expose ALL settings from `~/.config/delta-scope/settings.json`
- Navigate with ↑/↓, edit with Enter
- Live validation and error display
- Auto-save changes to settings.json
- Reset to defaults option
- Keyboard: 'c' to open, Esc to close

**Settings to Expose:**
```typescript
interface AppConfig {
  // General Section
  basePaths: string[];            // Array of paths to scan
  excludePatterns: string[];      // Patterns to ignore
  maxDepth: number;               // How deep to scan (1-10)
  showHidden: boolean;            // Show hidden directories

  // UI Section
  theme: 'dark' | 'light';        // Color theme
  refreshInterval: number;        // Seconds (10+)

  // Favorites (managed by app, show for reference)
  favorites: string[];            // List of favorite repo paths
}
```

**Component Structure:**
```
┌─ Settings ─────────────────────────────────────┐
│                                                │
│ [General]                                      │
│   Base Paths:                                  │
│     • ~/projects                               │
│     • ~/git                                    │
│     [a] Add path  [r] Remove selected         │
│                                                │
│   Exclude Patterns:                            │
│     • node_modules                             │
│     • dist                                     │
│     [a] Add pattern  [r] Remove selected      │
│                                                │
│   Max Depth: 5                [←→] Adjust     │
│   Show Hidden: No              [Space] Toggle  │
│                                                │
│ [UI]                                           │
│   Theme: dark                  [Tab] Cycle     │
│   Refresh Interval: 60s        [←→] Adjust     │
│                                                │
│ [Favorites] (Read-only)                        │
│   • /home/user/projects/delta-scope           │
│   • /home/user/projects/vibes-director        │
│                                                │
│ Press 'c' to save & close | 'r' to reset      │
└────────────────────────────────────────────────┘
```

**Implementation Files:**
- Create: `src/components/SettingsView.tsx`
- Create: `src/components/__tests__/SettingsView.test.tsx`
- Modify: `src/components/Dashboard.tsx` - Add settings view routing
- Modify: `src/components/Footer.tsx` - Add settings view shortcuts
- Modify: `src/services/configManager.ts` - Add validation methods
- Modify: `src/utils/keybindings.ts` - Update help text

**Validation Rules:**
- Base paths must be absolute paths
- Max depth: 1-10 only
- Refresh interval: minimum 10 seconds
- Patterns: valid glob patterns

**Test Coverage Target:** 80%+

---

### Task 2: Navigation Enhancements ⏳
**Estimate:** 3-4 hours
**Priority:** 🟡 MEDIUM

**Features:**

1. **Breadcrumb Trail**
```
┌─ delta-scope v0.2.0 > Repos > delta-scope (details) ──────── [157 repos] ─┐
```

2. **Back/Forward History Stack**
- Track view navigation (home → detail → home)
- Ctrl+O: Jump back
- Ctrl+I: Jump forward
- Alt+Left/Right: Alternative back/forward
- Max history: 50 items

3. **View Context Indicators**
```
┌─ delta-scope v0.2.0 ───── Viewing: delta-scope ───── [Back: Esc] ─────────┐
```

**Implementation:**
```typescript
interface NavigationItem {
  view: View;
  repo?: GitRepo;
  timestamp: Date;
}

// In Dashboard state
const [navHistory, setNavHistory] = useState<NavigationItem[]>([]);
const [navIndex, setNavIndex] = useState(0);
```

**Files to Modify:**
- `src/components/Header.tsx` - Add breadcrumb display
- `src/components/Dashboard.tsx` - Add history stack, navigation handlers
- `src/components/Footer.tsx` - Show back hint when applicable

---

### Task 3: Update Help System ⏳
**Estimate:** 1 hour
**Priority:** 🟢 LOW

**Changes:**
- Update keybindings.ts with new shortcuts
- Document settings view ('c' key)
- Document navigation shortcuts (Ctrl+O/I)
- Add keyboard reference card

---

## Post Phase 1.5: Phase 2 Prep

### SQLite Database Schema

**Create Once Phase 2 Starts:**
```sql
-- Access history for frecency
CREATE TABLE access_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path TEXT NOT NULL,
  accessed_at INTEGER NOT NULL,  -- Unix timestamp
  action TEXT NOT NULL,           -- 'view', 'select', 'favorite'
  session_id TEXT NOT NULL
);

CREATE INDEX idx_access_path ON access_history(repo_path);
CREATE INDEX idx_access_time ON access_history(accessed_at);

-- Search history for autocomplete
CREATE TABLE search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  result_count INTEGER,
  selected_repo_path TEXT
);

CREATE INDEX idx_search_time ON search_history(timestamp);

-- Frecency scores (cached)
CREATE TABLE frecency_scores (
  repo_path TEXT PRIMARY KEY,
  score REAL NOT NULL,
  last_updated INTEGER NOT NULL
);
```

**Note:** History tracking starts in Phase 2, not Phase 1.5

---

## Timeline

### Week 1 (Phase 1.5a)
- **Mon-Tue:** Implement SettingsView component
- **Wed:** Add tests for SettingsView
- **Thu:** Integrate settings view into Dashboard
- **Fri:** Testing, bug fixes, refinement

### Week 2 (Phase 1.5b)
- **Mon:** Implement navigation history stack
- **Tue:** Add breadcrumbs to Header
- **Wed:** Test navigation enhancements
- **Thu:** Update help system
- **Fri:** Final testing, commit, prepare for Phase 2

---

## Acceptance Criteria

### Settings View
- [ ] Can open with 'c' key
- [ ] All settings from settings.json are editable
- [ ] Changes save immediately to settings.json
- [ ] Validation prevents invalid values
- [ ] Reset to defaults works
- [ ] Can close with Esc
- [ ] 80%+ test coverage
- [ ] No crashes with invalid input

### Navigation Enhancements
- [ ] Breadcrumbs show current location
- [ ] Ctrl+O goes back in history
- [ ] Ctrl+I goes forward in history
- [ ] History limited to 50 items
- [ ] Back hint shows when available
- [ ] Navigation smooth and predictable

### Help System
- [ ] All new shortcuts documented
- [ ] Help view shows settings info
- [ ] Keyboard reference complete

---

## Risk Mitigation

**Risk 1:** Settings editing complexity
- **Mitigation:** Start with simple text inputs, iterate on UX
- **Fallback:** Make settings view read-only, edit in file

**Risk 2:** Navigation history complexity
- **Mitigation:** Keep stack simple (view + repo only)
- **Fallback:** Skip back/forward, just add breadcrumbs

**Risk 3:** Time estimate too aggressive
- **Mitigation:** Settings view is MVP, enhancements are optional
- **Fallback:** Ship settings only, defer navigation to Phase 2

---

## Success Metrics

- Settings view used at least once per session (tracking in Phase 2)
- No settings-related crashes or data loss
- User can modify all settings without editing JSON
- Navigation history improves workflow (subjective)
- Zero critical bugs from Phase 1.5

---

## Next Steps After Phase 1.5

1. **Phase 2: SQLite Persistence** (2-3 weeks)
   - Database schema implementation
   - Frecency scoring and tracking
   - Search history with autocomplete
   - Event system for real-time updates

2. **Phase 3: Agentic Foundation** (2-3 weeks)
   - Context bundle system
   - AI agent service
   - Basic recommendations UI

3. **Phase 4-6: Full Agentic Features** (6-8 weeks)
   - Pattern analysis
   - Recommendation engine
   - Safe actions and Git operations
   - Proactive monitoring
   - Predictive features

---

**Status:** Ready to implement Task 1 (Settings View)
**Updated:** 2025-11-10
