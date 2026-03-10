# Claude Code Configuration Blueprint: Security, Skills, and Settings for Production Teams

> Configure Claude Code once — get security, reusable workflows, and cross-session intelligence across every project.

---

## Who This Is For

You've used Claude Code on a project or two. You know the basics. Now you want to:

- Stop Claude from touching secrets, credentials, or system files
- Share team standards via git without leaking personal preferences
- Create reusable workflows (spec, plan, implement, review, ship)
- Make Claude remember lessons across sessions

This guide gives you copy-paste configs and explains the **why** behind each decision.

---

## The Configuration Layers

Claude Code loads configuration from multiple layers, each with a specific scope:

```
Personal (not in any repo):
  ~/.claude/settings.json        → Security (deny list for all projects)
  ~/.claude/CLAUDE.md            → Personal workflow preferences
  ~/.claude/skills/*/SKILL.md    → Reusable slash commands

Team-shared (committed to git):
  .claude/settings.json          → Project permissions
  CLAUDE.md                      → Coding standards, architecture

Personal overrides (gitignored):
  .claude/settings.local.json    → Your project overrides
  CLAUDE.local.md                → Your project preferences
```

**Key rule:** Your project CLAUDE.md must be self-contained. Teammates don't have your global skills or personal CLAUDE.md, so project files can't depend on them. Think of it this way: global files are your personal toolkit, project files are the team playbook.

---

## Part 1: Security — The Permission System

Permissions follow a strict hierarchy: **Deny** (always blocks, even with `--dangerously-skip-permissions`) → **Ask** (prompts you) → **Allow** (auto-approved). Deny always wins — this is what makes the system trustworthy.

### Pattern Syntax

Before diving into the config, understand how patterns match:

```
Bash(exact command)       → matches only that exact command
Bash(command *)           → matches command with any arguments (space before *)
Bash(command:*)           → matches command variations (colon prefix)
Read(path/to/file)        → matches exact file
Read(path/**/*.json)      → matches glob pattern
Read(~/.ssh/**)           → ~ expands to home directory on any OS
```

**Space matters:** `Bash(ls *)` matches `ls -la` but NOT `lsof`. `Bash(ls*)` matches both.

### Global Settings (`~/.claude/settings.json`)

This protects you across ALL projects:

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
      "Bash(pnpm install:*)", "Bash(pnpm add:*)",
      "Bash(docker:*)", "Bash(curl:*)", "Bash(ssh:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)", "Bash(sudo:*)", "Bash(chmod:*)",
      "Bash(git push --force:*)", "Bash(git reset --hard:*)",
      "Read(.env)", "Read(.env.*)", "Write(.env)", "Write(.env.*)",
      "Edit(.env)", "Edit(.env.*)",
      "Read(~/.ssh/**)", "Read(~/.aws/**)", "Read(~/.gnupg/**)",
      "Read(~/.npmrc)", "Read(~/.docker/config.json)",
      "Read(~/Library/Keychains/**)",
      "Read(~/Library/Application Support/Google/Chrome/Default/Login Data*)",
      "Read(~/.local/share/keyrings/**)",
      "Read(/mnt/c/Users/*/AppData/Local/Google/Chrome/User Data/Default/Login Data*)",
      "Bash(kill -9:*)", "Bash(shutdown:*)", "Bash(reboot:*)"
    ]
  }
}
```

#### Why These Specific Rules?

| Tier | Category | Rationale |
|------|----------|-----------|
| **Allow** | Read/Edit/Write/Glob/Grep | Core tools Claude needs constantly — would be annoying to approve every time |
| **Allow** | Read-only git (`status`, `diff`, `log`) | Safe — no mutations, just information |
| **Allow** | `nvm`, `node`, `ls` | Basic operations that never cause harm |
| **Ask** | `git push/commit/merge` | Affects remote state — you want to know before this happens |
| **Ask** | `pnpm install/add` | Modifies dependencies — a new package deserves a glance |
| **Ask** | `docker`, `curl`, `ssh` | Infrastructure and network access |
| **Deny** | `rm -rf`, `sudo`, `chmod` | Destructive system commands |
| **Deny** | `git push --force`, `reset --hard` | Irreversible git operations |
| **Deny** | `.env*` files | Secrets and API keys |
| **Deny** | `~/.ssh`, `~/.aws`, `~/.gnupg` | Credential stores |
| **Deny** | Browser data (Chrome, Firefox) | Login data, cookies, passwords |

**Cross-OS coverage:** The deny list covers macOS (`~/Library/Keychains`), Linux (`~/.local/share/keyrings`, `~/.mozilla`), and Windows WSL (`/mnt/c/Users/*/AppData`). One global config works on any machine.

### Project Settings (`.claude/settings.example.json`)

Team members copy this to `.claude/settings.json`. Only project-specific rules — OS security is handled globally:

```json
{
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Glob", "Grep",
      "Bash(pnpm build:*)", "Bash(pnpm lint:*)", "Bash(pnpm test:*)"
    ],
    "deny": [
      "Read(.env)", "Read(.env.*)", "Write(.env)", "Write(.env.*)",
      "Read(src/configs/server.config.json)",
      "Read(node_modules/**)", "Read(dist/**)"
    ]
  }
}
```

Add to `.gitignore`: `.claude/*` and `!.claude/*.example*` — this shares the example but keeps each developer's actual settings private.

If your project has config files with secrets (AWS keys, database URLs), add them to the project deny list:

```json
"Read(src/configs/aws.config.json)",
"Read(src/certs/*.pem)"
```

---

## Part 2: CLAUDE.md — Teaching Claude Your Codebase

This is the most impactful file in your repo. A well-written CLAUDE.md turns Claude from a generic assistant into a team member who knows your conventions, your pain points, and your architecture.

### The Instruction Budget Problem

Here's something most people don't realize: frontier LLMs reliably follow roughly **150–200 instructions** total. Claude Code's own system prompt already consumes about 50 of those slots — a third of your budget — before your CLAUDE.md even loads.

Worse, instruction degradation is **uniform**. As instruction count rises, quality drops across ALL instructions, not just the newer ones. This means every low-value rule you add actively makes your high-value rules less likely to be followed.

Claude Code even injects this system reminder alongside your CLAUDE.md:

> *"IMPORTANT: this context may or may not be relevant to your tasks."*

The more irrelevant content you include, the more likely Claude downgrades everything. So brevity isn't just nice — it directly affects instruction compliance.

### The Template

Write it for Claude, not for humans. Don't duplicate your README. Focus on what Claude needs to produce code that passes your PR review on the first try.

```markdown
# CLAUDE.md

## Commands
- `pnpm dev` — Start development server
- `pnpm build` — Production build
- `pnpm lint-fix` — Lint and fix all packages

## Project Context
[One paragraph: what this does, who uses it, key business features]

## Architecture Overview
- `packages/client` — Vue 3 frontend
- `packages/server` — Express API
- `packages/shared` — Types, DTOs, utilities

## Coding Standards
- TypeScript strict mode, no `any` types
- Absolute imports only (no `../../`)
- API payloads: declare as typed constants before passing

## Common PR Review Issues (MUST follow)
1. **Type Safety** — Never use `any`. Typed constants for API payloads.
2. **Dead Code** — Remove unused imports, variables, i18n keys.
3. **Naming** — Getters: `get` prefix. Event handlers: `on` prefix.
4. **Error Handling** — Wrap all API calls in try/catch with loading states.

## Critical Gotchas (things Claude consistently gets wrong)
- Never use relative imports — always absolute paths
- Always update BOTH language files for i18n changes
- Always use projection in DB queries — never fetch entire documents
- Server error messages MUST come from constant files
```

The "Critical Gotchas" section is especially valuable. Every team has patterns that Claude gets wrong repeatedly. Document them explicitly and Claude stops making those mistakes.

### Progressive Disclosure: Keep CLAUDE.md Lean

For larger projects, don't stuff everything into CLAUDE.md. Use a **progressive disclosure** pattern — put detailed docs in a separate directory and tell Claude where to find them:

```markdown
## Detailed Documentation
When working on specific areas, read the relevant doc first:
- `docs/Agent/database_schema.md` — Data model and relationships
- `docs/Agent/payment_flow.md` — Payment gateway integration details
- `docs/Agent/testing.md` — Test patterns and conventions
```

Claude reads these on-demand when the task is relevant, instead of loading everything upfront. This keeps your instruction count low while still having depth available.

**Prefer pointers to copies.** Don't paste code snippets into documentation files — they go stale. Reference `file:line` instead.

### What Works vs. What Doesn't

| Do | Don't |
|----|-------|
| Include commands Claude needs to run | Include formatting rules (use a linter + hooks) |
| Document non-obvious patterns | Document obvious language features |
| List real PR review pain points | Write a textbook on your stack |
| Keep it under 200 lines | Duplicate your README |
| Include critical gotchas from real sessions | Include aspirational rules nobody follows |

### Never Auto-Generate CLAUDE.md

Don't use `/init` or let an LLM write your CLAUDE.md. This file is the highest-leverage point of Claude Code — a bad line cascades into bad plans, bad code, and bad artifacts across every session. LLMs already learn style from existing code in context (in-context learning). What they can't learn on their own is your team's non-obvious patterns, PR review preferences, and architectural boundaries. Those need human judgment.

For large projects, place CLAUDE.md files in subdirectories — they're loaded lazily when Claude works in that directory, so you get package-specific rules without bloating the root file.

---

## Part 3: Plugins — Instant Capabilities

Plugins are pre-built packages from the community. One install command gives you agents, MCP servers, and skills — no configuration needed.

```bash
claude plugins:install context7 superpowers code-review commit-commands
```

### Recommended Stack

| Stage | Plugin | What It Does |
|-------|--------|-------------|
| **Research** | `context7` | Live, version-specific documentation lookup |
| **Development** | `feature-dev` | Codebase exploration + architecture design agents |
| **Development** | `superpowers` | TDD, debugging, brainstorming, parallel agent dispatch |
| **Quality** | `code-review` | Multi-agent PR review with confidence-based scoring |
| **Quality** | `code-simplifier` | Refine code for clarity while preserving functionality |
| **Testing** | `playwright` | Browser automation and E2E testing |
| **Shipping** | `commit-commands` | Streamlined git commit, push, and PR creation |
| **Automation** | `ralph-loop` | Autonomous iteration — Claude keeps refining until done |
| **Maintenance** | `claude-md-management` | Audit and improve CLAUDE.md files |

### Plugin Usage Example

With `context7` installed, instead of asking Claude a question and getting an answer based on its training data (which may be outdated), you can ask:

```
"How do I set up middleware in Express 5? Use context7 for the latest docs."
```

Claude fetches the current, version-specific documentation and answers based on that — not its training cutoff. Similarly, `code-review` doesn't just read your diff — it spawns multiple review agents that each focus on different aspects (security, performance, correctness) and merge their findings with confidence scores.

### Plugins vs. Custom Skills

Both are invoked the same way (slash commands or auto-invocation), but they serve different purposes:

| | Plugins | Custom Skills |
|---|---------|---------------|
| **Source** | Community marketplace | Your `~/.claude/skills/` directory |
| **Scope** | General capabilities (docs lookup, code review) | Your team's specific workflows (spec-to-ship) |
| **Install** | `claude plugins:install <name>` | Create a `SKILL.md` file |
| **Shared** | Per-user installation | Per-user (global) or per-project |
| **Complexity** | Can include MCP servers, agents, multiple skills | Single `SKILL.md` + optional reference files |

Think of plugins as off-the-shelf tools and custom skills as your team's playbook encoded for Claude.

---

## Part 4: Custom Skills — Building a Spec-to-Ship Workflow

Custom skills encode your team's specific workflows. They live at `~/.claude/skills/<name>/SKILL.md` and are available across all your projects.

### The Workflow Chain

The real power of skills comes from chaining them into a complete development workflow:

```
/scope (optional) → /spec → /grill (auto) → /plan-work → /grill (auto) → /implement → /verify → /pre-review → /ship
```

Not every task needs the full chain. The workflow adapts to what you're building:

| Task Type | Workflow |
|-----------|----------|
| **New product** | `/scope` → full chain |
| **Feature** | Full chain |
| **Minor enhancement** | Light spec → plan → implement → verify → ship |
| **Bug fix** | Bug spec or skip → plan → implement → verify → ship |
| **Hotfix** | Inline plan → implement → verify → ship |

This is a key insight: **the ceremony scales with the risk**. A new product needs scoping and a full spec. A hotfix just needs a quick plan and verification.

### The Skills in Detail

**`/scope`** — Rapid product scoping, designed for the moment before a spec. Asks one forcing question: *"If this app could only do ONE thing, what would it be?"* That answer is v1 — everything else is v2. Maps the user journey in 4 steps max, identifies cost drivers (real-time features, third-party integrations, custom AI — the three things that make apps expensive), and produces a one-page scope document. Use for new products or when evaluating client projects.

**`/spec`** — The starting point for most tickets. Claude reviews the codebase, asks clarification questions, and writes a structured spec with functional requirements and acceptance criteria. The spec includes a **Change Log** — a section that tracks what changed and why during implementation. This is critical because requirements always shift mid-build. Instead of letting the spec become stale, the Change Log keeps it as the single source of truth throughout the ticket's lifecycle.

**`/grill`** — The hard critic, and arguably the most valuable skill in the chain. It reviews every spec and plan through 7 lenses: completeness, security, architecture, data integrity, project impact, testing gaps, and assumptions. Each finding gets a severity level:

- **BLOCKER** — Must fix before proceeding. Will cause production issues.
- **CRITICAL** — Significant risk. Should fix before implementation.
- **WARNING** — Potential issue. Address during implementation.
- **NOTE** — Observation or improvement suggestion.

The whole review gets a verdict: **PASS**, **NEEDS REWORK**, or **REJECT**. This is auto-invoked by `/spec` and `/plan-work` at their checkpoints — you don't have to remember to run it. The idea is simple: catch the bug in the spec, not in production.

**`/plan-work`** — Transforms the approved spec into a phase-by-phase implementation plan. Each phase traces back to specific spec requirements — no orphan work, no "why did we build this?" confusion. Creates an overview file plus detailed phase files (e.g., `phase-1-data-model.md`, `phase-2-api-endpoints.md`). Auto-grills the plan before presenting it.

**`/implement`** — Executes the plan phase by phase with incremental type checking after each logical group of changes. The most important feature is **mid-implementation discovery handling**. During development, you always discover things the spec didn't anticipate. Instead of ignoring them or stopping everything, the skill handles discoveries at three tiers:

- **Minor** — Note and continue. Example: a utility function needs a small refactor.
- **Moderate** — Update the plan, inform the user, continue. Example: an API endpoint needs a different response shape than originally planned.
- **Significant** — STOP. Update the spec's Change Log, re-grill, get approval. Example: a core assumption was wrong and the data model needs restructuring.

It also runs a **spec alignment review at ~50% completion** — a proactive check that what you're building still matches what was specified, before you're too deep to course-correct cheaply.

**`/verify`** → **`/pre-review`** → **`/ship`** — The finishing chain. Verify runs type check + lint. Pre-review walks through every spec requirement, confirming each acceptance criterion is met — this catches the gaps that "it compiles" doesn't reveal. Ship handles branch management, staged commits, PR creation, and captures learnings to auto-memory for future sessions.

**`/ui-design-brain`** — A specialized skill with a 60+ component reference file covering real design-system patterns (Accordion, Breadcrumb, Data Table, Modal, Toast — the full set from component.gallery). Instead of generic AI aesthetics, Claude consults documented patterns with best practices and common layouts. This shows that skills can include supporting reference files alongside SKILL.md, making them as rich as needed.

### Ticket Directory Structure

Every ticket gets its own `ai/<ticket-no>/` directory, keeping all AI-generated artifacts organized and version-controlled:

```
ai/TICKET-146/
├── requirements/
│   ├── original-requirement.md    # Raw requirement (verbatim)
│   ├── spec.md                    # Clarified technical spec
│   └── grill-log.md              # Review findings
├── plans/
│   ├── overview.md               # High-level plan
│   ├── phase-1-data-model.md     # Detailed phase plan
│   └── grill-log.md              # Plan review findings
└── tests/
    └── manual-test-cases.csv
```

This structure makes work **resumable across sessions**. If Claude loses context (after compaction) or you start a new session, it reads the spec and plan files to pick up exactly where you left off. The grill logs capture the reasoning behind decisions, so future sessions don't re-debate settled questions.

### Building Your Own Skills

A skill is a `SKILL.md` file with optional YAML frontmatter:

```markdown
---
name: my-skill
description: Short description with trigger phrases like "when the user
  says X" so Claude knows when to auto-invoke this skill.
---

# Skill Title

## When to Use
- [Trigger conditions]

## Process
### Step 1: [Name]
[Instructions Claude follows]

## Rules
- [Hard constraints]
```

Three tips for effective skills:

1. **Write instructions TO Claude**, not documentation ABOUT a process. "Review the spec for missing edge cases" works better than "The developer should review for edge cases."
2. **Include trigger phrases in the description.** "Use when the user says 'plan this', 'how should we approach', or presents a multi-file task" helps Claude activate the skill at the right moment.
3. **Keep each skill focused** — one workflow, one skill. Cross-reference between skills (`After this skill completes, suggest /grill`) to build chains.

---

## Part 5: Auto-Invocation — Skills & Plugins That Trigger Themselves

Both plugins and custom skills support **auto-invocation** — Claude reads the skill's description and triggers it automatically when your request matches. You don't need to remember slash commands.

How it works: when you type a message, Claude scans all available skill descriptions for matching trigger phrases. If your message matches, the skill activates without you typing `/skill-name`.

For example, with the `/grill` skill configured with this description:

```yaml
description: Hard-critic review. Trigger when the user says "grill this",
  "review this plan", "what could go wrong", "poke holes", or "stress test this".
```

Simply saying *"poke holes in this spec"* auto-triggers the grill workflow. Similarly, plugin skills like `context7` activate when you mention looking up documentation.

To make auto-invocation reliable:

- **Be specific with trigger phrases** — vague descriptions lead to false activations
- **Include negative triggers** — "Do NOT use for TDD projects — use /plan-tdd instead" prevents wrong-skill activation
- **Test with natural language** — try asking for the workflow in different ways to verify the description catches them

You can always invoke explicitly with `/skill-name` when auto-invocation doesn't trigger, or when you want a specific skill that wouldn't normally match your phrasing.

---

## Part 6: Hooks — Automated Quality Gates

Hooks run automatically at lifecycle events. They're the safety nets you'd otherwise forget.

Two hook types are available:
- **`prompt`** — Claude evaluates a condition and acts on it (block, remind, warn). The condition check is contextual — Claude decides whether the hook applies.
- **`command`** — Runs a shell command directly (notifications, logging, custom scripts). Always executes.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "prompt",
          "prompt": "If this is a git commit, verify lint and type-check have been run. If not, block with: 'Run lint and type-check before committing.'"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "prompt",
          "prompt": "If the file is TypeScript (.ts, .tsx, .vue) and more than 3 TS files have been edited since the last type-check, remind: 'Consider running type-check before continuing.'"
        }]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "notify-send 'Claude Code' 'Awaiting your input'"
        }]
      }
    ]
  }
}
```

**Why these specific hooks?** The PreToolUse hook prevents commits without lint/type-check — saving a wasted CI cycle. The PostToolUse hook catches the "I changed 47 TypeScript files and nothing type-checks" disaster by nudging you to verify incrementally. Note the matcher uses `Write|Edit` but the prompt checks for TypeScript file extensions — this way it doesn't nag when you're editing markdown or JSON. The Notification hook is simple but practical: a desktop alert when Claude needs input, so you can context-switch away while it works.

**Use hooks instead of CLAUDE.md for linting rules.** LLMs are expensive and slow compared to linters. Instead of writing "always format with Prettier" in CLAUDE.md (wasting an instruction slot), add a hook that runs the formatter automatically after edits. This frees up your instruction budget for things only CLAUDE.md can teach — like your team's architectural patterns.

---

## Part 6: Auto Memory — Cross-Session Intelligence

Claude Code maintains a persistent memory directory per project at `~/.claude/projects/<project-path>/memory/`. The `MEMORY.md` file (first 200 lines) loads into every conversation automatically — no manual setup needed.

Claude updates this file on its own as it learns your project: architectural patterns, common mistakes, file paths that matter. You can also instruct Claude to remember something explicitly (*"always use bun instead of npm"*) and it writes to memory. The `/ship` skill captures learnings at the end of each ticket automatically, so memory grows organically across sessions.

---

## Part 7: Putting It All Together

### New Project Setup (5 Minutes)

1. Create `CLAUDE.md` — commands, architecture, coding standards, PR review rules, critical gotchas
2. Create `.claude/settings.example.json` — project-specific deny list
3. Add to `.gitignore`: `.claude/*` and `!.claude/*.example*`
4. Ensure `~/.claude/settings.json` has the global security deny list
5. Install plugins: `claude plugins:install context7 superpowers code-review`

### How the Layers Work in Practice

```
"Read .env.local"             → Project deny  → BLOCKED
"pnpm add lodash"             → Ask rule      → Prompts you
"git push --force"            → Global deny   → BLOCKED (even with --dangerously-skip-permissions)
"Read src/components/App.vue" → Allow         → AUTO-APPROVED
"This test is failing"        → Auto-invoke   → debugging skill triggers
```

### Quick Reference

| File | Shared? | Purpose |
|------|---------|---------|
| `~/.claude/settings.json` | No | Global security (deny list) |
| `~/.claude/CLAUDE.md` | No | Personal workflow preferences |
| `~/.claude/skills/*/SKILL.md` | No | Custom slash commands |
| Plugins (via CLI) | No | Pre-built agents + skills |
| `.claude/settings.json` | Yes | Team project permissions |
| `CLAUDE.md` | Yes | Team coding standards |
| `~/.claude/projects/*/memory/` | No | Cross-session memory |

---

## The Takeaway

Layer your configuration by scope and shareability:

- **Global settings** protect your system — secrets, credentials, destructive commands
- **Project settings** protect project resources — config files, build artifacts
- **CLAUDE.md** encodes team standards every session follows (keep it under 200 lines — every low-value instruction degrades high-value ones)
- **Plugins** add instant capabilities — code review, testing, documentation
- **Custom skills** encode your specific workflows — scope to ship
- **Hooks** automate quality gates (and free up CLAUDE.md instruction slots)
- **Memory** captures lessons learned so you don't teach Claude the same thing twice

The spec-to-ship workflow isn't bureaucracy. It's front-loading the thinking so implementation is mechanical. A grilled spec catches the bug that would have taken a day to debug. A phased plan prevents the "I changed 47 files and nothing type-checks" disaster. Mid-implementation discovery handling means your spec stays a living document instead of becoming stale the moment development starts.

Configure once. Benefit on every session, every project, every team member.

---

## References

**Official Documentation:**
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code) — Permissions, hooks, settings, CLAUDE.md, and skills reference
- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) — Official workflow recommendations
- [Permissions Reference](https://code.claude.com/docs/en/permissions) — Permission system deep dive
- [Hooks Reference](https://code.claude.com/docs/en/hooks) — Hook types, matchers, and lifecycle events
- [Skills Reference](https://code.claude.com/docs/en/skills) — Building and configuring custom skills
- [Plugins README](https://github.com/anthropics/claude-code/blob/main/plugins/README.md) — Plugin marketplace and installation
- [Sandbox Configuration](https://code.claude.com/docs/en/sandboxing) — Container-based sandboxing options

**Community Guides:**
- [Writing a Good CLAUDE.md — HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — Instruction-following budgets and progressive disclosure research
- [How to Write a Good CLAUDE.md — Builder.io](https://www.builder.io/blog/claude-md-guide) — Practical CLAUDE.md writing guide
- [Claude Code Customization — alexop.dev](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) — Skills, subagents, and customization walkthrough
- [Claude Code Hooks: Complete Guide — aiorg.dev](https://aiorg.dev/blog/claude-code-hooks) — 20+ hook examples with explanations
- [Claude Code Permissions Guide — eesel.ai](https://www.eesel.ai/blog/claude-code-permissions) — Permission patterns and security setup
- [Claude Code Settings Reference — claudefa.st](https://claudefa.st/blog/guide/settings-reference) — Comprehensive settings documentation

**Referenced Tools:**
- [UI Design Brain Skill](https://github.com/carmahhawwari/ui-design-brain) — 60+ component reference skill for UI generation
- [Component Gallery](https://component.gallery/) — Design system component patterns

---

**End:**
- [Website](https://encryptioner.github.io)
- [LinkedIn](https://www.linkedin.com/in/mir-mursalin-ankur)
- [GitHub](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)
- [Nerddevs](https://nerddevs.com/author/ankur/)
