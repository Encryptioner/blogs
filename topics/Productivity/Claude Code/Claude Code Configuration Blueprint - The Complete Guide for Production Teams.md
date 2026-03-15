# Claude Code Configuration Blueprint: The Complete Guide for Production Teams

> Configure Claude Code once — get security, reusable workflows, specialized agents,
> and cross-session intelligence across every project.

---

<div align="center">
  <img src="../../../assets/B-11/Claude-Code-Configuration-Blueprint-The Complete-Guide-for-Production-Teams.png"/>
</div>

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
  ~/.claude/skills/*/SKILL.md    → Reusable workflows
  ~/.claude/commands/*/SKILL.md  → Convenience shortcuts
  ~/.claude/rules/*.md           → File-specific patterns (glob matching)
  ~/.claude/agents/*.md          → Domain specialists

Team-shared (committed to git):
  .claude/settings.json          → Project permissions
  CLAUDE.md                      → Coding standards, architecture
  .claude/rules/*.md             → Team-specific patterns

Personal overrides (gitignored):
  .claude/settings.local.json    → Your project overrides
  CLAUDE.local.md                → Your project preferences
```

**Key rule:** Your project CLAUDE.md must be self-contained. Teammates don't have your global skills, agents, or personal CLAUDE.md — global files are your personal toolkit, project files are the team playbook.

---

## Part 1: Security — The Permission System

Permissions follow a strict hierarchy: **Deny** (always blocks) → **Ask** (prompts you) → **Allow** (auto-approved). Deny always wins — this is what makes the system trustworthy.

### Pattern Syntax

```
Bash(exact command)       → matches only that exact command
Bash(command *)           → matches command with any arguments (space before *)
Read(path/to/file)        → matches exact file
Read(path/**/*.json)      → matches glob pattern
Read(~/.ssh/**)           → ~ expands to home directory on any OS
```

**Space matters:** `Bash(ls *)` matches `ls -la` but NOT `lsof`. `Bash(ls*)` matches both.

### Global Settings (`~/.claude/settings.json`)

```json
{
  "permissions": {
    "allow": ["Read", "Edit", "Write", "Glob", "Grep", "Bash(git status:*)", "Bash(git diff:*)", "Bash(nvm use:*)", "Bash(node:*)", "Bash(ls:*)"],
    "ask": ["Bash(git push:*)", "Bash(git commit:*)", "Bash(pnpm install:*)", "Bash(docker:*)", "Bash(curl:*)"],
    "deny": ["Bash(rm -rf:*)", "Bash(sudo:*)", "Bash(git push --force:*)", "Read(.env)", "Read(.env.*)", "Read(~/.ssh/**)", "Read(~/.aws/**)", "Read(~/Library/Keychains/**)"]
  }
}
```

**Cross-OS coverage:** The deny list covers macOS (`~/Library/Keychains`), Linux (`~/.local/share/keyrings`), and Windows WSL (`/mnt/c/Users/*/AppData`). One global config works on any machine.

### Project Settings (`.claude/settings.example.json`)

```json
{
  "permissions": {
    "allow": ["Read", "Edit", "Write", "Glob", "Grep", "Bash(pnpm build:*)", "Bash(pnpm test:*)"],
    "deny": ["Read(.env)", "Read(.env.*)", "Read(node_modules/**)", "Read(dist/**)"]
  }
}
```

Add to `.gitignore`: `.claude/*` and `!.claude/*.example*`

---

## Part 2: CLAUDE.md — Teaching Claude Your Codebase

A well-written CLAUDE.md turns Claude from a generic assistant into a team member who knows your conventions, pain points, and architecture.

### The Instruction Budget Problem

Frontier LLMs reliably follow roughly **150–200 instructions** total. Claude Code's system prompt consumes ~50 slots before your CLAUDE.md loads. Instruction degradation is **uniform** — every low-value rule you add actively makes your high-value rules less likely to be followed.

**Brevity isn't nice — it directly affects instruction compliance.**

### The Template

Write it for Claude, not humans. Don't duplicate your README.

```markdown
# CLAUDE.md

## Commands
- `pnpm dev` — Start development server
- `pnpm build` — Production build
- `pnpm lint-fix` — Lint and fix all packages

## Architecture
- `packages/client` — Vue 3 frontend
- `packages/server` — Express API
- `packages/shared` — Types, DTOs, utilities

## Coding Standards
- TypeScript strict mode, no `any` types
- Absolute imports only (no `../../`)
- API payloads: declare as typed constants

## PR Review Rules
1. **Type Safety** — Never use `any`. Typed constants for API payloads
2. **Dead Code** — Remove unused imports, variables, i18n keys
3. **Error Handling** — Wrap all API calls in try/catch

## Critical Gotchas
- Always use projection in DB queries — never fetch entire documents
- Server error messages MUST come from constant files
```

### Progressive Disclosure

For larger projects, use a **progressive disclosure** pattern — put detailed docs in a separate directory:

```markdown
## Detailed Documentation
When working on specific areas, read the relevant doc first:
- `docs/Agent/database_schema.md` — Data model and relationships
- `docs/Agent/payment_flow.md` — Payment gateway integration
```

### What Works vs. What Doesn't

| Do | Don't |
|----|-------|
| Include commands Claude needs | Include formatting rules (use linter + hooks) |
| Document non-obvious patterns | Document obvious language features |
| List real PR review pain points | Duplicate your README |
| Keep it under 200 lines | Include aspirational rules nobody follows |

---

## Part 3: Rules — Enforcing Patterns with Globs

For patterns that must apply across specific file types, use **rules** with glob matching. Place them in `~/.claude/rules/`:

```markdown
---
description: Common coding mistakes — enforced across all projects
globs: "*.ts,*.tsx,*.vue,*.js,*.jsx"
---

# Coding Gotchas
- Never use relative imports (`../../`) — always absolute paths
- Never introduce `any` types — find or create the proper type
```

When Claude edits files matching the glob, these rules apply automatically.

| | CLAUDE.md | Rules (`~/.claude/rules/`) |
|---|-----------|---------------------------|
| **Scope** | Per-project | Global (all projects) |
| **Content** | Architecture, commands, standards | File-specific patterns |
| **Trigger** | Loads when working in directory | Loads when file matches glob |
| **Best for** | Teaching your codebase | Enforcing patterns across projects |

For teams: commit project-specific rules to `.claude/rules/` in your repo.

---

## Part 4: Plugins & Agents — Instant Capabilities

### Plugins

Plugins are pre-built packages from the community. One install command gives you agents, MCP servers, and skills:

```bash
claude plugins:install context7 superpowers code-review feature-dev
```

**Recommended stack:**

| Plugin | Purpose |
|--------|---------|
| `context7` | Live, version-specific documentation lookup |
| `feature-dev` | Codebase exploration + architecture design agents |
| `superpowers` | TDD, debugging, brainstorming, parallel agents |
| `code-review` | Multi-agent PR review with confidence scoring |
| `playwright` | Browser automation and E2E testing |
| `commit-commands` | Streamlined git commit, push, and PR creation |

**MCP Servers** — Many plugins include MCP (Model Context Protocol) servers that bridge Claude Code with external systems (databases, APIs, task trackers). No additional configuration needed.

**Custom Marketplaces** — Add team-specific or community plugins:

```json
{
  "extraKnownMarketplaces": {
    "my-team": { "source": { "source": "github", "repo": "my-team/claude-plugins" } }
  }
}
```

### Agents

Agents are pre-configured specialists you can call for specific tasks. Unlike plugins (which add tools), agents add expertise.

| Category | Example Agents | When to Use |
|----------|---------------|-------------|
| **Engineering** | `backend-architect`, `frontend-developer`, `ai-engineer` | Domain-specific architecture |
| **Testing** | `test-writer-fixer`, code-review agents | Test strategy, bug fixing |
| **Operations** | `analytics-reporter`, `finance-tracker` | Data analysis, reporting |
| **Development** | `code-explorer`, `code-architect`, `rapid-prototyper` | Codebase understanding, MVPs |

**Example:** Instead of explaining React Server Components patterns, say *"Use the frontend-developer agent to build this with Server Components."* The agent already knows the patterns, has React-specific tools, and follows frontend best practices automatically.

| | Plugins | Agents |
|---|---------|--------|
| **What they add** | Tools, MCP servers, skills | Domain expertise and focus |
| **Best for** | Adding capabilities | Complex tasks requiring depth |

---

## Part 5: Skills & Commands — Building Workflows

### Skills vs. Commands

| | **Commands** (`~/.claude/commands/`) | **Skills** (`~/.claude/skills/`) |
|---|---------|---------------|
| **Purpose** | Convenience shortcuts | Workflow orchestration |
| **Examples** | `/commit`, `/loop`, `/rewind` | `/spec`, `/implement`, `/grill` |
| **Scope** | Single operations | Multi-step processes |
| **Use Case** | Quick actions | Structured workflows |

Use a **command** for quick shortcuts. Use a **skill** for multi-step workflows with decision points.

### The Spec-to-Ship Workflow

The real power of skills comes from chaining them into a complete development workflow:

```
/scope (optional) → /spec → /grill (auto) → /plan-work → /grill (auto) → /implement → /verify → /ship
```

**The ceremony scales with the risk:**

| Task Type | Workflow |
|-----------|----------|
| **New product** | `/scope` → full chain |
| **Feature** | Full chain |
| **Minor enhancement** | Light spec → plan → implement → verify → ship |
| **Bug fix** | Bug spec or skip → plan → implement → verify → ship |
| **Hotfix** | Inline plan → implement → verify → ship |

### Key Skills

| Skill | Purpose |
|-------|---------|
| `/scope` | Rapid product scoping — forces "ONE thing" question, maps user journey, identifies cost drivers |
| `/spec` | Clarified technical spec with Change Log for tracking mid-implementation updates |
| `/grill` | Hard-critic review through 7 lenses (security, architecture, testing, etc.) with severity levels |
| `/plan-work` | Phase-by-phase implementation plan traced to spec requirements |
| `/implement` | Executes plans with mid-implementation discovery handling (minor/moderate/significant tiers) |
| `/verify` → `/pre-review` → `/ship` | Type check → spec requirement walkthrough → branch management + PR creation |

### Ticket Directory Structure

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

This structure makes work **resumable across sessions** — future sessions read spec/plan files to pick up where you left off.

### Building Your Own Skills

```markdown
---
name: my-skill
description: Use when the user says "plan this" or presents a multi-file task
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

**Three tips:**
1. Write instructions TO Claude, not documentation ABOUT a process
2. Include trigger phrases in the description
3. Keep each skill focused — one workflow, one skill

---

## Part 6: Advanced Patterns — Hooks, Subagents, Worktrees

### Hooks — Automated Quality Gates

Hooks run automatically at lifecycle events. Two types:

- **`prompt`** — Claude evaluates a condition and acts (block, remind, warn)
- **`command`** — Runs a shell command directly (always executes)

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "prompt",
        "prompt": "If this is a git commit, verify lint and type-check have been run. If not, block with: 'Run lint and type-check before committing.'"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "prompt",
        "prompt": "If the file is TypeScript and more than 3 TS files have been edited since the last type-check, remind: 'Consider running type-check before continuing.'"
      }]
    }],
    "Notification": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "notify-send 'Claude Code' 'Awaiting your input'" }]
    }]
  }
}
```

**Use hooks instead of CLAUDE.md for linting rules** — LLMs are expensive compared to linters. Hooks free up instruction budget for things only CLAUDE.md can teach.

### Subagents — Keeping Context Clean

For complex tasks, spawn subagents to handle research, exploration, or parallel work. Subagents run in separate contexts and return distilled findings — keeping your main conversation focused on implementation.

| Scenario | Example |
|----------|---------|
| **Research** | Investigating a library before using it |
| **Exploration** | Understanding a large codebase section |
| **Parallel work** | Running independent analyses |
| **Heavy debugging** | Deep investigation |
| **Code review** | Multiple reviewers checking different aspects |

Many skills use subagents automatically. `/grill` spawns review agents for different aspects. `/implement` may spawn research agents for unfamiliar libraries.

### Worktrees — Isolated Development

For feature work that needs isolation, use **git worktrees**. Claude can create and manage worktrees, giving you a clean environment for each branch.

| Scenario | Benefit |
|----------|---------|
| **Multiple features** | Work on several branches simultaneously |
| **Parallel testing** | Test approaches in isolated environments |
| **Code review** | Review PR branches while keeping main stable |
| **Hotfixes** | Fix production without interrupting feature work |

---

## Part 7: Automation — Auto-Invocation & Memory

### Auto-Invocation — Skills That Trigger Themselves

Both plugins and skills support **auto-invocation** — Claude reads the skill's description and triggers it automatically when your request matches. You don't need to remember slash commands.

To make auto-invocation reliable:
- **Be specific with trigger phrases** — vague descriptions lead to false activations
- **Include negative triggers** — "Do NOT use for TDD projects — use /plan-tdd instead"
- **Test with natural language** — try different phrasings

Example: With `/grill` configured to trigger on "grill this", "poke holes", or "stress test this", simply saying *"poke holes in this spec"* auto-triggers the workflow.

### Auto Memory — Cross-Session Intelligence

Claude Code maintains a persistent memory directory per project at `~/.claude/projects/<project-path>/memory/`. The `MEMORY.md` file (first 200 lines) loads into every conversation automatically — no manual setup needed.

Claude updates this file as it learns your project: architectural patterns, common mistakes, file paths that matter. The `/ship` skill captures learnings at the end of each ticket automatically, so memory grows organically across sessions.

---

## Part 8: Putting It All Together

### New Project Setup (5 Minutes)

1. Create `CLAUDE.md` — commands, architecture, coding standards, PR review rules, critical gotchas
2. Create `.claude/settings.example.json` — project-specific deny list
3. Optionally create `.claude/rules/*.md` — project-specific patterns with glob matching
4. Add to `.gitignore`: `.claude/*` and `!.claude/*.example*`
5. Ensure `~/.claude/settings.json` has the global security deny list
6. Install plugins: `claude plugins:install context7 superpowers code-review feature-dev`

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
| `~/.claude/skills/*/SKILL.md` | No | Custom workflows |
| `~/.claude/commands/*/SKILL.md` | No | Convenience shortcuts |
| `~/.claude/rules/*.md` | No | File-specific patterns (glob) |
| `~/.claude/agents/*.md` | No | Domain specialists |
| Plugins | No | Pre-built agents + MCP + skills |
| `.claude/settings.json` | Yes | Team project permissions |
| `.claude/rules/*.md` | Yes | Team-specific patterns |
| `CLAUDE.md` | Yes | Team coding standards |
| `~/.claude/projects/*/memory/` | No | Cross-session memory |

---

## The Takeaway

Layer your configuration by scope and shareability:

- **Global settings** protect your system — secrets, credentials, destructive commands
- **Project settings** protect project resources — config files, build artifacts
- **CLAUDE.md** encodes team standards (keep it under 200 lines — every low-value instruction degrades high-value ones)
- **Rules** enforce file-specific patterns with glob matching — language conventions, gotchas
- **Agents** provide domain expertise — backend, frontend, AI, testing, operations
- **Plugins** add instant capabilities — code review, testing, documentation, MCP servers
- **Skills** encode workflows (multi-step) — **Commands** handle shortcuts (single actions)
- **Hooks** automate quality gates — free up CLAUDE.md instruction slots
- **Subagents** keep context clean — offload research, exploration, parallel analysis
- **Worktrees** enable isolated development — multiple branches without switching
- **Memory** captures lessons learned — no reteaching the same thing twice
- **Auto-invocation** makes skills trigger themselves — no slash commands needed

The spec-to-ship workflow isn't bureaucracy. It's front-loading the thinking so implementation is mechanical. A grilled spec catches the bug that would have taken a day to debug. A phased plan prevents the "I changed 47 files and nothing type-checks" disaster.

Configure once. Benefit on every session, every project, every team member.

---

## References

**Official:**
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code) — Permissions, hooks, settings, skills
- [Plugins README](https://github.com/anthropics/claude-code/blob/main/plugins/README.md) — Plugin marketplace

**Community:**
- [Writing a Good CLAUDE.md — HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — Instruction budgets research
- [Claude Code Hooks: Complete Guide — aiorg.dev](https://aiorg.dev/blog/claude-code-hooks) — 20+ hook examples
- [Claude Code Permissions Guide — eesel.ai](https://www.eesel.ai/blog/claude-code-permissions) — Security setup

---

**End:**
- [Website](https://encryptioner.github.io)
- [LinkedIn](https://www.linkedin.com/in/mir-mursalin-ankur)
- [GitHub](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)
- [Nerddevs](https://nerddevs.com/author/ankur/)
