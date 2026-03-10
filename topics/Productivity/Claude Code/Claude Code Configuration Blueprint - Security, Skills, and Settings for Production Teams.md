# Claude Code Configuration Blueprint: Security, Skills, and Settings for Production Teams

> Configure Claude Code once — get security, reusable workflows, and cross-session intelligence across every project. A practical blueprint covering layered permissions, custom slash-command skills, CLAUDE.md architecture, and the spec-to-ship workflow.

---

## Who This Is For

You've used Claude Code on a project or two. You know the basics. Now you want to:

- Lock down secrets and credentials so Claude can never touch them
- Share team standards via git without leaking personal preferences
- Build a spec-to-ship workflow that adapts to features, fixes, and hotfixes
- Make Claude remember lessons across sessions
- Configure once, benefit everywhere

This guide gives you the blueprint and explains the **why** behind each decision.

---

## The Configuration Architecture

Claude Code loads configuration from multiple layers:

```
Personal (not in any repo):
  ~/.claude/settings.json          → OS-level security (deny list for all projects)
  ~/.claude/CLAUDE.md              → Personal workflow preferences
  ~/.claude/skills/*/SKILL.md      → Reusable slash commands (/spec, /plan, /ship)

Team-shared (committed to git):
  .claude/settings.json            → Project permissions (copy from settings.example.json)
  CLAUDE.md                        → Coding standards, architecture, PR review rules

Personal overrides (gitignored):
  .claude/settings.local.json      → Your personal project overrides
  CLAUDE.local.md                  → Your personal project preferences
```

**Design principle:** Global config handles security. Project config handles standards. Personal overrides handle preferences. Nothing leaks between layers.

**Critical rule:** Project CLAUDE.md must be self-contained. Teammates don't have your global skills or CLAUDE.md, so project files can't depend on them.

---

## Part 1: Security — The Permission System

### Three Tiers, Strict Order

1. **Deny** — Always blocks. Cannot be overridden. Not even by `--dangerously-skip-permissions`.
2. **Ask** — Always prompts for confirmation.
3. **Allow** — Auto-approved. No prompts.

**Deny always wins.** If a command matches both `allow` and `deny`, it's blocked.

### Global Settings: Your Security Perimeter

This goes in `~/.claude/settings.json` — protects you across ALL projects:

```json
{
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Glob", "Grep",
      "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)",
      "Bash(git branch:*)", "Bash(git show:*)",
      "Bash(nvm use:*)", "Bash(node:*)", "Bash(ls:*)"
    ],
    "ask": [
      "Bash(git push:*)", "Bash(git commit:*)", "Bash(git merge:*)",
      "Bash(pnpm install:*)", "Bash(pnpm add:*)", "Bash(npm install:*)",
      "Bash(docker:*)", "Bash(curl:*)", "Bash(ssh:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)", "Bash(sudo:*)", "Bash(chmod:*)",
      "Bash(git push --force:*)", "Bash(git reset --hard:*)",

      "Read(.env)", "Read(.env.*)", "Write(.env)", "Write(.env.*)",
      "Edit(.env)", "Edit(.env.*)",

      "Read(~/.ssh/**)", "Read(~/.aws/**)", "Read(~/.gnupg/**)",
      "Read(~/.npmrc)", "Read(~/.docker/config.json)",
      "Read(~/.kube/config)", "Read(~/.config/gh/hosts.yml)",

      "Read(~/Library/Keychains/**)",
      "Read(~/Library/Application Support/Google/Chrome/Default/Login Data*)",
      "Read(~/.local/share/keyrings/**)",
      "Read(~/.config/google-chrome/Default/Login Data*)",
      "Read(/mnt/c/Users/*/AppData/Local/Google/Chrome/User Data/Default/Login Data*)",

      "Bash(kill -9:*)", "Bash(shutdown:*)", "Bash(reboot:*)"
    ]
  }
}
```

#### Why These Specific Categories?

| Category | Tier | Rationale |
|----------|------|-----------|
| Read/Edit/Write/Glob/Grep | Allow | Core tools Claude needs to function |
| Read-only git (`status`, `diff`, `log`) | Allow | Safe — no mutations |
| `git push/commit/merge` | Ask | Affects remote state and history |
| `pnpm/npm install` | Ask | Modifies dependencies |
| `docker`, `curl`, `ssh` | Ask | Infrastructure and network access |
| `rm -rf`, `sudo`, `chmod` | Deny | Destructive system commands |
| `git push --force`, `reset --hard` | Deny | Irreversible git operations |
| `.env*` files | Deny | Secrets and API keys |
| `~/.ssh`, `~/.aws`, keychains | Deny | Credential stores |
| Browser login data | Deny | Passwords and cookies |

**Cross-OS coverage:** The deny list covers macOS (`~/Library/`), Linux (`~/.local/share/`, `~/.config/`), and Windows WSL (`/mnt/c/Users/*/AppData/`). One config, all platforms.

### Project Settings: Team-Shared Safety

Create `.claude/settings.example.json` in your repo. Team members copy it to `.claude/settings.json`.

```gitignore
# .gitignore
.claude/*
!.claude/*.example*
```

Project deny lists should only contain **project-specific** rules — not OS-level security (that's in global settings):

```json
{
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Glob", "Grep",
      "Bash(pnpm build:*)", "Bash(pnpm lint:*)", "Bash(pnpm test:*)",
      "Bash(npx tsc:*)", "Bash(npx vue-tsc:*)"
    ],
    "deny": [
      "Read(.env)", "Read(.env.*)", "Write(.env)", "Write(.env.*)",
      "Read(src/configs/server.config.json)",
      "Read(src/configs/aws.config.json)",
      "Read(node_modules/**)", "Read(dist/**)"
    ]
  }
}
```

---

## Part 2: CLAUDE.md — The Team Playbook

This is the most impactful file in your repo. A well-written CLAUDE.md turns Claude from a generic assistant into a team member who knows your codebase.

### What to Include

```markdown
# CLAUDE.md

## Commands
- `pnpm dev` — Start development server
- `pnpm build` — Production build
- `pnpm lint-fix` — Lint and fix all packages

## Project Context
[One paragraph: what this project does, who uses it, key business features]

## Architecture Overview
- `packages/client` — Vue 3 frontend
- `packages/server` — Express API
- `packages/shared` — Types, DTOs, utilities

## Coding Standards
- TypeScript strict mode, no `any` types
- Absolute imports only (no `../../`)
- API payloads: declare as typed constants before passing

## Common PR Review Issues (MUST follow)
1. **Type Safety** — Never use `any`. Declare API payloads as typed constants.
2. **Dead Code** — Remove unused imports, variables, i18n keys.
3. **Naming** — Getters: `get` prefix. Event handlers: `on` prefix.
4. **Error Handling** — Wrap all API calls in try/catch with loading states.

## Workflow
- Commit at logical milestones — don't accumulate huge changes
- Use screenshots for debugging UI issues
```

### What Makes a Great CLAUDE.md

| Do | Don't |
|----|-------|
| Include commands Claude needs to run | Include formatting rules (use a linter) |
| Document non-obvious architecture patterns | Document obvious language features |
| List real PR review pain points | Write a textbook on your stack |
| Keep it under 200 lines | Duplicate your README |
| Extract rules from the last 50-100 PR reviews | Add aspirational rules nobody follows |

### Subdirectory CLAUDE.md

For large projects, place additional CLAUDE.md files in subdirectories. They're loaded lazily when Claude works in that directory:

```
project/
  CLAUDE.md              # Project-wide rules
  packages/
    server/CLAUDE.md     # Server-specific patterns
    client/CLAUDE.md     # Frontend conventions
```

### Global CLAUDE.md — Personal Workflow

`~/.claude/CLAUDE.md` applies to all your projects. Keep it for personal workflow preferences that supplement (never override) project CLAUDE.md:

```markdown
# Personal Workflow Preferences

## Workflow Orchestration

### Ticket-Based Workflow
All non-trivial work follows the skill chain:
/spec → /grill → /plan-work → /grill → /implement → /verify → /pre-review → /ship

Scale-adaptive:
- Features: full chain
- Bug fixes: skip spec, lightweight plan
- Hotfixes: inline plan, direct fix

### Spec-First Principle
- Start every ticket with /spec unless it's a trivial fix
- The spec is the single source of truth
- Never assume requirements — ask if unclear

### Self-Improvement Loop
- After ANY correction: update auto memory with the pattern
- If corrected on something from memory, update the incorrect entry immediately

## Context Management
- Commit frequently at logical milestones
- When context is ~50% consumed, summarize key decisions before compaction
- Use subagents for heavy research to keep main context clean
- Re-read spec and plan files after context compaction
```

---

## Part 3: Plugins — Instant Capabilities

Plugins are the fastest way to level up Claude Code. One install command gives you pre-built agents, MCP servers, and skills from the official registry.

### The Official Plugin Registry

```bash
claude plugins:browse anthropics/claude-plugins-official
```

The `anthropics/claude-plugins-official` registry currently has **56 plugins** covering code review, frontend design, browser automation, ML workflows, and more.

### Installing Plugins

```bash
# Browse available plugins
claude plugins:browse

# Install a specific plugin
claude plugins:install context7

# List what you have
claude plugins:list
```

Each plugin can contribute one or more of:
- **Skills** — Slash commands (e.g., `/review-pr`, `/frontend-design`)
- **Agents** — Specialized subagents for parallel work (e.g., code-reviewer, code-simplifier)
- **MCP Servers** — External tool integrations (e.g., Playwright for browser testing, Context7 for live documentation)

### Recommended Plugin Stack

Here's a practical plugin set organized by workflow stage:

| Stage | Plugin | What It Adds |
|-------|--------|-------------|
| **Research** | `context7` | Live documentation lookup — pulls version-specific docs into context |
| **Development** | `feature-dev` | Agents for codebase exploration, architecture design, and quality review |
| **Development** | `superpowers` | Core skill library — TDD, debugging, collaboration patterns |
| **Quality** | `code-review` | Multi-agent PR review with confidence-based scoring |
| **Quality** | `pr-review-toolkit` | Specialized review agents for comments, tests, error handling, type design |
| **Quality** | `code-simplifier` | Simplifies code for clarity while preserving functionality |
| **Testing** | `playwright` | Browser automation and E2E testing via Microsoft's MCP server |
| **Shipping** | `commit-commands` | Streamlined git commit, push, and PR creation |
| **Automation** | `ralph-loop` | Autonomous iteration loops — Claude refines work across multiple cycles until done |
| **Maintenance** | `claude-md-management` | Audit and improve CLAUDE.md files across repos |

### Plugin Usage Examples

**context7** — Pull live, version-specific docs into context instead of relying on training data:
```
> How do I set up middleware in Express 5?
# Claude automatically fetches current Express 5 docs via Context7 MCP server
# instead of hallucinating outdated API signatures
```

**feature-dev** — Three specialized agents for different development phases:
```
> /feature-dev                              # Guided feature development with architecture focus
# Internally dispatches:
#   code-explorer agent  → traces execution paths, maps dependencies
#   code-architect agent → designs implementation blueprint with specific files
#   code-reviewer agent  → reviews for bugs, security, and code quality
```

**superpowers** — Core process skills that override default Claude behavior:
```
> /superpowers:brainstorming                # MUST run before any creative/feature work
> /superpowers:systematic-debugging         # Run before proposing any fix
> /superpowers:test-driven-development      # Write tests before implementation code
> /superpowers:dispatching-parallel-agents  # Run 2+ independent tasks concurrently
```

**code-review** — Multi-agent PR review with confidence-based filtering:
```
> /code-review 142                          # Review PR #142
# Dispatches specialized agents in parallel, each reviewing for different concerns
# Only surfaces high-confidence findings — no noise
```

**pr-review-toolkit** — Specialized review agents you can invoke individually:
```
> /pr-review-toolkit:review-pr             # Full review using all specialized agents
# Includes: code-reviewer, comment-analyzer, code-simplifier,
#           type-design-analyzer, pr-test-analyzer, silent-failure-hunter
```

**code-simplifier** — Refine recently modified code for clarity:
```
> /simplify                                # Reviews changed code for reuse, quality, efficiency
# Focuses on recently modified files — doesn't touch stable code
# Preserves all functionality while improving readability
```

**playwright** — Browser automation and E2E testing via MCP server:
```
> Navigate to localhost:3000 and test the login flow
# Claude controls a real browser: clicks, fills forms, takes screenshots
# Useful for visual debugging and automated E2E test creation
```

**commit-commands** — Streamlined git workflow:
```
> /commit                                  # Stage + commit with conventional message
> /commit-push-pr                          # Commit, push, and open PR in one command
> /clean_gone                              # Remove local branches deleted on remote
```

**ralph-loop** — Autonomous iteration where Claude keeps refining until a task is complete:
```
> /ralph-loop "Build a REST API with full CRUD for users. Tests must pass. DONE when all endpoints work."
# Claude works iteratively — fixes test failures, refines code, re-runs checks
# Each cycle sees all previous work, creating a feedback loop
# Stops automatically when completion criteria are met
> /cancel-ralph                            # Stop the loop early if needed
```

**claude-md-management** — Keep your CLAUDE.md files healthy:
```
> /claude-md-improver                      # Audit all CLAUDE.md files, rate quality, fix issues
> /revise-claude-md                        # Update CLAUDE.md with learnings from this session
```

---

## Part 4: Custom Skills — The Spec-to-Ship Workflow

Plugins give you general capabilities. **Custom skills** encode your team's specific workflows. They're slash commands that live at `~/.claude/skills/<name>/SKILL.md`.

Here's the workflow chain I use for every ticket:

### The Full Chain

```
/spec → /grill (auto) → /plan-work → /grill (auto) → /implement → /verify → /pre-review → /ship
```

Not every task needs the full chain. The workflow adapts to scale:

| Task Type | Workflow |
|-----------|----------|
| **New feature** | Full chain — spec → grill → plan → grill → implement → verify → pre-review → ship |
| **Major enhancement** | Full chain |
| **Minor enhancement** | Light spec → plan (single file) → implement → verify → pre-review → ship |
| **Bug fix** | Bug spec or skip → plan → implement → verify → ship |
| **Hotfix** | Inline plan → implement → verify → ship |

### Ticket Directory Structure

Every ticket gets its own `ai/<ticket-no>/` directory:

```
ai/TICKET-146/
├── requirements/
│   ├── original-requirement.md    # User's raw requirement (verbatim)
│   ├── spec.md                    # Clarified technical spec
│   └── grill-log.md              # Spec review findings
├── plans/
│   ├── overview.md               # High-level implementation plan
│   ├── phase-1-data-model.md     # Detailed phase plan
│   ├── phase-2-api.md
│   └── grill-log.md              # Plan review findings
└── tests/
    └── manual-test-cases.csv
```

### `/spec` — Requirements to Technical Spec

The entry point for all ticket work. Claude reviews the codebase, asks clarification questions, writes a structured spec, then auto-grills it.

```markdown
# Spec: TICKET-146 — Bulk Enrollment System

**Status:** Grilled | Approved
**Original Requirement:** See `original-requirement.md`

## Overview
Allow admins to enroll multiple students into a course batch at once,
with fee calculation and payment tracking per student.

## Clarifications
1. **Q:** Does this include partial payment support?
   **A:** Yes, students can pay in installments.

## Functional Requirements

### FR-1: Bulk student selection
- **Description:** Admin selects multiple students from a searchable list
- **Acceptance criteria:**
  - [ ] Search by name, email, or phone
  - [ ] Select/deselect individual students
  - [ ] Select all matching search results
- **Affected modules:** server/enrollment, client/admin/enrollment

## Change Log
| Date | Section Changed | What Changed | Why |
|------|----------------|--------------|-----|
```

The Change Log is key — specs evolve during planning and implementation as new insights surface. Track changes instead of pretending the spec was perfect from day one.

### `/grill` — The Hard Critic

A skeptical staff engineer reviews every spec and plan through 7 lenses:

1. **Completeness** — Are requirements testable? What happens on error?
2. **Security** — Auth gaps? Input validation? Data exposure?
3. **Architecture** — Does this follow existing patterns? Scalability?
4. **Data Integrity** — Migration safety? Rollback plan?
5. **Project Impact** — Which packages are affected? Breaking changes?
6. **Testing Gaps** — Missing negative tests? Race conditions?
7. **Assumptions** — What if they're wrong?

Each finding gets a severity:

| Severity | Action |
|----------|--------|
| **BLOCKER** | Must fix before proceeding |
| **CRITICAL** | Should fix before proceeding |
| **MAJOR** | Strongly recommend fixing |
| **MINOR** | Consider fixing |
| **NOTE** | Informational |

Verdict: **PASS** / **PASS WITH CONDITIONS** / **NEEDS REWORK** / **REJECT**

### `/plan-work` — Phase-by-Phase Planning

Reads the approved spec, creates an overview plan plus detailed phase files, then auto-grills the plan. Each phase traces back to specific spec requirements — no orphan work.

```markdown
# Phase 1: Data Model & Types

**Spec Requirements Covered:** FR-1, FR-2

## Changes

### File: packages/types/src/enrollment/IBulkEnrollment.ts
- **Action:** Create
- **What:** Interface for bulk enrollment request/response
- **Why:** FR-1 needs typed student selection data

### File: packages/dto/src/enrollment/BulkEnrollmentDto.ts
- **Action:** Create
- **What:** Validation schema for bulk enrollment API
- **Why:** FR-2 requires validated fee calculations

## Verification Steps
- [ ] Type check passes after creating types
- [ ] DTO validates correctly with test data
```

### `/implement` — Build with Guardrails

Follows the plan phase by phase. The key addition: **mid-implementation discovery handling**.

During implementation, you discover things the spec didn't anticipate. Instead of stopping or ignoring it:

- **Minor** (doesn't change scope): Note it, continue, mention in checkpoint summary
- **Moderate** (changes approach, same scope): Inform user, update phase plan, continue
- **Significant** (changes scope): STOP, update spec's Change Log, optionally re-grill

Plus a mandatory spec alignment review at ~50% completion — catching drift early is 10x cheaper than catching it at the end.

### `/verify` → `/pre-review` → `/ship`

The finishing workflow:

- **`/verify`** — Auto-detect project type, run type check + lint, rebuild shared packages if needed
- **`/pre-review`** — Check every change against CLAUDE.md standards AND the original spec. Walk through each FR and confirm its acceptance criteria are met. No spec gap goes unnoticed.
- **`/ship`** — Branch management, staged commits (never `git add -A`), and PR creation with summary + test plan

### Skill Usage Examples

Here's what the skill chain looks like in practice:

**`/spec`** — Start a new ticket:
```
> /spec
# Claude asks: "What's the requirement? Paste the ticket or describe the feature."
> Allow admins to bulk-enroll students into a course batch
# Claude asks clarification questions, then writes spec to ai/TICKET-146/requirements/spec.md
# Auto-grills the spec and presents findings
```

**`/plan-work`** — Plan implementation after spec approval:
```
> /plan-work
# Claude reads the approved spec, creates phased plan files
# Each phase maps back to specific spec requirements (FR-1, FR-2, etc.)
# Auto-grills the plan — catches missing error handling, auth gaps, etc.
```

**`/implement`** — Execute the plan:
```
> /implement
# Claude follows plan phase by phase
# After each phase: runs type check, reports progress
# At ~50%: does a spec alignment review — catches drift early
# Discoveries are handled by severity (minor → note, major → update plan, significant → STOP)
```

**`/verify` → `/pre-review` → `/ship`** — Finish and ship:
```
> /verify
# Runs type check + lint, rebuilds shared packages if needed

> /pre-review
# Walks through every spec FR and confirms acceptance criteria are met
# Checks all changes against CLAUDE.md coding standards

> /ship
# Creates branch, stages specific files (never git add -A), opens PR
```

### Building Your Own Skills

A skill is just a `SKILL.md` file with optional YAML frontmatter:

```markdown
---
name: my-skill
description: Short description for trigger matching. Include trigger phrases
  like "when the user says X" to help Claude know when to invoke this skill.
---

# Skill Title

## When to Use
- [Trigger conditions]

## Process
### Step 1: [Name]
[Instructions Claude follows]

### Step 2: [Name]
[More instructions]

## Rules
- [Hard constraints]
```

**Tips for effective skills:**
- Write them as instructions TO Claude, not documentation ABOUT a process
- Include trigger phrases in the description for better auto-detection
- Add cross-references: "Next skill: `/implement`"
- Keep each skill focused — one workflow, one skill

### Plugins vs. Custom Skills

| | Custom Skills | Plugins |
|-|---------------|---------|
| **Location** | `~/.claude/skills/` | Managed by Claude Code CLI |
| **Scope** | Your personal workflows | Shared community workflows |
| **Updates** | Manual edits | `plugins:update` |
| **Best for** | Team-specific processes (spec-to-ship chain) | General-purpose tooling (code review, testing) |

**Use both.** Plugins handle general capabilities. Custom skills handle your specific workflow orchestration. The spec-to-ship chain works alongside plugins — `/implement` can leverage the `feature-dev` plugin's agents, and `/pre-review` benefits from `code-review` and `pr-review-toolkit`.

---

## Part 5: Auto-Invocation — Skills & Plugins That Trigger Themselves

Both custom skills and plugin-provided skills are **auto-invocable by default**. Claude reads each skill's `description` field and automatically invokes it when your request matches — no slash command needed.

Say *"this test is failing, fix it"* and Claude auto-invokes the `systematic-debugging` skill. Say *"let's build a new dashboard"* and `brainstorming` triggers first. Say *"review PR #142"* and the `code-review` plugin kicks in.

For skills with side effects (deploying, committing), disable auto-invocation in the frontmatter:

```yaml
---
name: deploy
description: Deploy to production
disable-model-invocation: true
---
```

**Tip:** Write specific descriptions with trigger phrases — *"Use when encountering any bug or test failure"* works far better than *"Helps with code"*.

---

## Part 6: Auto Memory — Cross-Session Intelligence

Claude Code automatically maintains a persistent memory directory per project (`MEMORY.md`). The first 200 lines are loaded into every conversation — no setup required.

Claude uses this to store stable patterns, user preferences, and project context it discovers across sessions. When you correct Claude, it updates memory automatically so the same mistake doesn't repeat.

**You don't need to configure anything.** Just be aware it exists — if Claude remembers something wrong, tell it to forget or correct it, and it will update the memory file.

---

## Part 7: Hooks — Automated Quality Gates

Hooks run automatically at lifecycle events. Configure in settings.json:

### Pre-Commit Lint Guard

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "If this is a git commit command, verify that lint and type-check have been run. If not, block with: 'Run lint and type-check before committing.'"
          }
        ]
      }
    ]
  }
}
```

### Notification When Claude Needs Input

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

---

## Part 8: Putting It All Together

### New Project Setup (5 Minutes)

1. **Create CLAUDE.md** — Commands, architecture, coding standards, PR review rules
2. **Create `.claude/settings.example.json`** — Project-specific deny list (config files, .env, node_modules)
3. **Add to `.gitignore`**: `.claude/*` and `!.claude/*.example*`
4. **Ensure `~/.claude/settings.json`** has the global security deny list
5. **Install plugins** — `claude plugins:install context7 superpowers code-review commit-commands`

### How the Layers Work in Practice

```
Claude tries to read .env.local
  → Project deny: "Read(.env.*)" → BLOCKED

Claude tries to install lodash
  → Ask: "Bash(pnpm add:*)" → Prompts you → You approve or deny

Claude tries to force push
  → Global deny: "Bash(git push --force:*)" → BLOCKED (even with --dangerously-skip-permissions)

Claude tries to read a component file
  → Allow: "Read" → AUTO-APPROVED

You say "this test is failing"
  → Auto-invocation: systematic-debugging skill triggers automatically
```

### Quick Reference

| File | Shared? | Purpose |
|------|---------|---------|
| `~/.claude/settings.json` | No | Global security (OS-level deny list) |
| `~/.claude/CLAUDE.md` | No | Personal workflow preferences |
| Plugins (via CLI) | No | Pre-built agents, MCP servers, and skills |
| `~/.claude/skills/*/SKILL.md` | No | Reusable slash commands |
| `.claude/settings.json` | Yes | Team project permissions |
| `CLAUDE.md` | Yes | Team coding standards |
| `CLAUDE.local.md` | No | Personal project preferences |

---

## The Takeaway

The best Claude Code setup follows one principle: **layer your configuration by scope and shareability.**

- **Global settings** protect your system everywhere — secrets, credentials, destructive commands
- **Project settings** protect project-specific resources — config files, build artifacts
- **CLAUDE.md** encodes team standards that every session follows
- **Plugins** add instant capabilities — code review, browser testing, documentation lookup
- **Custom skills** encode your team's specific workflows — from spec writing to PR creation
- **Auto-invocation** makes both plugins and skills trigger automatically when relevant
- **Memory** captures lessons so Claude gets smarter across sessions
- **Hooks** automate quality gates you'd otherwise forget

The spec-to-ship workflow isn't about adding bureaucracy. It's about front-loading the thinking so implementation is mostly mechanical. A grilled spec catches the bug that would have taken a day to debug. A phased plan prevents the "I changed 47 files and nothing type-checks" disaster.

Configure once. Benefit on every session, every project, every team member.

---

**End:**
- [Website](https://encryptioner.github.io)
- [LinkedIn](https://www.linkedin.com/in/mir-mursalin-ankur)
- [GitHub](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)
- [Nerddevs](https://nerddevs.com/author/ankur/)
