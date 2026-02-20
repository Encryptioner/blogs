# Claude Code Plugins, Tools & Productivity Features: Complete Guide

> Everything you need to know about Claude Code's feature ecosystem - Hooks, Skills, Plugins, MCP Servers, Custom Agents, CLAUDE.md, Worktrees, Permissions, AskUserQuestion, EnterPlanMode, and Settings. Practical examples for each.

---

## The Feature Ecosystem at a Glance

```
CLAUDE.md (foundation: always-on project context)
    |
    +---> Skills / Slash Commands (on-demand workflows)
    +---> Custom Agents (isolated specialists)
    +---> Hooks (deterministic quality gates at lifecycle events)
    +---> MCP Servers (external tool integrations)
    +---> Plugins (packaged distribution of all the above)
    +---> Worktrees (parallel session isolation)
    +---> Settings + Permissions (governance and safety rails)
```

| Feature | Purpose | When to Use |
|---------|---------|-------------|
| **CLAUDE.md** | Always-loaded project context | Instructions that apply to every session |
| **Hooks** | Deterministic automation at lifecycle events | Formatting, security blocks, test gates |
| **Skills** | Reusable workflows invoked as `/command` | Repeatable tasks (review, deploy, audit) |
| **Custom Agents** | Specialized AI with restricted tools | Security audit, test writing, code review |
| **MCP Servers** | Bridge to external tools/APIs | GitHub, databases, documentation |
| **Plugins** | Packaged bundles of all the above | Team/org distribution |
| **Worktrees** | Git-level parallel isolation | Multiple features simultaneously |
| **Permissions** | Tool access control | Safety rails, secret protection |
| **Settings** | Global configuration | Model selection, env vars, UI preferences |

---

## 1. CLAUDE.md - The Foundation

CLAUDE.md is automatically loaded into Claude's context at the start of every session. It's the single most impactful file for productivity.

### File Locations (All Auto-Loaded)

| Location | Scope | Shared? |
|----------|-------|---------|
| `CLAUDE.md` or `.claude/CLAUDE.md` | Project root | Yes (git) |
| `~/.claude/CLAUDE.md` | User global | No |
| `CLAUDE.local.md` | Project, gitignored | No |
| `src/CLAUDE.md` | Subdirectory-specific | Yes (git) |

### Template

```markdown
# Project: My App
One-line description.

## Tech Stack
- TypeScript 5.x, React 19, Vite 6
- Database: Dexie (IndexedDB)
- Testing: Vitest + Playwright

## Commands
- `pnpm dev` - dev server (port 5173)
- `pnpm test` - run tests
- `pnpm validate` - type-check + lint + build

## Architecture
- `src/services/` - Business logic (singletons, Result<T> pattern)
- `src/components/` - React components (data-testid required)
- `src/store/` - Zustand stores
- See @PRD/AGENT_SPEC.md for full spec

## Critical Rules
- No `any` types
- Use `@/` path aliases (never relative imports)
- Use logger utility (never console.log)
- All services return Result<T> pattern
```

### `@import` Syntax

Reference detailed docs without bloating CLAUDE.md:

```markdown
See @PRD/TDD_APPROACH.md for testing methodology.
See @AGENTS.md for technology gotchas.
```

### Modular Rules (`.claude/rules/`)

Files in `.claude/rules/` are auto-loaded without explicit imports:

```
.claude/rules/
  code-style.md
  testing.md
  security.md
```

### Key Principle: Brevity

Keep CLAUDE.md under ~150 lines. LLMs attend most to content at the beginning and end. A 300-line file buries critical rules in the middle where they get deprioritized.

---

## 2. Hooks - Deterministic Quality Gates

Hooks are shell scripts that execute at specific lifecycle events. Unlike asking Claude to behave a certain way, hooks **always** run.

### All Lifecycle Events

| Event | Blocks? | Use Case |
|-------|---------|----------|
| `SessionStart` | No | Load context, set env vars |
| `UserPromptSubmit` | Yes | Validate/enrich prompts |
| `PreToolUse` | Yes | Block dangerous commands, auto-approve safe ones |
| `PostToolUse` | No | Auto-format, lint, logging |
| `Stop` | Yes | Enforce tests pass before finishing |
| `PreCompact` | No | Backup transcript |
| `SubagentStart/Stop` | Mixed | Subagent lifecycle control |
| `SessionEnd` | No | Cleanup, logging |

### Configuration

In `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\""
        }]
      }
    ]
  }
}
```

### Exit Codes

| Code | Effect |
|------|--------|
| `0` | Success - proceed |
| `2` | **Block** - halt current action, stderr sent to Claude as feedback |
| Other | Error - proceed, stderr shown in verbose mode |

### Practical Examples

**Auto-format on file write:**
```json
{
  "matcher": "Write|Edit",
  "hooks": [{"type": "command", "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\""}]
}
```

**Block destructive commands:**
```bash
#!/bin/bash
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command')
if echo "$CMD" | grep -qE '^(rm -rf|DROP TABLE|git push --force)'; then
  echo "Blocked: destructive command" >&2
  exit 2
fi
exit 0
```

**Protect .env files:**
```bash
#!/bin/bash
FILE=$(cat | jq -r '.tool_input.file_path // empty')
if [[ "$FILE" == *".env"* ]] || [[ "$FILE" == *"secrets"* ]]; then
  echo "Protected file: $FILE" >&2
  exit 2
fi
exit 0
```

**Enforce tests before Stop:**
```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "npm test --silent 2>/dev/null || (echo 'Tests must pass before finishing' >&2 && exit 2)"
      }]
    }]
  }
}
```

**Inject git context at session start:**
```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup|resume",
      "hooks": [{
        "type": "command",
        "command": "echo '## Git Context' && git branch --show-current && git log --oneline -5 && git status --short | head -10"
      }]
    }]
  }
}
```

**Re-inject context after compaction:**
```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "compact",
      "hooks": [{"type": "command", "command": "cat .claude/context-reminder.md"}]
    }]
  }
}
```

**Auto-approve read-only tools:**
```bash
#!/bin/bash
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
exit 0
```

### Hook Types

- **`command`** - Shell script; receives JSON on stdin
- **`prompt`** - LLM-evaluated decision; returns `{"ok": true/false}`
- **`agent`** - Full multi-turn agent for verification (e.g., run tests)

### Environment Variables Available

| Variable | Purpose |
|----------|---------|
| `CLAUDE_PROJECT_DIR` | Project root path |
| `CLAUDE_TOOL_INPUT_FILE_PATH` | File being modified |
| `CLAUDE_ENV_FILE` | Path to write exported env vars |

### Matcher Syntax

- `""` or omitted - matches all tools
- `"Bash"` - exact match (case-sensitive)
- `"Write|Edit"` - regex OR (no spaces around pipe)
- `"mcp__memory__.*"` - regex pattern for MCP tools

### Pitfalls

- Matchers are **case-sensitive** - use `Bash` not `bash`
- `async: true` hooks **cannot block** - don't use for security
- PostToolUse **cannot undo** execution - use PreToolUse for blocking
- Test hooks with: `echo '{"tool_name":"Bash"}' | ./hook.sh; echo $?`

---

## 3. Skills (Slash Commands)

Skills are reusable markdown workflows invoked as `/command-name`. Since Claude Code v2.1.3, slash commands and skills are unified.

### File Locations

| Location | Scope |
|----------|-------|
| `.claude/skills/` | Project (shared via git) |
| `~/.claude/skills/` | Global (all projects) |
| `.claude/commands/` | Legacy path (still works) |

### SKILL.md Format

```markdown
---
name: code-review
description: Reviews code for quality, security, and best practices.
allowed-tools: Read, Grep, Glob, Bash(git diff *)
---

# Code Review Workflow

1. Run `git diff --name-only` to identify changed files
2. Read each changed file
3. Check for: security issues, logic errors, style violations
4. Output structured review with severity levels

$ARGUMENTS
```

### Directory-Based Skill (with Supporting Files)

```
.claude/skills/
  dexie-expert/
    SKILL.md           # Required
    PATTERNS.md        # Reference docs
    MIGRATIONS.md      # Migration guides
```

### YAML Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Becomes `/command-name` |
| `description` | Yes | Used for auto-detection |
| `allowed-tools` | No | Restricts tools available |
| `args` | No | Named parameters |

### `$ARGUMENTS` Variable

Pass user text: `/deploy-feature my-branch production` - `$ARGUMENTS` becomes `my-branch production`

### Built-in Commands

| Command | Purpose |
|---------|---------|
| `/init` | Generate starter CLAUDE.md |
| `/commit` | Git commit with conventions |
| `/review` | Code review workflow |
| `/plugins` | Plugin management UI |
| `/hooks` | View active hook configs |
| `/permissions` | Interactive permissions UI |
| `/agents` | Manage custom agents |
| `/resume` | Resume previous session |

### Best Practices

- Keep each skill focused on ONE purpose
- Make `description` very specific with example triggers
- Use skills (not CLAUDE.md) for domain knowledge that only applies sometimes
- Use `allowed-tools` to restrict permissions for safety

---

## 4. Custom Agents (Sub-Agents)

Custom agents are specialized AI assistants with their own context window, tools, and model selection.

### File Locations

| Location | Scope |
|----------|-------|
| `.claude/agents/` | Project (shared via git) |
| `~/.claude/agents/` | Global (all projects) |

### Agent Definition

```markdown
---
name: security-reviewer
description: Use for ALL security review tasks - PR reviews, vulnerability scanning, credential checks.
model: opus
color: red
tools: Read, Glob, Grep, Bash(git diff *), Bash(git log *)
disallowedTools: Write, Edit
maxTurns: 20
---

# Security Reviewer

You are a senior security engineer. Check for:
1. Secrets/credentials in code
2. SQL injection, XSS, CSRF vulnerabilities
3. Authentication/authorization issues
4. Input validation gaps

## Never Do
- Modify files directly
- Approve code with Critical issues
```

### YAML Frontmatter Fields

| Field | Values | Description |
|-------|--------|-------------|
| `name` | kebab-case | Agent identifier |
| `description` | String | Triggers auto-delegation |
| `model` | `opus`, `sonnet`, `haiku`, `inherit` | Model to use |
| `color` | `red`, `blue`, `green`, etc. | UI distinction |
| `tools` | Comma-separated | Allowlist |
| `disallowedTools` | Comma-separated | Denylist |
| `maxTurns` | Integer | Max agent turns |

### Creating via UI

```
/agents
# Select "Create new agent"
# Choose scope, fill in fields
```

### AskUserQuestion Tool

Both agents and main Claude can present interactive multiple-choice questions:

```
Claude asks: "Which auth strategy should I use?"
  [1] JWT tokens (Recommended)
  [2] Session cookies
  [3] OAuth2 only
  [4] Other (enter custom response)
```

Key features:
- `multiSelect: true` allows selecting multiple options
- Users can always type a custom answer via "Other"
- Claude auto-generates sensible options based on context
- Useful in Plan Mode before making architectural decisions

### EnterPlanMode

Plan Mode is read-only exploration where Claude maps the codebase, asks questions via AskUserQuestion, and produces a spec before making changes.

**Workflow:**
1. Claude reads files, runs read-only commands
2. Asks clarifying questions via AskUserQuestion
3. Produces a specification document
4. You review and approve
5. Implementation proceeds from the spec

**Activate:** `Shift+Tab` or ask "enter plan mode"

### Best Practices

- Use `model: opus` for complex reasoning (security, architecture)
- Use `model: haiku` for fast tasks (formatting, lookups)
- Add concrete task examples to `description`
- Use `disallowedTools: Write, Edit` for read-only agents
- Agent results return summarized to main context - keeps it clean

---

## 5. MCP Servers (Model Context Protocol)

MCP servers bridge Claude Code to external tools, APIs, and data sources.

### Adding Servers

```bash
# stdio server (Claude spawns as subprocess)
claude mcp add github-server --env GITHUB_TOKEN=ghp_xxx -- npx @modelcontextprotocol/server-github

# HTTP server
claude mcp add-json weather '{"type":"http","url":"https://api.weather.com/mcp"}'

# Project scope (in .mcp.json, shared via git)
claude mcp add --scope project github -- npx @modelcontextprotocol/server-github

# User scope (all projects)
claude mcp add --scope user memory -- npx @modelcontextprotocol/server-memory

# List and remove
claude mcp list
claude mcp remove server-name
```

### .mcp.json (Project-Level)

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

### Top MCP Servers

| Server | Purpose |
|--------|---------|
| `server-github` | PR management, issues, repos |
| `server-postgres` | Database queries |
| `server-memory` | Persistent cross-session memory |
| `server-playwright` | Browser automation |
| `context7` | Up-to-date library documentation |
| Sequential Thinking | Complex task decomposition |
| Perplexity | Real-time web research |

### MCP Tool Search (Lazy Loading)

Reduces context usage by ~95%. Only tools actually needed are loaded, so you can configure many servers without filling context.

### Best Practices

- Use `${ENV_VAR}` for secrets - never hardcode tokens
- Prefer `--scope project` for team tools
- Enable MCP Tool Search for efficiency
- Use `enabledMcpjsonServers` in settings to whitelist per project

---

## 6. Plugins

Plugins are distributable packages bundling commands, agents, skills, hooks, and MCP configs.

### Structure

```
my-plugin/
  .claude-plugin/
    plugin.json          # Manifest
  commands/              # Slash commands
  agents/                # Agent definitions
  skills/                # Skills
  hooks/                 # Hook configs
  .mcp.json             # MCP servers
```

### plugin.json

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "repository": "https://github.com/you/my-plugin",
  "commands": ["commands/"],
  "agents": ["agents/"],
  "skills": ["skills/"],
  "hooks": ["hooks/hooks.json"],
  "mcpServers": [".mcp.json"]
}
```

### Installing

```bash
# Install from GitHub
claude plugin install owner/repo-name

# Add a marketplace
claude plugin marketplace add anthropics/claude-plugins-official

# Interactive UI
/plugins

# List installed
claude plugin list
```

### Notable Official Plugins

| Plugin | Purpose |
|--------|---------|
| `code-review` | 5 parallel agents for PR review |
| `feature-dev` | 7-phase feature development |
| `security-guidance` | PreToolUse security monitoring |
| `pr-review-toolkit` | 6 specialized PR review agents |

### Best Practices

- Review plugin code before installing (plugins execute with your permissions)
- Bump `version` in plugin.json for updates
- Use `strictKnownMarketplaces` in managed settings for org control
- Namespace: agent `reviewer` in plugin `my-plugin` appears as `my-plugin:reviewer`

---

## 7. Worktrees - Parallel Session Isolation

Git worktrees let you check out multiple branches simultaneously, each with its own Claude session.

### Commands

```bash
# Create worktree with new branch
git worktree add ../project-feature-auth -b feature/auth

# List all worktrees
git worktree list

# Remove worktree
git worktree remove ../project-feature-auth

# Or use Claude's built-in tool
# Ask: "Start a worktree for this feature"
```

### Parallel Development

```bash
# Terminal 1: Feature
cd ../project-feature-auth && claude

# Terminal 2: Bug fix
cd ../project-bugfix && claude

# Terminal 3: Refactor
cd ../project-refactor && claude
```

Each session has independent context and file state. They share `.git` history.

### Workflow

1. Create worktree with descriptive name
2. Install dependencies (`pnpm install`)
3. Copy `.env` and local config
4. Assign Claude a focused task
5. Create PR when done
6. Merge, remove worktree, `git worktree prune`

### Pitfalls

- Worktrees do NOT share `node_modules` - install deps in each
- Port conflicts - use different ports per worktree
- `git worktree remove --force` can lose uncommitted changes

---

## 8. Permissions

Permissions control which tools Claude can use autonomously.

### Hierarchy (Highest to Lowest Priority)

1. **Managed** - Enterprise IT policies
2. **Command line** - CLI flags
3. **Local project** - `.claude/settings.local.json`
4. **Shared project** - `.claude/settings.json`
5. **User** - `~/.claude/settings.json`

### Configuration

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm test)",
      "Bash(pnpm lint)",
      "Bash(git diff *)"
    ],
    "ask": [
      "Bash(git push *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(rm -rf *)"
    ]
  }
}
```

**Deny always wins** - a tool matched by both `allow` and `deny` is blocked.

### Permission Modes (Cycle with `Shift+Tab`)

| Mode | Behavior |
|------|----------|
| `default` | Prompts on first use per session |
| `acceptEdits` | Auto-accepts file edits |
| `plan` | Read-only exploration |
| `bypassPermissions` | Skips all prompts (use carefully) |

### Interactive UI

Run `/permissions` inside Claude Code to browse and edit rules.

---

## 9. Settings (settings.json)

### Locations

```
~/.claude/settings.json          # User global
.claude/settings.json            # Project shared
.claude/settings.local.json      # Project personal (gitignored)
```

### Key Settings

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "claude-sonnet-4-6",
  "outputStyle": "Explanatory",
  "permissions": { ... },
  "hooks": { ... },
  "env": {
    "NODE_ENV": "development",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "enabledPlugins": {
    "code-review@anthropics": true
  },
  "enableAllProjectMcpServers": false,
  "enabledMcpjsonServers": ["github", "memory"]
}
```

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key |
| `ANTHROPIC_BASE_URL` | Custom API endpoint |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output (default 32K) |
| `MAX_THINKING_TOKENS` | Extended thinking budget |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams |

### Schema Validation

Add for IDE autocomplete:
```json
{ "$schema": "https://json.schemastore.org/claude-code-settings.json" }
```

---

## Decision Matrix: Which Feature for What

| Need | Feature |
|------|---------|
| Project context that always applies | **CLAUDE.md** |
| Auto-format code on save | **Hook (PostToolUse)** |
| Block dangerous commands | **Hook (PreToolUse)** |
| Enforce tests before task completion | **Hook (Stop)** |
| Domain knowledge for occasional tasks | **Skill** |
| Repeatable manual workflow | **Skill / Slash Command** |
| Isolated specialist (security audit) | **Custom Agent** |
| Parallel feature development | **Worktrees** |
| External API integration | **MCP Server** |
| Team-wide tool distribution | **Plugin** |
| Secret protection | **Permissions (deny)** |
| Organization policy enforcement | **Managed Settings** |

---

## Recommended Setup for Any Project

### Minimum Viable Setup (5 minutes)

1. Run `/init` to generate CLAUDE.md
2. Add test/lint commands to permissions allow list
3. Add PostToolUse hook for auto-formatting

### Production Setup (30 minutes)

1. **CLAUDE.md** - Tech stack, commands, architecture, critical rules
2. **AGENTS.md** - Technology gotchas, lessons learned (living doc)
3. **Hooks:**
   - PostToolUse: auto-format on Write/Edit
   - PreToolUse: protect .env files
   - Stop: enforce tests pass
   - SessionStart: inject git context
4. **Permissions:**
   - Allow: test, lint, build commands
   - Deny: .env, secrets, rm -rf
5. **Custom Agents:**
   - security-reviewer (read-only, opus)
   - test-writer (can only write test files)
6. **MCP Servers:**
   - context7 (documentation)
   - server-github (if using GitHub)
7. **Skills:**
   - `/review` - code review workflow
   - `/deploy` - deployment checklist

---

## Sources

- [Hooks - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Claude Code Hooks: Complete Guide with 20+ Examples (aiorg.dev)](https://aiorg.dev/blog/claude-code-hooks)
- [Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Claude Code Customization (alexop.dev)](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)
- [Plugins README (anthropics/claude-code)](https://github.com/anthropics/claude-code/blob/main/plugins/README.md)
- [MCP Servers - Claude Code Docs](https://code.claude.com/docs/en/mcp)
- [Custom Subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [AskUserQuestion Tool Guide (atcyrus.com)](https://www.atcyrus.com/stories/claude-code-ask-user-question-tool-guide)
- [Writing a Good CLAUDE.md (humanlayer.dev)](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [Claude Code Settings Reference (claudefa.st)](https://claudefa.st/blog/guide/settings-reference)
- [Permissions Guide (eesel.ai)](https://www.eesel.ai/blog/claude-code-permissions)
- [Git Worktrees with Claude Code (muthu.co)](https://notes.muthu.co/2026/02/git-worktrees-with-claude-code-the-complete-guide/)
- [Shipping Faster with Worktrees (incident.io)](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees)
