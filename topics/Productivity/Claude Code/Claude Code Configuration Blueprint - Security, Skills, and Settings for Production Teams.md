# Claude Code Configuration Blueprint: Security, Skills, and Settings for Production Teams

> A battle-tested configuration guide for Claude Code. Covers layered security with permissions, reusable skills for the full dev lifecycle, CLAUDE.md architecture for teams, and auto-memory for cross-session intelligence. Ready-to-use config files included.

---

## Who This Is For

You've used Claude Code on a project or two. You know the basics. Now you want to:

- Stop Claude from touching secrets, credentials, or system files
- Share team standards via git without leaking personal preferences
- Create reusable workflows (plan, implement, test, review, ship)
- Make Claude remember lessons across sessions
- Configure once, benefit everywhere

This guide gives you copy-paste configs and explains the **why** behind each decision.

---

## The Configuration Architecture

Claude Code loads configuration from multiple layers, each with a specific purpose:

```
Layer 1: ~/.claude/settings.json          (personal global - OS security, universal rules)
Layer 2: ~/.claude/CLAUDE.md              (personal global - workflow preferences)
Layer 3: ~/.claude/skills/*/SKILL.md      (personal global - reusable slash commands)
Layer 4: .claude/settings.json            (project shared - team permissions via git)
Layer 5: .claude/settings.local.json      (project personal - gitignored overrides)
Layer 6: CLAUDE.md                        (project shared - coding standards via git)
Layer 7: CLAUDE.local.md                  (project personal - gitignored preferences)
```

**Design principle:** Layers 1-3 are personal (not in any repo). Layers 4 and 6 are team-shared (committed to git). Layers 5 and 7 are personal overrides (gitignored).

**Critical rule:** Project CLAUDE.md must be self-contained. It cannot depend on global skills or global CLAUDE.md, because teammates won't have your personal config.

---

## Part 1: Security - The Permission System

### How Permissions Work

Permissions use three tiers evaluated in strict order:

1. **Deny** - Always blocks. Cannot be overridden. Not even by `--dangerously-skip-permissions`.
2. **Ask** - Always prompts for confirmation. Persists even in dangerous mode.
3. **Allow** - Auto-approved. No prompts.

**Deny always wins.** If a command matches both `allow` and `deny`, it's blocked.

### Pattern Syntax Quick Reference

```
Bash(exact command)       - matches only that exact command
Bash(command *)           - matches command with any arguments (space before *)
Bash(command:*)           - matches command variations (no space, colon prefix)
Read(path/to/file)        - matches exact file
Read(path/**/*.json)      - matches glob pattern
Read(~/.ssh/**)           - ~ expands to home directory on any OS
```

**Space matters:** `Bash(ls *)` matches `ls -la` but NOT `lsof`. `Bash(ls*)` matches both.

### Global Settings: OS-Level Security

This goes in `~/.claude/settings.json` and protects you across ALL projects:

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Edit",
      "Write",
      "Glob",
      "Grep",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(git show:*)",
      "Bash(git stash list)",
      "Bash(nvm use:*)",
      "Bash(nvm list)",
      "Bash(node:*)",
      "Bash(ls:*)",
      "Bash(echo:*)",
      "Bash(cat:*)",
      "Bash(mv:*)",
      "Bash(grep:*)",
      "Bash(find:*)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(git commit:*)",
      "Bash(git merge:*)",
      "Bash(git rebase:*)",
      "Bash(git checkout:*)",
      "Bash(git switch:*)",
      "Bash(git stash:*)",
      "Bash(git tag:*)",
      "Bash(pnpm install:*)",
      "Bash(pnpm install)",
      "Bash(pnpm add:*)",
      "Bash(pnpm remove:*)",
      "Bash(npm install:*)",
      "Bash(docker:*)",
      "Bash(pm2:*)",
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(ssh:*)",
      "Bash(scp:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(sudo:*)",
      "Bash(chmod:*)",
      "Bash(chown:*)",
      "Bash(mkfs:*)",
      "Bash(dd if=:*)",

      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean -f:*)",

      "Read(.env)",
      "Read(.env.*)",
      "Write(.env)",
      "Write(.env.*)",
      "Edit(.env)",
      "Edit(.env.*)",

      "Read(~/.ssh/**)",
      "Write(~/.ssh/**)",
      "Edit(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Write(~/.aws/**)",
      "Edit(~/.aws/**)",
      "Read(~/.gnupg/**)",
      "Write(~/.gnupg/**)",
      "Read(~/.npmrc)",
      "Write(~/.npmrc)",
      "Edit(~/.npmrc)",
      "Read(~/.netrc)",
      "Write(~/.netrc)",
      "Read(~/.docker/config.json)",
      "Write(~/.docker/config.json)",
      "Read(~/.kube/config)",
      "Write(~/.kube/config)",
      "Read(~/.config/gh/hosts.yml)",
      "Write(~/.config/gh/hosts.yml)",

      "Read(~/.config/gcloud/**)",
      "Write(~/.config/gcloud/**)",
      "Read(~/.azure/**)",
      "Write(~/.azure/**)",

      "Read(~/Library/Keychains/**)",
      "Read(~/Library/Caches/Google/Chrome/**)",
      "Read(~/Library/Application Support/Google/Chrome/Default/Login Data*)",
      "Read(~/Library/Application Support/Google/Chrome/Default/Cookies*)",
      "Read(~/Library/Application Support/Firefox/**)",
      "Read(~/Library/Cookies/**)",

      "Read(~/.local/share/keyrings/**)",
      "Read(~/.config/google-chrome/Default/Login Data*)",
      "Read(~/.config/google-chrome/Default/Cookies*)",
      "Read(~/.mozilla/firefox/**)",

      "Read(/mnt/c/Users/*/AppData/Local/Google/Chrome/User Data/Default/Login Data*)",
      "Read(/mnt/c/Users/*/AppData/Local/Google/Chrome/User Data/Default/Cookies*)",
      "Read(/mnt/c/Users/*/AppData/Roaming/Mozilla/Firefox/**)",

      "Bash(kill -9:*)",
      "Bash(pkill:*)",
      "Bash(killall:*)",
      "Bash(shutdown:*)",
      "Bash(reboot:*)",
      "Bash(systemctl:*)",
      "Bash(launchctl:*)"
    ]
  }
}
```

#### Why These Specific Rules?

| Tier | Category | Rationale |
|------|----------|-----------|
| **Allow** | Read/Edit/Write/Glob/Grep | Core tools Claude needs to function |
| **Allow** | Read-only git (`status`, `diff`, `log`) | Safe - no mutations |
| **Allow** | `nvm`, `node`, `ls`, `cat`, `mv` | Basic file operations |
| **Ask** | `git push/commit/merge` | Affects remote state and history |
| **Ask** | `pnpm/npm install/add/remove` | Modifies dependencies |
| **Ask** | `docker`, `pm2`, `curl`, `ssh` | Infrastructure and network access |
| **Deny** | `rm -rf`, `sudo`, `chmod` | Destructive system commands |
| **Deny** | `git push --force`, `reset --hard` | Irreversible git operations |
| **Deny** | `.env*` files | Secrets and API keys |
| **Deny** | `~/.ssh`, `~/.aws`, `~/.gnupg` | Credential stores |
| **Deny** | `~/.npmrc`, `~/.netrc` | Auth tokens |
| **Deny** | `~/.docker/config.json`, `~/.kube/config` | Container/K8s creds |
| **Deny** | `~/.config/gcloud`, `~/.azure` | Cloud provider creds |
| **Deny** | Browser data (Chrome, Firefox) | Login data, cookies, passwords |
| **Deny** | `kill -9`, `shutdown`, `reboot` | Process/system control |

**Cross-OS coverage:** The deny list covers macOS (`~/Library/`), Linux (`~/.local/share/`, `~/.config/`, `~/.mozilla/`), and Windows WSL (`/mnt/c/Users/*/AppData/`).

### Project Settings: Team-Shared Safety

Create `.claude/settings.example.json` in your repo (committed to git). Team members copy it to `.claude/settings.json`.

Add this to `.gitignore`:
```
.claude/*
!.claude/*.example*
```

This ensures `settings.example.json` is shared but personal `settings.local.json` stays private.

#### For a Node.js/TypeScript Monorepo

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Edit",
      "Write",
      "Glob",
      "Grep",
      "Bash(pnpm serve:*)",
      "Bash(pnpm build:*)",
      "Bash(pnpm build)",
      "Bash(pnpm clean)",
      "Bash(pnpm lint:*)",
      "Bash(pnpm lint-fix:*)",
      "Bash(pnpm test:*)",
      "Bash(pnpm test)",
      "Bash(npx eslint:*)",
      "Bash(npx vue-tsc:*)",
      "Bash(npx tsc:*)",
      "Bash(nvm use:*)",
      "Bash(node:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(git show:*)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(git commit:*)",
      "Bash(git merge:*)",
      "Bash(git rebase:*)",
      "Bash(pnpm install:*)",
      "Bash(pnpm install)",
      "Bash(pnpm add:*)",
      "Bash(pnpm remove:*)",
      "Write(package.json)",
      "Edit(package.json)",
      "Write(pnpm-lock.yaml)",
      "Edit(pnpm-lock.yaml)",
      "Bash(docker:*)",
      "Bash(curl:*)"
    ],
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Write(.env)",
      "Write(.env.*)",
      "Edit(.env)",
      "Edit(.env.*)",
      "Read(node_modules/**)",
      "Read(dist/**)",
      "Read(logs/**)"
    ]
  }
}
```

**Notice:** Project deny list only has project-specific rules (`.env`, `node_modules`, `dist`, `logs`). OS-level security is handled by the global settings.

#### For a Project with Config Files Containing Secrets

Add these to the project deny list:

```json
"Read(src/configs/server.config.json)",
"Read(src/configs/aws.config.json)",
"Read(src/configs/ai.config.json)",
"Read(src/certs/*.pem)"
```

#### For a Project with Database Migrations

Put migration commands in the ask tier (not allow):

```json
"ask": [
  "Bash(pnpm db:migrate)",
  "Bash(pnpm db:seed)",
  "Bash(docker-compose:*)"
]
```

Allow schema generation (no mutations):
```json
"allow": [
  "Bash(pnpm db:generate)"
]
```

---

## Part 2: CLAUDE.md - The Team Playbook

### Structure Template

```markdown
# CLAUDE.md

## Commands
- `pnpm dev` - Start development server
- `pnpm build` - Production build
- `pnpm test` - Run all tests
- `pnpm lint-fix` - Lint and fix all packages

## Project Context
[One paragraph: what this project does, key business features]

## Architecture Overview
### Monorepo Structure (if applicable)
- `packages/client` - Frontend (Vue/React/etc)
- `packages/server` - Backend API
- `packages/shared` - Shared types and utilities

### Key Patterns
- [Module pattern: Controller -> Service -> Repository]
- [Auth: JWT + OAuth]
- [State management: Pinia/Redux/etc]

## Coding Standards
- [Language]: TypeScript strict mode
- [Imports]: Absolute paths, destructured
- [Naming]: camelCase functions, PascalCase components
- [Error handling]: try/catch on all API calls with loading states

## Common PR Review Issues (MUST follow)
### 1. Type Safety
- Never use `any` or `unknown`
- Declare API payloads as typed constants before passing

### 2. Dead Code Cleanup
- Remove unused imports, variables, functions
- Remove unused i18n keys when deleting components

### 3. Naming Conventions
- Getter functions: `get` prefix (`getCoursePrice`)
- Event handlers: `on` prefix (`onSubmitClick`)
- API routes: plural nouns (`/users` not `/user`)

## General Rules (MUST follow)
### Planning Before Implementation
- ALWAYS confirm the plan before implementing
- List target files before editing
- Enter plan mode for non-trivial tasks (3+ steps)

### Incremental Verification
- Type-check after each logical group of edits
- Fix errors immediately - don't continue to the next file
- Never mark a task complete without proving it works

### Core Principles
- Simplicity First: minimal changes, minimal impact
- No Laziness: find root causes, no temporary fixes
- Autonomous Bug Fixing: given a bug report, just fix it

## Workflow
- Commit at logical milestones - don't accumulate huge uncommitted changes
- Use screenshots for debugging UI issues
- When deleting components, also remove their unused i18n keys

## Testing
- Incremental type checking: after each file edit, not at the end
- Test at minimum 375px (mobile), 768px (tablet), 1280px (desktop)
```

### What Makes a Great CLAUDE.md

| Do | Don't |
|----|-------|
| Include commands Claude needs to run | Include formatting rules (use a linter) |
| Document non-obvious patterns | Document obvious language features |
| List PR review pain points | Write a textbook on your stack |
| Keep under 200 lines | Duplicate what's in README |
| Include coding standards from real reviews | Include aspirational rules nobody follows |

### CLAUDE.local.md - Personal Overrides

This file is gitignored. Use it for personal preferences:

```markdown
# Personal preferences
- I prefer verbose git commit messages
- Always ask before modifying package.json
- Use Bangla for i18n keys by default
```

### Subdirectory CLAUDE.md

For large projects, place CLAUDE.md files in subdirectories. They're loaded lazily when Claude accesses files in that directory:

```
project/
  CLAUDE.md              # Project-wide rules
  packages/
    server/
      CLAUDE.md          # Server-specific patterns
    client/
      CLAUDE.md          # Frontend-specific conventions
```

---

## Part 3: Skills - Reusable Workflows

Skills are prompt templates at `~/.claude/skills/<name>/SKILL.md`, invoked with `/command`.

### Skill: Plan Before Implementation

**File:** `~/.claude/skills/plan-work/SKILL.md`

```markdown
# Plan (Non-TDD)

Plan before implementing. Confirm targets, approach, and get approval.

## When to Use
- Before any non-trivial implementation (3+ steps)
- When architectural decisions are involved
- When multiple files/packages will be modified

## Process

### Step 1: Understand the Request
- Read the user's request carefully
- Identify ambiguities and ask clarifying questions

### Step 2: Assess Impact
- Which packages/modules are affected?
- Are shared types/utilities changing?
- Does this affect other repos or services?

### Step 3: Write the Plan
Present a numbered plan:
1. **Target files**: List every file to create/modify/delete
2. **Approach**: Describe the implementation strategy
3. **Dependencies**: Note any package installs or config changes
4. **Risks**: Flag potential breaking changes
5. **Verification**: How to confirm it works

### Step 4: Get Approval
- Present the plan and WAIT for explicit approval
- Do NOT start implementing until the user says "go" or "approved"

## Rules
- NEVER skip planning for non-trivial tasks
- If the plan changes mid-implementation, STOP and re-plan
- If something goes sideways, STOP and re-plan immediately
```

### Skill: Incremental Implementation

**File:** `~/.claude/skills/implement/SKILL.md`

```markdown
# Implement

Guided implementation with incremental type checking.

## When to Use
- After a plan has been approved
- When making changes across multiple files

## Process

### Step 1: Check Prerequisites
- Read CLAUDE.md for project conventions
- Read package.json for available scripts
- Identify type-check command (tsc, vue-tsc, turbo typecheck)

### Step 2: Build Order
For monorepos, follow dependency order:
1. Shared types/interfaces
2. Shared utilities/constants
3. DTOs/validation schemas
4. Backend modules
5. Frontend components/views

### Step 3: Implement with Verification
For each file or tightly-coupled group:
1. Make the changes
2. Run type checker immediately
3. Fix any errors before moving to next file
4. If shared packages changed, rebuild them first

### Step 4: Final Verification
- Run full type check across all packages
- Run linter
- Run relevant tests
- Verify no unused imports or dead code

## Rules
- NEVER batch all edits then check at the end
- Fix errors immediately - don't accumulate them
- After editing types, check ALL files that import them
- For shared package changes: rebuild BEFORE checking downstream
```

### Skill: Pre-Review Self-Check

**File:** `~/.claude/skills/pre-review/SKILL.md`

```markdown
# Pre-Review

Self-review against project standards before presenting work.

## When to Use
- Before saying "done" or "complete"
- Before creating a PR
- After finishing a feature or fix

## Checklist

### Type Safety
- [ ] No `any` or `unknown` types
- [ ] API payloads use typed constants
- [ ] All function parameters and returns are typed

### Dead Code
- [ ] No unused imports
- [ ] No unused variables or functions
- [ ] No commented-out code blocks
- [ ] Removed i18n keys for deleted components

### Naming
- [ ] Getter functions use `get` prefix
- [ ] Event handlers use `on` prefix
- [ ] API routes use plural nouns

### Error Handling
- [ ] All API calls wrapped in try/catch
- [ ] Loading states on buttons that trigger API requests
- [ ] User-facing error messages for failures

### Code Quality
- [ ] No hardcoded magic values (use constants)
- [ ] No duplicate logic (extract to shared helper)
- [ ] Follows existing codebase patterns
- [ ] Absolute import paths (no `../../`)

### Verification
- [ ] Type check passes
- [ ] Lint passes
- [ ] No regressions in existing tests
- [ ] Changes demonstrated to work (not just "should work")

## Process
1. Run through each checklist item
2. Fix any issues found
3. Run type check + lint one final time
4. Report: "Pre-review complete. [N] issues found and fixed."
```

### Skill: Ship (Commit + PR)

**File:** `~/.claude/skills/ship/SKILL.md`

```markdown
# Ship

Branch management, commit, push, and create PR.

## When to Use
- When work is complete and verified
- When the user says "commit", "ship", "create PR"

## Process

### Step 1: Verify Before Shipping
- Run type check
- Run lint
- Run relevant tests
- Check for uncommitted files that should be included

### Step 2: Stage Changes
- Stage specific files (not `git add -A`)
- Never stage: .env, credentials, node_modules, dist, logs
- Review staged diff before committing

### Step 3: Commit
- Write concise commit message (imperative mood)
- Format: `type: description` (feat, fix, refactor, style, docs, test)
- Body: explain WHY, not WHAT (the diff shows the what)

### Step 4: Push & PR (if requested)
- Push to remote with tracking
- Create PR with:
  - Title: short, under 70 characters
  - Body: Summary bullets + Test plan checklist

## Rules
- NEVER commit secrets (.env, config files with credentials)
- NEVER force push
- ALWAYS verify before committing
- Ask before pushing to shared branches (main, develop, staging)
```

### Skill: TDD Testing

**File:** `~/.claude/skills/test-tdd/SKILL.md`

```markdown
# TDD Testing (Full Pyramid)

Execute Test-Driven Development: unit, integration, and E2E tests.

## Test Pyramid

| Layer | Share | Scope | Speed |
|-------|-------|-------|-------|
| Unit | 70% | Single function/service/component | < 5ms |
| Integration | 20% | Module boundaries, API endpoints | < 100ms |
| E2E | 10% | Full user flows in browser | < 30s |

## Red-Green-Refactor Cycle

### 1. RED - Write failing test
Write the test first. Run it. Confirm it FAILS.
Verify the failure is for the RIGHT reason (missing method, not syntax error).

### 2. GREEN - Minimal implementation
Write the minimum code to make the test pass.
Run ALL tests - confirm nothing else broke.

### 3. REFACTOR - Clean up
Improve code quality. Run ALL tests. Still green.

## Backend Unit Test Pattern

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockRepository: MockType;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
    };
    service = new ServiceName(mockRepository);
  });

  describe('methodName', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockData);
      // Act
      const result = await service.methodName(input);
      // Assert
      expect(result).toEqual(expected);
    });

    it('should throw when [error condition]', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.methodName(input))
        .rejects.toThrow(NotFoundException);
    });
  });
});
```

## Frontend Component Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MyComponent from '../MyComponent.vue';

describe('MyComponent', () => {
  it('should render when condition is met', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Hello' },
    });
    expect(wrapper.find('[data-testid="title"]').text())
      .toBe('Hello');
  });

  it('should emit event on user action', async () => {
    const wrapper = mount(MyComponent);
    await wrapper.find('[data-testid="submit-btn"]')
      .trigger('click');
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });
});
```

## Execution Order
1. Backend unit tests (fastest feedback)
2. Backend integration tests
3. Frontend component tests
4. E2E browser tests (slowest)

## Rules
- NEVER write implementation before its test (in TDD mode)
- ALWAYS clear mocks in beforeEach
- ALWAYS use descriptive names: `should [behavior] when [condition]`
- NEVER test implementation details - test behavior and contracts
```

---

## Part 4: Global CLAUDE.md - Personal Workflow

`~/.claude/CLAUDE.md` applies to all projects. Keep it for personal workflow preferences:

```markdown
# Personal Workflow Preferences

These supplement (never override) each project's CLAUDE.md.

## Workflow Orchestration

### Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps)
- If something goes sideways, STOP and re-plan immediately

### Subagent Strategy
- Use subagents to keep main context window clean
- One task per subagent for focused execution

### Self-Improvement Loop
- After ANY correction from user: update auto memory with the pattern
- If corrected on something from memory, update the incorrect entry immediately

### Autonomous Bug Fixing
- When given a bug report: just fix it
- Point at logs, errors, failing tests - then resolve them

## Context Management
- Reset context mid-session when switching between unrelated tasks
- Don't rely on context after heavy compaction - re-read critical files
- Commit frequently at logical milestones
- When context is ~50% consumed, summarize key decisions before compaction
- Use subagents for heavy research to keep main context clean
```

---

## Part 5: Auto Memory - Cross-Session Intelligence

Claude Code has a persistent memory directory per project at `~/.claude/projects/<project-path>/memory/`. A `MEMORY.md` file (first 200 lines) is loaded into every conversation.

### What to Store in Memory

```markdown
# Memory - Project Name

## Project Context
- Monorepo: client, server, shared packages
- Admin repo at separate location
- Uses Bitbucket (not GitHub) - `gh` CLI won't work for PRs

## Patterns Learned
- Always rebuild shared packages after type changes
- The enrollment module has 3 sub-algorithms (Phase1, Phase2, Basic1)
- Payment flow: INITIATING -> PENDING -> VALID/INVALID

## Common Mistakes to Avoid
- Don't use relative imports - project uses absolute paths
- Don't put domain helpers in global helpers file
- Always update both language files (bn.json + en.json)
```

### Memory Rules

| Do | Don't |
|----|-------|
| Store stable patterns confirmed across sessions | Store session-specific context |
| Store key architectural decisions | Store speculative conclusions |
| Store user preferences they've explicitly stated | Store info that duplicates CLAUDE.md |
| Update when corrected | Store incomplete/unverified info |

---

## Part 6: Hooks - Automated Quality Gates

Hooks run automatically at lifecycle events. Configure in settings.json:

### Notification Hook (Know When Claude Needs You)

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Awaiting your input'"
          }
        ]
      }
    ]
  }
}
```

### Pre-Commit Lint Hook

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "If this is a git commit command, verify that lint and type-check have been run in this session. If not, block with: 'Run lint and type-check before committing.'"
          }
        ]
      }
    ]
  }
}
```

### Post-Edit Type Check Reminder

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "If more than 3 files have been edited since the last type-check, remind: 'Consider running type-check before continuing.'"
          }
        ]
      }
    ]
  }
}
```

---

## Part 7: Putting It All Together

### New Project Setup Checklist

1. **Create CLAUDE.md** - Project context, commands, architecture, coding standards
2. **Create `.claude/settings.example.json`** - Project-specific permissions (deny config files, node_modules)
3. **Add to `.gitignore`**: `.claude/*` and `!.claude/*.example*`
4. **Document in README**: "Copy `.claude/settings.example.json` to `.claude/settings.json`"

### New Team Member Onboarding

1. Copy `.claude/settings.example.json` to `.claude/settings.json`
2. Ensure `~/.claude/settings.json` has the global security deny list
3. Create `CLAUDE.local.md` for personal preferences
4. Run a test session: `claude` then ask "summarize this project's architecture"

### The Security Layers in Practice

```
Request: "Read the AWS config file"

Layer 1 (Global deny):  ~/.ssh, ~/.aws, browser data     -> BLOCKED if ~/.aws
Layer 2 (Project deny): .env, server.config.json, *.pem   -> BLOCKED if config file
Layer 3 (Project ask):  git push, pnpm install             -> PROMPTED
Layer 4 (Global ask):   docker, curl, ssh                  -> PROMPTED
Layer 5 (Allow):        Read, Edit, git status              -> AUTO-APPROVED
```

### Common Scenarios

**Scenario: Claude tries to install a package**
```
pnpm add lodash
-> Matches ask rule: "Bash(pnpm add:*)"
-> Claude pauses and asks for confirmation
-> You approve or deny
```

**Scenario: Claude tries to read .env**
```
Read .env.local
-> Matches project deny: "Read(.env.*)"
-> BLOCKED. Cannot be overridden.
```

**Scenario: Claude tries to force push**
```
git push --force origin main
-> Matches global deny: "Bash(git push --force:*)"
-> BLOCKED. Even with --dangerously-skip-permissions.
```

---

## Quick Reference: File Locations

| File | Location | Shared? | Purpose |
|------|----------|---------|---------|
| `~/.claude/settings.json` | Home | No | Global permissions (OS security) |
| `~/.claude/CLAUDE.md` | Home | No | Personal workflow preferences |
| `~/.claude/skills/*/SKILL.md` | Home | No | Reusable slash commands |
| `.claude/settings.json` | Project | Yes | Team permissions |
| `.claude/settings.local.json` | Project | No | Personal overrides |
| `CLAUDE.md` | Project | Yes | Team coding standards |
| `CLAUDE.local.md` | Project | No | Personal preferences |
| `~/.claude/projects/*/memory/` | Home | No | Cross-session memory |

---

## Summary

The best Claude Code setup follows one principle: **layer your configuration by scope and shareability.**

- **Global settings** protect your system everywhere (secrets, credentials, destructive commands)
- **Project settings** protect project-specific resources (config files, build artifacts)
- **CLAUDE.md** encodes team standards that every Claude session follows
- **Skills** encode reusable workflows you trigger when needed
- **Memory** captures lessons learned across sessions
- **Hooks** automate quality gates at lifecycle events

Configure once. Benefit on every session, every project, every team member.
