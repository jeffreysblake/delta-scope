# Agentic Integration Roadmap

**Purpose:** Detailed plan for integrating AI agent capabilities into delta-scope to provide intelligent recommendations, actions, and proactive monitoring.

**Date:** 2025-11-10

---

## Vision

Transform delta-scope from a monitoring tool into an **intelligent development companion** that:
- Learns your workflow patterns
- Provides contextual recommendations
- Automates repetitive tasks
- Proactively identifies issues
- Helps maintain repository health

---

## Architecture Overview

### Context Bundle System

**Purpose:** Package all relevant data for AI agent consumption

```typescript
interface AgentContext {
  settings: UserSettings;
  scan_data: ScanSnapshot;
  user_history: UserHistory;
  environment: EnvironmentInfo;
}

interface ScanSnapshot {
  timestamp: Date;
  total_repos: number;
  repos: EnrichedRepo[];
  summary: ScanSummary;
}

interface EnrichedRepo extends GitRepo {
  frecency_score: number;
  days_since_commit: number;
  days_since_viewed: number;
  health_score: number;
}

interface UserHistory {
  recent_repos: string[];      // Last 10 viewed
  frequent_repos: string[];    // Top 10 by frecency
  recent_searches: string[];   // Last 20 searches
  frequent_actions: ActionCount[];
  session_start: Date;
}
```

### Agent Communication Protocol

**Request Format:**
```json
{
  "action": "analyze" | "recommend" | "execute",
  "context": AgentContext,
  "prompt": "specific request or null for general analysis",
  "constraints": {
    "max_recommendations": 5,
    "priority_threshold": "medium",
    "auto_execute": false
  }
}
```

**Response Format:**
```json
{
  "recommendations": [
    {
      "id": "rec_001",
      "type": "cleanup" | "workflow" | "health" | "action",
      "priority": "high" | "medium" | "low",
      "title": "3 repos with stale uncommitted changes",
      "description": "You have uncommitted changes over 7 days old...",
      "affected_repos": ["/path/to/repo1", "/path/to/repo2"],
      "actions": [
        {
          "id": "action_001",
          "label": "Review changes",
          "command": "review",
          "safe": true
        },
        {
          "id": "action_002",
          "label": "Commit all",
          "command": "commit_all",
          "safe": false,
          "requires_confirmation": true
        }
      ]
    }
  ],
  "insights": {
    "repos_needing_attention": 12,
    "potential_archival": 3,
    "health_improving": true
  }
}
```

---

## Phase 3: Agentic Foundation (v0.5.0)

**Timeline:** 2-3 weeks
**Goal:** Build infrastructure for AI agent integration

### Week 1: Context System

**Task 1: Implement AgentContext Builder**
- Create `src/services/agentContext.ts`
- Build context bundler that aggregates all data
- Add environment detection (OS, terminal, git config)
- Include frecency scores in repo data
- Implement context serialization/validation

**Task 2: Add Context Snapshot Database**
```sql
CREATE TABLE context_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  context_json TEXT NOT NULL,
  repo_count INTEGER,
  user_action TEXT  -- What triggered this snapshot
);

-- Keep last 30 days of snapshots
CREATE INDEX idx_snapshot_time ON context_snapshots(timestamp);
```

**Task 3: Settings for AI Configuration**
- Add AI section to settings.json
- Create `aiConfig` type
- Add API key management (encrypted storage)
- Provider selection (anthropic, openai, local)
- Model selection dropdown
- Enable/disable toggle

### Week 2: Agent Communication Layer

**Task 1: Create Agent Service**
```typescript
// src/services/aiAgent.ts

interface AIAgentConfig {
  provider: 'anthropic' | 'openai' | 'local';
  model: string;
  apiKey?: string;
  endpoint?: string;  // For local models
  timeout: number;
  maxRetries: number;
}

class AIAgentService {
  async analyze(context: AgentContext): Promise<AgentResponse>
  async recommend(context: AgentContext, focus?: string): Promise<AgentResponse>
  async execute(actionId: string, context: AgentContext): Promise<ExecutionResult>
  async validate(actionId: string): Promise<ValidationResult>
}
```

**Task 2: Prompt Engineering**
- Create system prompt templates
- Build context formatter
- Implement token limiting (stay under limits)
- Add response parsing/validation
- Error handling for API failures

**Task 3: Safety & Sandboxing**
- Whitelist safe commands
- Require confirmation for destructive actions
- Log all agent actions
- Implement rollback capability
- Add "dry run" mode

### Week 3: Basic Agent UI

**Task 1: Agent Status Indicator**
```
┌─ delta-scope v0.5.0 ───── [AI: Ready] ───── Sort: frecency ───── [157 repos] ─┐
```

States: Ready, Analyzing, Error, Disabled

**Task 2: Agent Panel (Collapsible)**
```
┌─ AI Insights ──────────────────────────────┐
│ 💡 3 recommendations available             │
│ Press 'i' to view | 'x' to dismiss         │
└────────────────────────────────────────────┘
```

**Task 3: Recommendations View**
- New view: 'agent' or 'insights'
- List recommendations by priority
- Show affected repos
- Actions with hotkeys
- Dismiss/snooze functionality

**Deliverables:**
- ✅ Context system implemented
- ✅ Agent service with API integration
- ✅ Settings page with AI configuration
- ✅ Basic agent UI in TUI
- ✅ Safety checks and validation
- 📊 **Tests:** Context builder, agent service mocks, UI components

---

## Phase 4: Agent Intelligence (v0.6.0)

**Timeline:** 3-4 weeks
**Goal:** Implement intelligent recommendations and learning

### Week 1: Pattern Analysis

**Task 1: Workflow Detection**
```typescript
interface WorkflowPattern {
  name: string;
  frequency: number;
  repos: string[];
  steps: string[];
  last_seen: Date;
}

// Detect patterns like:
// - "Always commit before switching branches"
// - "Pull before starting work"
// - "Check tests before pushing"
```

**Task 2: Anomaly Detection**
- Repos with unusual activity (sudden spike in commits)
- Repos going stale (no activity in X days)
- Large uncommitted changes
- Broken remotes or missing branches
- Unusual time patterns (commits at 3am?)

**Task 3: Health Scoring**
```typescript
interface RepoHealth {
  score: number;  // 0-100
  factors: {
    commit_frequency: number;
    branch_hygiene: number;
    remote_sync: number;
    uncommitted_ratio: number;
    age_factor: number;
  };
  issues: string[];
  suggestions: string[];
}
```

### Week 2: Recommendation Engine

**Category 1: Maintenance**
- "Repo X hasn't been committed in 30 days but has changes"
- "3 repos have unpushed commits > 1 week old"
- "Repo Y is tracking a deleted remote"

**Category 2: Workflow**
- "You usually commit before lunch, but haven't today"
- "These 3 repos are often worked on together - create a workspace?"
- "You frequently switch between branches - enable branch history?"

**Category 3: Cleanup**
- "5 repos have no activity in 6 months - archive?"
- "Duplicate repos detected at different paths"
- "Large .git directory in repo X (500MB) - consider cleanup"

**Category 4: Optimization**
- "You search for 'docker' often - add a custom group?"
- "Sort mode changed 5 times - make 'frecency' default?"
- "Consider adding ~/work to base paths (3 repos found)"

### Week 3: Learning System

**Task 1: Feedback Loop**
```typescript
interface FeedbackEvent {
  recommendation_id: string;
  action: 'accepted' | 'dismissed' | 'snoozed';
  timestamp: Date;
  outcome?: 'helpful' | 'not_helpful' | 'harmful';
}

// Store feedback to improve recommendations
CREATE TABLE recommendation_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendation_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  outcome TEXT,
  notes TEXT
);
```

**Task 2: Preference Learning**
- Track which recommendations are accepted/dismissed
- Adjust priority thresholds based on feedback
- Learn user's risk tolerance (accepts destructive actions?)
- Adapt timing (when does user want recommendations?)

**Task 3: Context-Aware Prompts**
- Tailor prompts based on user history
- Include successful past recommendations
- Mention dismissed recommendations to avoid repeats
- Reference user's workflow patterns

**Deliverables:**
- ✅ Pattern detection system
- ✅ Health scoring algorithm
- ✅ Recommendation engine with 4 categories
- ✅ Feedback collection and learning
- 📊 **Tests:** Pattern detection, scoring accuracy, recommendation quality

---

## Phase 5: Agent Actions (v0.7.0)

**Timeline:** 3-4 weeks
**Goal:** Enable AI agent to perform actions on behalf of user

### Week 1: Safe Actions

**Implemented Actions:**
1. **Batch Favorite**: Favorite multiple repos matching pattern
2. **Group Creation**: Create custom groups based on patterns
3. **Filter Presets**: Save common filter queries
4. **Report Generation**: Create markdown reports of repo status
5. **Config Optimization**: Adjust settings based on usage

**Safety Layer:**
```typescript
interface ActionSafety {
  level: 'safe' | 'cautious' | 'destructive';
  requires_confirmation: boolean;
  reversible: boolean;
  preview_available: boolean;
  affected_count: number;
}

// All actions logged for audit
CREATE TABLE action_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  status TEXT NOT NULL,  -- 'success', 'failed', 'cancelled'
  repos_affected INTEGER,
  rollback_available BOOLEAN,
  details_json TEXT
);
```

### Week 2: Git Operations

**Implemented Actions:**
1. **Smart Commit**: Generate commit messages based on changes
2. **Batch Pull**: Pull multiple repos safely
3. **Branch Cleanup**: Delete merged local branches
4. **Stash Management**: Suggest stashing uncommitted work
5. **Conflict Detection**: Warn before potential merge conflicts

**Confirmation Dialog:**
```
┌─ Confirm Action ───────────────────────────┐
│ Action: Batch pull 5 repos                 │
│                                            │
│ Affected repos:                            │
│   • delta-scope (main)                     │
│   • vibes-director (develop)               │
│   • DOH (main)                             │
│   • project-x (feature/new-ui)             │
│   • api-service (main)                     │
│                                            │
│ Safety: Cautious (may cause merge issues) │
│ Rollback: No (pull cannot be undone)      │
│                                            │
│ Preview changes? [y/N]:                    │
│                                            │
│ Confirm? [y/N]:                            │
└────────────────────────────────────────────┘
```

### Week 3: Automation & Scheduling

**Task 1: Background Agent**
- Daemon process running separate from TUI
- Periodic analysis (configurable interval)
- Queue recommendations for next TUI session
- Store results in database

**Task 2: Triggered Actions**
- On repo discovery: Analyze and suggest favoriting
- On scan complete: Check for urgent issues
- On launch: Show summary of recommendations
- On idle: Perform maintenance checks

**Task 3: Scheduled Tasks**
```typescript
interface ScheduledTask {
  id: string;
  action: string;
  schedule: 'hourly' | 'daily' | 'weekly';
  enabled: boolean;
  last_run: Date;
  next_run: Date;
  params: Record<string, any>;
}

// Examples:
// - Daily: Check for stale repos
// - Weekly: Generate health report
// - Hourly: Sync with remote changes
```

**Deliverables:**
- ✅ 10+ safe actions implemented
- ✅ Git operation integration
- ✅ Comprehensive safety checks
- ✅ Background agent daemon
- ✅ Action scheduling system
- 📊 **Tests:** Action execution, safety validation, rollback

---

## Phase 6: Proactive Intelligence (v0.8.0)

**Timeline:** 2-3 weeks
**Goal:** Agent becomes proactive assistant

### Week 1: Monitoring & Alerts

**Monitoring Capabilities:**
1. **Remote Changes**: Detect when remote has new commits
2. **Merge Conflicts**: Predict conflicts before pulling
3. **CI/CD Status**: Check build status (if integrated)
4. **Disk Usage**: Monitor repo sizes
5. **Security**: Detect exposed credentials, outdated dependencies

**Alert System:**
```
┌─ Alert ────────────────────────────────────┐
│ ⚠️  HIGH PRIORITY                           │
│                                            │
│ Remote has 15 new commits in delta-scope  │
│ Your branch is 3 commits ahead             │
│                                            │
│ Recommendation: Pull and rebase            │
│                                            │
│ Actions:                                   │
│   [p] Pull now                             │
│   [d] View diff                            │
│   [s] Snooze 1 hour                        │
│   [x] Dismiss                              │
└────────────────────────────────────────────┘
```

### Week 2: Predictive Features

**Capabilities:**
1. **Commit Message Prediction**: Suggest messages based on changes
2. **Branch Prediction**: Suggest branch names based on changes
3. **Workflow Prediction**: "You usually do X after Y"
4. **Time Prediction**: "Repos needing attention before EOD"
5. **Conflict Prediction**: Warn before potential issues

**UI Integration:**
```
┌─ Predicted Actions ────────────────────────┐
│ Based on your patterns:                    │
│                                            │
│ 1. You usually commit delta-scope now      │
│    [c] Commit with AI message              │
│                                            │
│ 2. Time to pull team repos                 │
│    [p] Pull all team repos                 │
│                                            │
│ 3. Weekly cleanup recommended              │
│    [r] Run cleanup wizard                  │
└────────────────────────────────────────────┘
```

### Week 3: Integration & Polish

**Integrations:**
1. **GitHub/GitLab API**: PR status, issues, CI/CD
2. **JIRA/Linear**: Link commits to tickets
3. **Slack/Discord**: Send summaries to team
4. **VS Code**: Open repos in editor
5. **tmux**: Open repos in terminal windows

**Polish:**
- Smooth animations for agent actions
- Progress indicators for long operations
- Toast notifications for background events
- Keyboard shortcuts for common agent actions
- Customizable agent personality/tone

**Deliverables:**
- ✅ Monitoring and alert system
- ✅ Predictive features
- ✅ External integrations
- ✅ Polished UX for agent interactions
- 📊 **Tests:** Monitoring accuracy, prediction quality, integration tests

---

## Implementation Priorities

### Must-Have (v0.5.0 - v0.6.0)
1. ✅ Context system
2. ✅ Agent service with API
3. ✅ Settings page with AI config
4. ✅ Basic recommendations
5. ✅ Safety checks

### Should-Have (v0.7.0)
1. ✅ Safe actions (favorites, groups, reports)
2. ✅ Git operations (commit, pull, branch cleanup)
3. ✅ Background agent
4. ✅ Action logging

### Nice-to-Have (v0.8.0+)
1. ⭐ Proactive monitoring
2. ⭐ Predictive features
3. ⭐ External integrations
4. ⭐ Advanced automation

---

## Technical Considerations

### API Cost Management
- Cache agent responses (24 hours for static data)
- Batch recommendations to reduce API calls
- Use streaming for long operations
- Local model option for cost-sensitive users

### Privacy & Security
- API keys encrypted at rest
- Context data stays local (not sent to cloud)
- User control over what data is shared
- Audit log of all agent actions
- Opt-in for telemetry

### Performance
- Agent runs in background worker
- Non-blocking UI during analysis
- Incremental updates (don't re-analyze everything)
- Smart caching of expensive operations

### Testing Strategy
- Mock AI responses for deterministic tests
- Validate context generation accuracy
- Test safety checks thoroughly
- Integration tests with real repos
- User acceptance testing for recommendations

---

## Success Metrics

### Phase 3 (Foundation)
- [ ] Agent can analyze context in <5 seconds
- [ ] Settings page is intuitive (user testing)
- [ ] 100% of destructive actions blocked by safety
- [ ] Context generation accuracy >95%

### Phase 4 (Intelligence)
- [ ] Recommendation acceptance rate >30%
- [ ] False positive rate <10%
- [ ] Health scores correlate with user perception
- [ ] User satisfaction score >4/5

### Phase 5 (Actions)
- [ ] Action success rate >95%
- [ ] No data loss from agent actions
- [ ] Average time saved per session >2 minutes
- [ ] User trusts agent enough to enable auto-actions

### Phase 6 (Proactive)
- [ ] Alert accuracy >90% (useful alerts)
- [ ] Prediction accuracy >70%
- [ ] Users find agent "helpful" not "annoying"
- [ ] Net Promoter Score (NPS) >50

---

## Future Vision (v1.0+)

### Multi-User Collaboration
- Share recommendations across team
- Coordinated repository management
- Team workflow learning
- Shared automation scripts

### Advanced Intelligence
- Natural language queries ("Show me repos I haven't touched this week")
- Voice commands (via terminal TTS)
- Visual git graphs generated by AI
- Automated code review summaries

### Platform Extension
- Plugin architecture for custom agents
- Marketplace for agent behaviors
- Community-shared prompts
- Integration with IDE extensions

---

## References

- Anthropic Claude API documentation
- OpenAI GPT-4 best practices
- Mozilla Frecency algorithm
- GitHub Copilot patterns
- Cursor AI editor integration
- Devin AI agent architecture

---

## Changelog

- **2025-11-10**: Initial roadmap created
- **Next**: Begin Phase 3 implementation
