# Agent Teams for browser-ide: Deep Analysis and Steps

> A detailed, architecture-aware guide for applying Claude Code Agent Teams to the browser-ide project. Based on actual dependency analysis of 87 source files, 12 test suites, and 21 services.

---

## Why browser-ide Is Ideal for Agent Teams

1. **Large files exhaust single-agent context** - 20+ files exceed 15KB. `terminalCommands.ts` alone is 38KB. A single agent working across Editor (15KB) + useIDEStore (23KB) + terminalCommands (38KB) consumes 76KB of context just reading 3 files — nearly 40% of useful context window before reasoning even begins.

2. **Clear subsystem boundaries** - 6 independent subsystems (Editor, Git, Terminal, AI, Filesystem, Debug) with well-defined interfaces between them.

3. **Existing CLAUDE.md and AGENTS.md** - All teammates automatically inherit project context, reducing exploration overhead per agent.

4. **Independent test suites** - Each subsystem has its own test files. Agents can run tests in isolation without stepping on each other.

5. **Build splits match subsystem boundaries** - Vite config already code-splits by feature (monaco, terminal, git, ai, webcontainer), validating that subsystems are independently loadable.

---

## Architecture Map: Dependency Analysis

### Service Dependency Chain

```
filesystem.ts (ROOT - no service dependencies)
    |
    +---> git.ts (depends on: filesystem)
    |       +---> sourceControlService.ts
    |       +---> terminalCommands.ts
    |       +---> importExport.ts
    |
    +---> claude-agent.ts (depends on: filesystem, git)
    |       +---> claude-cli.ts
    |       +---> terminalCommands.ts
    |
    +---> terminalSession.ts
    |       +---> terminalCommands.ts
    |
    +---> terminalCommands.ts (MOST CONNECTED - depends on: filesystem, git, webcontainer, claude-agent, terminalSession)
    |
    +---> importExport.ts (depends on: filesystem, git)

webcontainer.ts (SEPARATE ROOT - only consumed by terminalCommands)

intellisense.ts, linter.ts, snippets.ts, vscode-extensions.ts (STANDALONE - depend only on types/utils)
```

### Shared Hotspot Files (Conflict Zones)

| File | Imported By | Risk If Edited by Multiple Agents |
|------|-------------|-----------------------------------|
| `store/useIDEStore.ts` | 21 files | CRITICAL - never assign to >1 agent |
| `types/index.ts` | 17 files | HIGH - type changes cascade everywhere |
| `utils/logger.ts` | 11 files | MEDIUM - interface is stable |
| `services/filesystem.ts` | 9 files | HIGH - foundational service |
| `services/git.ts` | 8 files | HIGH - many consumers |
| `services/sourceControlService.ts` | 6 files | MEDIUM |

### Rule: No Two Agents Touch the Same File

These hotspot files must be assigned to exactly ONE agent per team session. If a feature requires changes to `useIDEStore.ts`, one agent owns it; others communicate needed state changes via messages.

---

## Subsystem Ownership Map

### Subsystem 1: Editor & Code Intelligence

| Type | Files |
|------|-------|
| Components | `Editor.tsx` (15K), `EditorStatusBar.tsx`, `SplitEditor.tsx`, `ProblemsPanel.tsx` (24K), `CommandPalette.tsx` (30K) |
| Services | `intellisense.ts` (32K), `linter.ts` (11K), `snippets.ts` (23K), `vscode-extensions.ts` (8.7K) |
| Tests | `Editor.test.tsx` (32K) |
| Dependencies | Monaco Editor, useIDEStore (read-only for editor state) |

**Total context load:** ~155K for full subsystem. Needs a dedicated agent.

### Subsystem 2: Git & Source Control

| Type | Files |
|------|-------|
| Components | `BranchesView.tsx` (7.8K), `ChangesView.tsx` (4.7K), `DiffViewer.tsx` (15K), `HistoryView.tsx` (2.3K), `SourceControlPanel.tsx` (8.6K), `StashView.tsx` (6.4K) |
| Services | `git.ts` (28K), `sourceControlService.ts` (12K) |
| Tests | `git.test.ts` (50K) |
| Dependencies | isomorphic-git, LightningFS, useIDEStore (git slice) |

**Total context load:** ~135K. Independent from Editor/Terminal. Clean boundary.

### Subsystem 3: Terminal & WebContainer Runtime

| Type | Files |
|------|-------|
| Components | `Terminal.tsx` (13K), `TerminalTabs.tsx` (25K), `NanoEditor.tsx` (9.3K), `Preview.tsx` (1.5K) |
| Services | `terminalCommands.ts` (38K), `terminalSession.ts` (11K), `webcontainer.ts` (10K) |
| Tests | `Terminal.test.tsx` (20K), `webcontainer-security.test.ts` (8.2K) |
| Dependencies | xterm.js, WebContainers API, useIDEStore (terminal slice) |

**Warning:** `terminalCommands.ts` bridges to filesystem, git, AI. This is the most connected service. Agent working here must be aware of interfaces to other subsystems but NOT modify those other services.

**Total context load:** ~136K. Bounded but bridged.

### Subsystem 4: AI & Claude Integration

| Type | Files |
|------|-------|
| Components | `AIAssistant.tsx` (3.7K), `ClaudeCodePanel.tsx` (2.1K), `ClaudeCLI.tsx` (27K) |
| Services | `ai-providers.ts` (14K), `claude-agent.ts` (13K), `claude-cli.ts` (15K) |
| Tests | `ai-providers.test.ts` (30K) |
| Dependencies | Anthropic SDK, useIDEStore (AI slice) |

**Total context load:** ~105K. Well-isolated. Only connects to terminal through claude-cli.

### Subsystem 5: Filesystem & Project Management

| Type | Files |
|------|-------|
| Components | `FileExplorer.tsx` (24K), `SearchPanel.tsx` (14K), `CloneDialog.tsx` (3.9K), `WorkspaceSwitcher.tsx` (6.2K) |
| Services | `filesystem.ts` (12K), `importExport.ts` (12K) |
| Store | `useWorkspaceStore.ts` (9.2K) |
| Tests | `filesystem.test.ts` (21K), `FileExplorer.test.tsx` (16K) |
| Dependencies | LightningFS, Dexie, useIDEStore (file/project slices) |

**Total context load:** ~118K. Foundation layer — other subsystems depend on this.

### Subsystem 6: Infrastructure & App Shell

| Type | Files |
|------|-------|
| Components | `App.tsx` (25K), `BootScreen.tsx`, `ErrorBoundary.tsx`, `Loading.tsx`, `MobileOptimizedLayout.tsx`, `ResponsiveLayout.tsx`, `ServiceBanner.tsx`, `SettingsDialog.tsx` (8.9K), `HelpPanel.tsx` (6.3K), `Debugger.tsx` (30K), `ExtensionsPanel.tsx` (10K) |
| Store | `useIDEStore.ts` (23K) |
| Config | `vite.config.ts`, `environment.ts`, `breakpoints.ts` |
| Lib | `database.ts` (8K) |
| Types | `types/index.ts` (13K) |
| Utils | `logger.ts`, `json.ts`, `toast.ts` |

**This subsystem owns the shared hotspot files.** Only one agent should modify these per session.

---

## Step-by-Step: Running Agent Teams on browser-ide

### Step 0: Prerequisites

```bash
# Ensure Claude Code is up to date
npm update -g @anthropic-ai/claude-code

# Enable agent teams for browser-ide
mkdir -p ~/Projects/side-projects/browser-ide/.claude
```

Add to `~/Projects/side-projects/browser-ide/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Bash(pnpm test)",
      "Bash(pnpm test:e2e)",
      "Bash(pnpm lint)",
      "Bash(pnpm type-check)",
      "Bash(pnpm build)",
      "Bash(pnpm validate)"
    ]
  }
}
```

Pre-approving test/lint/build permissions prevents prompt floods when 3+ agents all try to run tests simultaneously.

### Step 1: Start with Code Review (Lowest Risk)

**Goal:** Validate the swarm setup with a read-only task before doing any implementation.

```bash
# Start a tmux session for visibility
tmux new-session -s browser-ide-review

# Launch Claude Code
cd ~/Projects/side-projects/browser-ide
claude
```

**Prompt:**

```
Create an agent team called "codebase-review" with 3 teammates:

1. "security-reviewer" (type: Explore):
   - Audit COOP/COEP header configuration in vite.config.ts
   - Check CSP policy (no unsafe-inline in production)
   - Review WebContainer sandboxing (webcontainer-security.test.ts)
   - Verify API key handling: keys should be in sessionStorage, never persisted
   - Check for XSS vectors in terminalCommands.ts command parsing
   - Check json.ts for prototype pollution protection
   - Report findings to my inbox with severity ratings

2. "performance-reviewer" (type: Explore):
   - Check Monaco editor lazy loading in Editor.tsx
   - Verify xterm.js fitAddon.fit() is called on resize in Terminal.tsx
   - Analyze useIDEStore.ts for unnecessary re-render triggers (whole-state destructuring)
   - Check code splitting config in vite.config.ts (monaco, terminal, git, ai, webcontainer bundles)
   - Verify dispose/cleanup on unmount for Monaco and xterm
   - Review Dexie IndexedDB query patterns in database.ts
   - Report findings to my inbox with impact ratings

3. "architecture-reviewer" (type: Explore):
   - Review service layer patterns: do all services follow async Result<Output> pattern from AGENTS.md?
   - Check store design: are Zustand selectors used properly to prevent re-renders?
   - Verify component data-testid attributes exist for E2E testing
   - Review import conventions: all use @/ aliases, no relative imports?
   - Check error handling: try-catch with Result pattern, logger utility?
   - Assess file sizes: which files should be split? (>25K is a signal)
   - Report findings to my inbox with priority ratings
```

**Expected outcome:** 3 agents read the codebase in parallel, each from their specialized lens. Lead synthesizes findings into a prioritized issue list. Total time: ~3-5 minutes. Token cost: ~500-800K.

**What to verify after first run:**
- Did all 3 agents complete their tasks?
- Are findings in your inbox? (`cat ~/.claude/teams/codebase-review/inboxes/team-lead.json | jq '.'`)
- Were there permission prompt interruptions? If yes, add more pre-approvals.

### Step 2: Parallel E2E Testing (High Parallelism)

**Goal:** Run E2E tests across all browser targets simultaneously.

**Prompt:**

```
Create an agent team called "e2e-qa" with 3 teammates:

1. "qa-chromium" (type: general-purpose):
   - Run: pnpm exec playwright test --project=chromium
   - Report all failures with exact error messages and screenshots
   - If tests pass, report "All Chromium tests passed" with test count

2. "qa-firefox" (type: general-purpose):
   - Run: pnpm exec playwright test --project=firefox
   - Report all failures with exact error messages and screenshots
   - If tests pass, report "All Firefox tests passed" with test count

3. "qa-webkit" (type: general-purpose):
   - Run: pnpm exec playwright test --project=webkit
   - Report all failures with exact error messages and screenshots
   - If tests pass, report "All WebKit tests passed" with test count

After all results are in, synthesize a cross-browser compatibility report: which tests fail on which browsers, and which are universal failures vs browser-specific.
```

**Why this works:** Each browser target is 100% independent. Zero file conflicts. Clear deliverable per agent. Lead only needs to synthesize.

### Step 3: Cross-Layer Feature Development (Full Coordination)

**Goal:** Implement a multi-subsystem feature using coordinated agents.

**Example feature:** "Add a new git blame view that shows inline blame annotations in the editor"

**Prompt:**

```
Create an agent team called "git-blame-feature" with 3 teammates.

IMPORTANT RULES:
- Each teammate owns SPECIFIC files listed below. Do NOT modify files outside your ownership.
- If you need a change in another agent's files, message that agent with the exact change needed.
- All new code must follow patterns in CLAUDE.md and AGENTS.md.
- Use @/ import aliases, never relative imports.
- Add data-testid to all new elements.

Teammates:

1. "git-engineer" (type: general-purpose):
   YOUR FILES (only modify these):
   - src/services/git.ts — add a gitBlame(filePath, branch?) function using isomorphic-git
   - src/services/sourceControlService.ts — add a getBlameForFile wrapper
   - src/components/Git/ — create BlameView.tsx if needed

   CONSTRAINTS:
   - Follow the async Result<Output> pattern from existing services
   - Use LightningFS (already initialized in git.ts)
   - Add proper error handling with logger
   - Run: pnpm test src/services/git.test.ts after changes

   DELIVERABLE: Working gitBlame service function with tests. Message "editor-engineer" with the BlameData type shape when ready.

2. "editor-engineer" (type: general-purpose):
   YOUR FILES (only modify these):
   - src/components/IDE/Editor.tsx — add inline blame annotations using Monaco decorations API
   - src/components/IDE/EditorStatusBar.tsx — add blame toggle button
   - src/types/index.ts — add BlameData type (coordinate shape with git-engineer)

   CONSTRAINTS:
   - Wait for git-engineer to message you the BlameData type shape before implementing
   - Use Monaco decorationsAPI for inline annotations
   - Lazy load blame data (don't fetch on every file open)
   - Run: pnpm test src/components/IDE/Editor.test.tsx after changes

   DELIVERABLE: Inline blame annotations in editor, togglable from status bar.

3. "test-engineer" (type: general-purpose):
   YOUR FILES (only modify these):
   - src/services/git.test.ts — add blame function tests
   - src/components/IDE/Editor.test.tsx — add blame annotation tests
   - tests/e2e/editor.spec.ts — add E2E test for blame toggle

   CONSTRAINTS:
   - Wait for both other agents to message you when their implementations are ready
   - Test edge cases: empty file, binary file, file not in git, no commits
   - Mock git service in component tests
   - Run full test suite: pnpm test && pnpm test:e2e

   DELIVERABLE: Comprehensive test coverage for the blame feature.
```

**Task dependencies for this team:**

```
Task 1: "Implement gitBlame in git.ts" (git-engineer) — no blockers
Task 2: "Add BlameData type to types/index.ts" (editor-engineer) — blocked by Task 1
Task 3: "Add blame annotations to Editor.tsx" (editor-engineer) — blocked by Task 1
Task 4: "Write git.test.ts blame tests" (test-engineer) — blocked by Task 1
Task 5: "Write Editor.test.tsx blame tests" (test-engineer) — blocked by Task 3
Task 6: "Write E2E blame test" (test-engineer) — blocked by Tasks 1+3
```

**What can go wrong and how to handle it:**

| Issue | Signal | Fix |
|-------|--------|-----|
| git-engineer modifies types/index.ts | File conflict with editor-engineer | Reassign: only editor-engineer touches types/index.ts |
| editor-engineer starts before BlameData type is defined | Uses wrong type shape, work gets discarded | Enforce: "Wait for message from git-engineer" in prompt |
| test-engineer writes tests before implementations exist | Tests test nothing or wrong interface | Use `addBlockedBy` to enforce ordering |
| All agents modify useIDEStore.ts | Overwrites | Add to prompt: "Do NOT modify useIDEStore.ts. If you need new state, message the lead with exact state shape needed" |

### Step 4: Competing Hypothesis Debugging

**Goal:** Diagnose a complex bug by investigating multiple root causes simultaneously.

**Example:** "Terminal output stops rendering after switching workspaces"

**Prompt:**

```
Create an agent team called "debug-terminal-freeze" to investigate why terminal output stops rendering after workspace switch.

1. "hypothesis-terminal" (type: Explore):
   Investigate if the issue is in Terminal.tsx / TerminalTabs.tsx / terminalSession.ts:
   - Does xterm dispose/recreate properly on workspace switch?
   - Is fitAddon.fit() called after workspace switch?
   - Are terminal refs properly cleaned up?
   Focus on: Terminal.tsx, TerminalTabs.tsx, terminalSession.ts
   Report your findings with evidence (specific line numbers and code paths).

2. "hypothesis-store" (type: Explore):
   Investigate if the issue is in state management:
   - Does useWorkspaceStore properly save/restore terminal state?
   - Does useIDEStore.terminalTabs get corrupted on switch?
   - Are there stale closures capturing old terminal references?
   Focus on: useIDEStore.ts, useWorkspaceStore.ts, WorkspaceSwitcher.tsx
   Report your findings with evidence.

3. "hypothesis-webcontainer" (type: Explore):
   Investigate if the issue is in WebContainer lifecycle:
   - Does the WebContainer process survive workspace switch?
   - Is the terminal stream properly reconnected?
   - Does webcontainer.ts handle workspace isolation?
   Focus on: webcontainer.ts, terminalCommands.ts
   Report your findings with evidence.

After all three report, I will evaluate which hypothesis has the strongest evidence and direct the fix.
```

### Step 5: Large Refactor with Plan Approval Gates

**Goal:** Split oversized files with safety gates.

**Prompt:**

```
Create an agent team called "refactor-split" with plan approval required.

Context: These files are too large and should be split:
- terminalCommands.ts (38K) — split into command groups
- CommandPalette.tsx (30K) — extract command definitions
- useIDEStore.ts (23K) — extract into slice files

1. "refactor-planner" (type: Plan, plan_mode_required: true):
   Analyze the 3 files above and propose a split plan:
   - For terminalCommands.ts: group commands by category (git commands, file commands, AI commands, system commands)
   - For CommandPalette.tsx: extract command registry from rendering logic
   - For useIDEStore.ts: identify state slices that can become separate files

   CRITICAL: Propose the plan. Do NOT implement until I approve.
   Show exact file boundaries, new file names, and what moves where.

2. "refactor-tester" (type: general-purpose):
   After the refactor plan is approved and implemented:
   - Run full test suite: pnpm test
   - Run type-check: pnpm type-check
   - Run lint: pnpm lint
   - Run build: pnpm build
   - Report any failures

   DO NOT START until refactor-planner's plan is approved and implementation is complete.
```

---

## Quick Reference: Agent Team Prompts by Scenario

### Adding a New Service

```
Team of 2:
- "service-engineer": creates src/services/newService.ts following Result<> pattern, adds types to types/index.ts
- "test-engineer": writes src/services/newService.test.ts with happy path + edge cases
```

### Adding a New Component

```
Team of 2:
- "component-engineer": creates component in appropriate directory, adds data-testid, uses @/ imports
- "test-engineer": writes co-located .test.tsx file, E2E test if user-facing
```

### Dependency Upgrade

```
Team of 3 (parallel, no dependencies):
- "upgrade-agent": updates package.json, runs pnpm install, fixes breaking API changes
- "test-agent": runs full test suite after upgrade, fixes failing tests
- "build-agent": runs pnpm build, checks bundle sizes, verifies code splitting still works
```

### Performance Audit

```
Team of 3 (parallel, read-only):
- "bundle-analyzer": analyzes vite build output, identifies oversized chunks
- "render-profiler": reviews React components for unnecessary re-renders
- "memory-auditor": checks for cleanup/dispose patterns, leak-prone patterns
```

---

## Files That Should NEVER Be Modified by Multiple Agents Simultaneously

| File | Why | Assignment Rule |
|------|-----|-----------------|
| `store/useIDEStore.ts` | 21 consumers, state schema changes cascade | Assign to infrastructure agent OR restrict all agents to read-only |
| `types/index.ts` | 17 consumers, type changes break everything | Assign to ONE agent per session |
| `services/filesystem.ts` | Foundation layer, 9 consumers | Assign to filesystem agent only |
| `services/git.ts` | 8 consumers, complex isomorphic-git state | Assign to git agent only |
| `services/terminalCommands.ts` | Bridges 5 subsystems | Assign to terminal agent only |
| `App.tsx` | Application shell, 25K, imports everything | Assign to infrastructure agent only |
| `vite.config.ts` | Build config, affects all agents' work | Lead only |

---

## Cost Estimates for browser-ide Agent Teams

| Scenario | Agents | Est. Tokens | Est. Time | Value |
|----------|--------|-------------|-----------|-------|
| Code Review (Step 1) | 3 Explore | ~500K | 3-5 min | HIGH - find issues early |
| E2E Testing (Step 2) | 3 general-purpose | ~400K | 5-8 min | HIGH - parallel browser testing |
| Cross-Layer Feature (Step 3) | 3 general-purpose | ~1.2M | 15-25 min | HIGH - compresses multi-hour work |
| Bug Investigation (Step 4) | 3 Explore | ~600K | 5-10 min | MEDIUM-HIGH - eliminates sequential hypothesis testing |
| Large Refactor (Step 5) | 2 (Plan + general) | ~800K | 10-20 min | MEDIUM - plan approval gate adds safety |

---

## Troubleshooting

### "Agent modified a file it shouldn't own"
Add explicit `DO NOT MODIFY` lists to spawn prompts. List the exact files the agent is forbidden from touching.

### "Agent didn't wait for dependency"
Use `TaskUpdate({ taskId: "X", addBlockedBy: ["Y"] })` in the task graph. Don't rely on instructions alone.

### "Agent quality degraded mid-task"
The file is too large for the remaining context. Split the task into smaller pieces. Each agent task should target <5 files.

### "Tests fail after multi-agent changes"
Run `pnpm validate` (type-check + lint + build) before committing. Assign a dedicated test-engineer agent to run the full suite last.

### "Agents keep asking about project setup"
Verify CLAUDE.md and AGENTS.md exist in the project root. Teammates inherit these automatically. If they don't, the instructions say to use pnpm, @/ aliases, etc. — which prevents basic setup questions.

### "Permission prompts interrupting every agent"
Add all test/lint/build commands to `.claude/settings.json` permissions allowlist (see Step 0).

---

## Sources

- [Official Claude Code Agent Teams Docs](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Swarms - Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/)
- [Claude Code Agent Teams: The Complete Guide 2026 (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-teams)
- [Claude Code Swarm Orchestration Skill (kieranklaassen Gist)](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea)
- [Claude Code's Hidden Multi-Agent System (paddo.dev)](https://paddo.dev/blog/claude-code-hidden-swarm/)
- [Claude Code Multiple Agent Systems: Complete 2026 Guide (eesel.ai)](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide)
