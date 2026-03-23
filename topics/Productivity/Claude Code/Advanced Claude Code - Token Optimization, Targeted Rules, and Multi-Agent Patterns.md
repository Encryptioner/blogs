# Advanced Claude Code: Token Optimization, Targeted Rules, and Multi-Agent Patterns

> You've configured Claude Code. Now make it fast, cheap, and smart across every project you touch.

---

## Who This Is For

You've set up Claude Code — permissions, CLAUDE.md, maybe some skills. It works. But you're noticing:

- Token costs creep up on large codebases
- The same coding rules fire on files where they don't apply
- New projects start with zero protection until you remember to configure them
- You're managing Claude one session at a time instead of as infrastructure
- Your CLAUDE.md is getting bloated with compaction strategies and memory patterns

This guide covers the patterns that emerge after the basics — the ones that separate "configured" from "optimized."

---

## Token Optimization: The Knowledge Graph Approach

The most expensive thing Claude Code does is read files. On a 2,000-file codebase, a code review request might pull in dozens of files — most of them irrelevant to the actual change.

### The Problem

Traditional code review with Claude Code:

```
You: "Review this PR"
Claude: *reads 40 files to understand context*
Claude: *analyzes the 3 files that actually changed*
Result: Good review, 50K+ tokens consumed
```

### code-review-graph — AST-Aware Context Selection

[code-review-graph](https://github.com/tirth8205/code-review-graph) builds a local knowledge graph of your codebase using Tree-sitter AST parsing. Instead of feeding Claude entire files, it identifies the exact functions, classes, and dependencies affected by a change — then sends only that context.

**How it works:**

```
Change detected in auth/login.ts
    → Tree-sitter parses AST
    → Graph identifies: login() calls validateToken() in auth/tokens.ts
    → Graph identifies: login() is called by handleRequest() in routes/api.ts
    → Only these 3 functions (not 3 full files) sent as context
```

**Real benchmarks:**

| Codebase | Files | Token Reduction |
|----------|-------|-----------------|
| httpx | 125 | 26x |
| FastAPI | 2,915 | 8x |
| Next.js | 27,732 | 6x |

The larger the codebase, the bigger the savings — and review quality actually improves because Claude focuses on relevant context instead of drowning in noise.

**Key features:**
- 14 supported languages (Python, TypeScript, Go, Rust, Java, C#, and more)
- Blast-radius analysis — knows exactly which files/functions a change affects
- Incremental updates in under 2 seconds via SHA-256 hash diffing
- Local SQLite storage — no cloud dependency, no data leaving your machine
- Interactive D3.js visualization for exploring dependency graphs

### Global MCP Setup

Install this at the user level so it works across every project:

```bash
claude mcp add --scope user code-review-graph -- npx -y code-review-graph
```

Or add it directly to your MCP configuration:

```json
{
  "mcpServers": {
    "code-review-graph": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "code-review-graph"],
      "_comment": "AST-based knowledge graph — 6-26x token savings on code reviews"
    }
  }
}
```

This is a global tool, not a project-specific one. It indexes whatever codebase you're working in on the fly. No per-project configuration needed.

---

## Targeted Rules: Stop Applying Backend Rules to Frontend Files

Rules in `~/.claude/rules/` support glob matching — but most developers dump everything into one file. The result: Mongoose query patterns load when you're editing a React component. Vue lifecycle warnings fire on a Node.js service.

### The Problem

A single `coding-gotchas.md` with `globs: "*.ts,*.tsx,*.vue,*.js,*.jsx"`:

```markdown
- Never use relative imports — always absolute paths
- Never introduce `any` types
- Always use projection in Mongoose queries
- Server error messages MUST come from constant files
- When deleting Vue components, also remove their i18n keys
```

Claude sees all 5 rules when editing any file. The Mongoose rule wastes an instruction slot when you're working on a Vue component. The Vue rule wastes a slot when you're writing a backend service.

### Split by Domain

```
~/.claude/rules/
├── typescript-general.md    → Universal TS/JS rules
├── mongoose-patterns.md     → Backend/database patterns
└── vue-patterns.md          → Vue-specific conventions
```

**`typescript-general.md`:**

```markdown
---
description: Universal TypeScript/JavaScript rules — all projects
globs: "*.ts,*.tsx,*.vue,*.js,*.jsx"
---

# TypeScript Standards
- Never use relative imports (`../../`) — always absolute paths
- Never introduce `any` types — find or create the proper type
- Prefer named exports over default exports
```

**`mongoose-patterns.md`:**

```markdown
---
description: MongoDB/Mongoose patterns — backend services only
globs: "*.service.ts,*.repository.ts,*.model.ts,*.controller.ts,**/server/**/*.ts,**/api/**/*.ts"
---

# Database Patterns
- Always use projection in Mongoose queries — never fetch entire documents
- Server error messages MUST come from constant files — no inline strings
- Use lean() for read-only queries
- Index fields used in frequent queries
```

**`vue-patterns.md`:**

```markdown
---
description: Vue.js conventions — frontend components only
globs: "*.vue,**/components/**/*.ts,**/composables/**/*.ts,**/stores/**/*.ts"
---

# Vue Conventions
- When deleting Vue components, also remove their i18n keys
- Always update BOTH language files (bn.json + en.json) for i18n changes
- Don't put domain helpers in global `helpers/index.ts` — use the relevant service file
- Use composables for shared logic, not mixins
```

### Why This Matters

Remember the instruction budget problem — Claude reliably follows ~150–200 instructions total. Every irrelevant rule that loads actively degrades the ones that matter. Targeted globs keep only the relevant rules in context.

**Glob tips:**
- `**/server/**/*.ts` targets backend directories regardless of nesting
- `*.service.ts,*.repository.ts` targets files by naming convention
- You can combine path and extension patterns: `**/api/**/*.{ts,js}`
- Test with `claude rules list` to verify which rules load for a given file

### Beyond Coding: Security, Performance, and Git Rules

Domain splitting isn't just for language conventions. Add cross-cutting concern rules:

**`security.md`** — globs: `*.ts,*.tsx,*.js,*.jsx,*.vue,*.py,*.go,*.rs`

```markdown
- Never hardcode secrets, API keys, tokens, or passwords — use environment variables
- Never use eval() or dynamic code execution with user input
- Never construct SQL queries with string concatenation — use parameterized queries
- Sanitize all user input before rendering in HTML (XSS prevention)
```

**`performance.md`** — globs: `*.service.ts,*.repository.ts,*.controller.ts,**/server/**/*.ts`

```markdown
- Never query inside a loop (N+1 problem) — use batch operations
- Use pagination for list endpoints — never return unbounded result sets
- Add database indexes for fields used in frequent queries
```

**`git-workflow.md`** — globs: `*.md,*.ts,*.tsx,*.js,*.jsx,*.vue`

```markdown
- Commit messages: imperative mood, under 72 chars, explain WHY not WHAT
- One logical change per commit — don't mix refactoring with feature work
- Never commit .env files, credentials, or large binary files
```

These rules load only when editing files that match their globs — a security rule fires on code files, a performance rule fires on backend files, a git rule fires broadly but stays lightweight.

---

## Automated Quality Gates: Global Hooks

Rules tell Claude what to do. Hooks **enforce** it automatically. The key to global hooks: they must work on any codebase without per-project configuration.

| Hook | Event | Type | What It Does |
|------|-------|------|-------------|
| **Config Protection** | PreToolUse | prompt | Blocks Claude from modifying linter/formatter configs (.eslintrc, .prettierrc, biome.json). Forces fixing code, not weakening configs. Inspired by [everything-claude-code](https://github.com/affaan-m/everything-claude-code). |
| **TypeScript Type-Check** | PostToolUse | command | Runs `tsc --noEmit` asynchronously after editing `.ts/.tsx` files. Errors appear in context. |
| **Console.log Warning** | PostToolUse | prompt | Flags debugging artifacts (console.log) that should be removed before committing. |
| **Strategic Compaction** | PreCompact | prompt | Reminds to commit work, summarize decisions, and update memory before context compaction. |
| **Lint Before Commit** | PreToolUse | prompt | Blocks `git commit` if lint hasn't been run this session. |
| **Session-End Memory** | Stop | agent | Captures corrections and patterns discovered during the session into project memory. |

**Hook type selection:** Use `command` for deterministic checks (fast, no token cost). Use `prompt` for judgment calls (LLM evaluates context). Use `agent` for complex verification that needs tool access. Always use `async: true` for non-blocking checks.

---

## Meta-Agents and Global Skills

### Harness Optimizer — Self-Improving Configuration

A meta-agent that audits your Claude Code setup — settings, rules, hooks, skills, agents, MCP servers — and produces a scored report with prioritized recommendations. Think of it as `eslint` for your Claude Code config. Checks whether deny rules are comprehensive, globs are correctly targeted, hooks use the right type, CLAUDE.md is under 200 lines, and MCP server count stays under 10.

### Content Engine — Cross-Platform Publishing

A global skill that transforms a single markdown source into platform-optimized variants (DEV Community, Medium, LinkedIn, WordPress). Each variant stands alone with platform-specific formatting — front matter for DEV, simplified tables for Medium, 1300-char hooks for LinkedIn. Works from any project directory because it operates on content, not code.

---

## Project-Level Settings Templates

Most projects start with zero Claude Code configuration. Someone eventually adds a CLAUDE.md, but the permissions stay wide open. A `settings.example.json` committed to the repo sets a secure baseline for every team member.

### The Template

Create `.claude/settings.example.json` in your project root:

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
      "Bash(pnpm build:*)",
      "Bash(pnpm test:*)",
      "Bash(pnpm lint:*)",
      "Bash(pnpm dev:*)",
      "Bash(npx tsc --noEmit:*)"
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
      "Read(.next/**)",
      "Bash(rm -rf:*)",
      "Bash(sudo:*)"
    ]
  }
}
```

### Adapt by Project Type

Swap the allow/deny patterns for your stack — monorepos add `--filter` commands, Python projects swap to `pytest`/`uv run`/`ruff`, content repos need only `Read/Edit/Write/Glob/Grep`. The template is a starting point, not a universal fit.

### Gitignore Setup

Add `.claude/*` and `!.claude/settings.example.json` and `!.claude/rules/` to `.gitignore`. The `.json` file stays local (personal overrides), while `.example.json` is committed (team baseline travels with the repo).

---

## Strategic Compaction: Offloading Session Intelligence

As sessions grow, Claude Code compacts earlier messages to stay within context limits. The problem: compaction can lose important decisions, architectural context, or debugging breakthroughs discovered mid-session.

### The Docs/Agent Pattern

Instead of bloating your CLAUDE.md with compaction strategies, create a dedicated reference file that Claude reads when it needs session management guidance:

**`docs/Agent/session-management.md`:**

```markdown
# Session Management Patterns

## When to Compact
- After completing a major phase (spec, plan, implementation)
- After heavy research or exploration that produced a clear conclusion
- When context reaches ~50% capacity

## What to Preserve Before Compacting
- Current spec/plan file paths (re-read after compaction)
- Decisions made this session with their reasoning
- File paths that were modified
- Test results and their implications

## Compaction Checklist
1. Commit any in-progress work
2. Summarize key decisions in the ticket's spec or plan file
3. Update memory with any corrections or patterns discovered
4. Then compact or clear

## Context Recovery After Compaction
1. Re-read the spec file: `ai/<ticket>/requirements/spec.md`
2. Re-read the plan file: `ai/<ticket>/plans/overview.md`
3. Check git status for uncommitted work
4. Resume from the current phase
```

Reference it from your CLAUDE.md with a single line:

```markdown
## Session Management
When working on long sessions, read `docs/Agent/session-management.md` for compaction and context recovery patterns.
```

**One line in CLAUDE.md instead of 20.** The detailed instructions live in a file Claude reads on demand, not one that loads into every conversation.

### Progressive Disclosure for Agent Documentation

The same pattern works for any complex topic that Claude needs occasionally but not constantly:

```markdown
## Detailed Documentation
When working on specific areas, read the relevant doc first:
- `docs/Agent/session-management.md` — Compaction and context recovery
- `docs/Agent/testing-strategy.md` — Test pyramid, coverage targets
- `docs/Agent/deployment-checklist.md` — Pre-deploy verification steps
```

This keeps your CLAUDE.md under the 200-line sweet spot while still giving Claude access to deep documentation when needed.

---

## Multi-Agent Orchestration: Beyond Single Sessions

The next evolution of Claude Code isn't faster single sessions — it's multiple agents working in coordination.

### everything-claude-code: The Reference Implementation

[everything-claude-code](https://github.com/affaan-m/everything-claude-code) is a production-ready configuration ecosystem that pushes Claude Code to its current limits. Built from 10+ months of daily development and winner of an Anthropic hackathon:

- **28 specialized subagents** — planning, architecture, code review, security, language-specific builds
- **120+ skills** — TDD, security scanning, database optimization, deployment patterns
- **60+ slash commands** — `/plan`, `/tdd`, `/code-review`, `/e2e`, and more
- **Language-specific coding rules** for 10+ languages
- **Hooks for memory persistence** — auto-extracting patterns from sessions into reusable skills
- **Multi-agent orchestration** via PM2

The key insight isn't the quantity — it's the **pattern extraction loop**. Sessions generate learnings. Learnings become rules. Rules improve future sessions. The system gets better the more you use it.

### Organizational Patterns Without Infrastructure

[Paperclip](https://github.com/paperclipai/paperclip) introduces org charts, budget caps, and scheduled heartbeats for AI agents — but it requires a separate infrastructure stack. You can get 80% of the value with native Claude Code:

**Agent Delegation Protocol** — Instead of a CEO agent routing tasks, create a `docs/Agent/agent-delegation.md` reference that maps task types to agents by domain:

```
Office work  → backend-architect (opus), frontend-developer (sonnet)
Side projects → rapid-prototyper (sonnet), feature-dev plugin (sonnet)
Solopreneur  → /content-write (sonnet), /growth (opus), /social-content (haiku)
```

**Cost Control via Model Tiers** — Paperclip enforces per-agent budgets. Native equivalent: a global rule that routes by task complexity — haiku for lookups, sonnet for implementation, opus only for architecture. Start with sonnet, escalate only when reasoning depth matters.

**Scheduled Automation via Cron** — Paperclip's heartbeat system wakes agents on a schedule. Native equivalent: `claude --headless` in cron jobs:

```cron
0 9 * * 1-5  cd ~/Projects/office && claude --headless -p "standup summary"
0 10 * * 6   cd ~/Projects/blogs && claude --headless -p "suggest 3 topic ideas"
0 20 * * 0   cd ~/Projects/office && claude --headless -p "/retro"
0 12 1 * *   claude --headless -p "run harness-optimizer audit"
```

**Audit Trails** — Git commits are your audit trail. The session-end memory hook captures learnings. Together they answer "who did what, when, and what was learned."

**Domain Isolation** — Different project CLAUDE.md files already scope context. Add project-level `settings.example.json` to scope permissions per domain.

### When Multi-Agent Makes Sense

| Scenario | Single Agent | Multi-Agent |
|----------|-------------|-------------|
| Bug fix in one file | Overkill | Use single |
| Feature spanning 3+ services | Possible but slow | Parallel agents per service |
| Code review + security audit | Sequential | Parallel specialists |
| Refactoring a monorepo | Context overflow risk | One agent per package |

The rule of thumb: if subtasks are independent, or the task requires more than one domain's context simultaneously, multi-agent saves time and tokens.

---

## Mobile and Multi-Surface Development

Claude Code is no longer terminal-only. Anthropic shipped four remote access methods in rapid succession:

- **Web Sessions** — Cloud-hosted Claude Code accessible from any browser
- **Remote Control** — Access your terminal session from your phone
- **Dispatch** — Coordinate parallel sessions from a single control point
- **Channels** — Integrate with Telegram, Discord, and other messaging platforms for live code sessions

### Setting Up Telegram (5 Minutes)

```bash
# 1. Create a bot via @BotFather in Telegram, copy the token

# 2. Install the plugin
/plugin install telegram@claude-plugins-official
/reload-plugins

# 3. Configure with your BotFather token
/telegram:configure <your-bot-token>

# 4. Restart Claude Code with channels enabled
claude --channels plugin:telegram@claude-plugins-official

# 5. DM your bot, get the pairing code, then:
/telegram:access pair <code>
/telegram:access policy allowlist    # Lock to your account only
```

Now you can DM your bot from your phone and Claude works on your local machine — reading files, running tests, making commits. The session stays open as long as your terminal runs. Requires [Bun](https://bun.sh) runtime and Claude Code v2.1.80+.

> **Security note**: Messages pass through Telegram's servers. Never send passwords, API keys, or secrets through the bot.

### The Real Insight

The interface doesn't matter. What matters is where your knowledge lives.

If your CLAUDE.md, skills, rules, and agents are in `~/.claude/` on one machine, they're trapped on that machine. If they're in your **git repo** (`.claude/settings.example.json`, `CLAUDE.md`, `.claude/rules/`), they travel with the code.

**The durable setup:**

```
Knowledge that travels with the repo (committed):
  CLAUDE.md                        → Team standards
  .claude/settings.example.json    → Permission baseline
  .claude/rules/*.md               → Project-specific patterns
  docs/Agent/*.md                  → Detailed reference docs

Knowledge that stays personal (not committed):
  ~/.claude/settings.json          → Global security
  ~/.claude/CLAUDE.md              → Personal workflow
  ~/.claude/skills/                → Personal skills
  ~/.claude/agents/                → Personal agents
  ~/.claude/rules/                 → Personal coding rules
```

When you open a project from your phone via Remote Control, or from a cloud session via Web Sessions, the repo-level configuration loads automatically. Your personal tools are the bonus layer — not the foundation.

---

## Putting It All Together

Here's what an optimized Claude Code environment looks like after applying these patterns:

```
Global (applies everywhere):
  ~/.claude/settings.json              → Security deny list
  ~/.claude/CLAUDE.md                  → Personal workflow (under 200 lines)
  ~/.claude/rules/                      → Domain-targeted rules (security, performance, git, TS, DB, Vue)
  ~/.claude/docs/Agent/
  │   ├── agent-delegation.md          → Org chart & routing protocol
  │   ├── session-management.md        → Compaction & recovery
  │   └── automation.md                → Cron patterns for headless runs
  MCP Servers:
  │   └── code-review-graph            → Global token optimization

Per-Project (committed to git):
  CLAUDE.md                            → Team standards (under 200 lines)
  .claude/settings.example.json        → Permission baseline
  .claude/rules/                       → Project-specific patterns
```

### The Optimization Checklist

1. **Token cost too high?** → Add code-review-graph as a global MCP server
2. **Irrelevant rules loading?** → Split rules by domain with targeted globs
3. **New projects unprotected?** → Commit `.claude/settings.example.json` to every repo
4. **CLAUDE.md getting bloated?** → Move detailed docs to `docs/Agent/`, reference with one line
5. **Single-agent bottleneck?** → Evaluate multi-agent orchestration for large tasks
6. **Machine-dependent setup?** → Move team knowledge to repo-level files

### The Shift

Most developers treat Claude Code as a smarter autocomplete — type a prompt, get code, move on. The patterns in this guide reframe it as **infrastructure**.

Token optimization means your 2,000-file codebase stops costing $5 per review. Targeted rules mean the right constraints fire on the right files without wasting instruction budget. Hooks enforce quality gates automatically — you don't remember to lint before committing, the system does. Agent delegation means the right model handles the right task at the right cost. And cron automation means work happens while you sleep.

None of this requires new tools. It's all `~/.claude/` configuration files, glob patterns, and JSON. The investment is a few hours of setup. The return is compounding — every session, every project, every team member benefits from the same foundation.

The teams that configure Claude Code like infrastructure today will have a structural advantage as these capabilities mature tomorrow.

---

## References

**Tools:**
- [code-review-graph](https://github.com/tirth8205/code-review-graph) — AST-based knowledge graph for token-efficient code reviews via MCP
- [Diffity](https://github.com/kamranahmedse/diffity) — GitHub-style diff viewer with AI review (`/diffity-review` for severity-tagged feedback, `/diffity-resolve` to auto-fix)
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) — Production-ready config ecosystem: 28 subagents, 120+ skills, multi-agent orchestration
- [Paperclip](https://github.com/paperclipai/paperclip) — Multi-agent management with org charts, budgets, and audit trails

**Insights:**
- [Claude Agents from Your Phone — Pawel Huryn](https://www.linkedin.com/posts/pawel-huryn_claude-agents-now-run-from-your-phone-in-share-7441233425577168896-0Zx7) — Remote access patterns and knowledge durability
- [Zero-Human AI Company — Shubham Saboo](https://www.linkedin.com/posts/shubhamsaboo_this-open-source-project-lets-you-run-a-zero-human-share-7441309654657445888-RgOy) — Agent team management at scale

**Official:**
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code) — Permissions, hooks, settings, skills

---

## Let's Connect

I'm always excited to hear about what you're building! If you found this guide helpful, have questions, or just want to share your Claude Code setup:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
