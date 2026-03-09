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

---

## Part 3: Skills — The Spec-to-Ship Workflow

Skills are slash commands that live at `~/.claude/skills/<name>/SKILL.md`. They encode reusable workflows you trigger when needed. Here's the workflow chain I use for every ticket:

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
ai/BSP-146/
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

### Skill 1: `/spec` — Requirements to Technical Spec

The entry point for all ticket work. Claude reviews the codebase, asks clarification questions, writes a structured spec, then auto-grills it.

```markdown
# Spec: BSP-146 — Bulk Enrollment System

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

### Skill 2: `/grill` — The Hard Critic

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

### Skill 3: `/plan-work` — Phase-by-Phase Planning

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

### Skill 4: `/implement` — Build with Guardrails

Follows the plan phase by phase. The key addition: **mid-implementation discovery handling**.

During implementation, you discover things the spec didn't anticipate. Instead of stopping or ignoring it:

- **Minor** (doesn't change scope): Note it, continue, mention in checkpoint summary
- **Moderate** (changes approach, same scope): Inform user, update phase plan, continue
- **Significant** (changes scope): STOP, update spec's Change Log, optionally re-grill

Plus a mandatory spec alignment review at ~50% completion — catching drift early is 10x cheaper than catching it at the end.

### Skill 5: `/verify` → `/pre-review` → `/ship`

The finishing workflow:

- **`/verify`** — Auto-detect project type, run type check + lint, rebuild shared packages if needed
- **`/pre-review`** — Check every change against CLAUDE.md standards AND the original spec. Walk through each FR and confirm its acceptance criteria are met. No spec gap goes unnoticed.
- **`/ship`** — Branch management, staged commits (never `git add -A`), and PR creation with summary + test plan

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

---

## Part 4: Global CLAUDE.md — Personal Workflow

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

## Part 5: Auto Memory — Cross-Session Intelligence

Claude Code has a persistent memory directory per project. A `MEMORY.md` file (first 200 lines) is loaded into every conversation.

### What to Store

```markdown
# Memory - Project Name

## Project Context
- Monorepo: client, server, shared packages
- Uses Bitbucket (not GitHub) — `gh` CLI won't work for PRs
- Admin repo exists separately — shared types must stay in sync

## Patterns Learned
- Always rebuild shared packages after type changes
- Payment flow: INITIATING → PENDING → VALID/INVALID
- Enrollment has 3 sub-algorithms (Phase1, Phase2, Basic1)

## Workflow
- 13 global skills, full chain: spec → grill → plan → implement → verify → ship
- Directory structure: ai/<ticket-no>/requirements/, plans/, tests/
```

### Memory Rules

| Do | Don't |
|----|-------|
| Store stable patterns confirmed across sessions | Store session-specific context |
| Store user preferences they've explicitly stated | Store speculative conclusions |
| Update immediately when corrected | Store info that duplicates CLAUDE.md |

---

## Part 6: Hooks — Automated Quality Gates

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

## Part 7: Putting It All Together

### New Project Setup (5 Minutes)

1. **Create CLAUDE.md** — Commands, architecture, coding standards, PR review rules
2. **Create `.claude/settings.example.json`** — Project-specific deny list (config files, .env, node_modules)
3. **Add to `.gitignore`**: `.claude/*` and `!.claude/*.example*`
4. **Ensure `~/.claude/settings.json`** has the global security deny list

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
```

### Quick Reference

| File | Shared? | Purpose |
|------|---------|---------|
| `~/.claude/settings.json` | No | Global security (OS-level deny list) |
| `~/.claude/CLAUDE.md` | No | Personal workflow preferences |
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
- **Skills** encode reusable workflows — from spec writing to PR creation
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
