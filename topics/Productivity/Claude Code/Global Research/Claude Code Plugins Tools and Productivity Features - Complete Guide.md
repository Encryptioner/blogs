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

## 3. Skills & Custom Commands (Slash Commands)

Skills are reusable markdown workflows invoked as `/command-name`. Since Claude Code v2.1.3, slash commands and skills are unified - a file at `.claude/commands/review.md` and a skill at `.claude/skills/review/SKILL.md` both create `/review`.

### File Locations

| Location | Type | Scope |
|----------|------|-------|
| `.claude/skills/<name>/SKILL.md` | Skill (new) | Project (shared via git) |
| `~/.claude/skills/<name>/SKILL.md` | Skill (new) | Global (all projects) |
| `.claude/commands/<name>.md` | Command (legacy) | Project (shared via git) |
| `~/.claude/commands/<name>.md` | Command (legacy) | Global (all projects) |

**Skills are recommended** over commands because they support directory structures with supporting files, frontmatter controls, and progressive context loading.

### SKILL.md Format

```markdown
---
name: code-review
description: Reviews code for quality, security, and best practices. Use when analyzing PRs, diffs, or checking code quality.
allowed-tools: Read, Grep, Glob, Bash(git diff *)
---

# Code Review Workflow

1. Run `git diff --name-only` to identify changed files
2. Read each changed file
3. Check for: security issues, logic errors, style violations
4. Output structured review with severity levels

$ARGUMENTS
```

### All YAML Frontmatter Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Becomes `/command-name`. Max 64 chars, lowercase letters/numbers/hyphens |
| `description` | Yes | string | **Primary trigger for auto-invocation.** Include what + when + when-not |
| `allowed-tools` | No | array | Tools Claude can use without permission prompts |
| `disable-model-invocation` | No | boolean | `true` = only user can invoke (not auto). For dangerous ops |
| `user-invocable` | No | boolean | `false` = only Claude can invoke. For internal helpers |
| `context` | No | string | `fork` = runs in isolated sub-agent context |
| `agent` | No | string | Which agent to use with `context: fork` |

### Invocation Control Matrix

| Configuration | User Can Invoke? | Claude Auto-Invokes? | Use Case |
|---------------|------------------|----------------------|----------|
| (defaults) | Yes | Yes | Normal skill |
| `disable-model-invocation: true` | Yes | **No** | Dangerous ops: deploy, commit, send |
| `user-invocable: false` | **No** | Yes | Internal helpers, background knowledge |

### `$ARGUMENTS` Variable

Everything typed after the command is passed as `$ARGUMENTS`:

```
/deploy staging     → $ARGUMENTS = "staging"
/fix-issue 123      → $ARGUMENTS = "123"
/translate Spanish Hello world → $ARGUMENTS = "Spanish Hello world"
```

Positional access: `$ARGUMENTS[0]`, `$ARGUMENTS[1]`, or shorthand `$0`, `$1`.

If `$ARGUMENTS` is not referenced in SKILL.md, it's auto-appended at the end.

### Directory-Based Skill (with Supporting Files)

Skills use three-level progressive context loading:

```
.claude/skills/
  dexie-expert/
    SKILL.md           # Level 2: loaded when skill triggers (<5K words)
    scripts/            # Level 3: loaded on-demand
      validate-schema.ts
    references/         # Level 3: loaded on-demand
      PATTERNS.md
      MIGRATIONS.md
    assets/             # NOT loaded into context (for output templates)
      template.html
```

**Level 1** (always): name + description (~100 tokens) - for discovery
**Level 2** (when triggered): full SKILL.md body
**Level 3** (as needed): scripts/, references/ - loaded during execution

### Namespaced Commands via Subdirectories

```
.claude/commands/
  posts/
    new.md            → invoked as /posts:new
  deploy/
    staging.md        → invoked as /deploy:staging
    production.md     → invoked as /deploy:production
```

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

### Context Fork (Isolated Execution)

```yaml
---
name: deep-research
description: Research a topic thoroughly with extensive analysis.
context: fork
agent: Explore
---
```

Runs in an isolated sub-agent with separate conversation history. Main context stays clean. Use for long analyses, research, or skills that generate extensive output.

---

### Creating Custom Commands: Complete Examples

Here are practical, real-world custom commands you can add to any project.

#### Example 1: Interview & Spec Writer

Creates a detailed spec by interviewing the developer using AskUserQuestion.

`.claude/skills/interview-spec/SKILL.md`:

```markdown
---
name: interview-spec
description: Interview the developer in detail about a feature using AskUserQuestion, then write a comprehensive spec. Use when planning new features, writing PRDs, or capturing detailed requirements.
disable-model-invocation: true
---

# Feature Interview & Spec Writer

You are a senior product engineer conducting a detailed feature interview.

## Interview Process

Interview the developer using the AskUserQuestion tool about $ARGUMENTS.
Ask questions in rounds. Each round should have 2-4 focused questions.
Continue until all aspects are covered.

### Round 1: Core Concept
- What problem does this solve? Who is the user?
- What's the scope? (MVP vs full vision)
- Are there existing patterns in the codebase to follow?

### Round 2: Technical Implementation
- What components/services need to change?
- What new types/interfaces are needed?
- What's the data model? State management approach?
- Are there performance constraints?

### Round 3: UI & UX
- What's the user flow? Entry points?
- What does the error state look like?
- What's the loading state? Empty state?
- Mobile/responsive considerations?

### Round 4: Edge Cases & Tradeoffs
- What happens with invalid input?
- What are the security implications?
- What tradeoffs are we making? What are we NOT building?
- What could go wrong? Failure modes?

### Round 5: Testing & Acceptance
- What are the acceptance criteria?
- What tests should be written?
- How do we verify this works end-to-end?

## Important Rules
- Ask non-obvious questions. Skip anything that's self-evident.
- Push back on vague answers. Ask for specifics.
- Identify hidden complexity the developer might not have considered.
- After each round, summarize what you've learned before proceeding.
- Continue interviewing until the feature is fully specified.

## Output

After the interview is complete, write a comprehensive spec to `PRD/specs/$ARGUMENTS.md` with:

```
# Feature Spec: [Name]

## Overview
[One paragraph summary]

## Requirements
- FR-001: [Requirement 1]
- FR-002: [Requirement 2]

## Technical Design
### Architecture
### Data Model
### API/Service Changes
### State Management

## UI/UX
### User Flow
### Wireframes (ASCII)
### Error States
### Loading States

## Edge Cases & Error Handling

## Security Considerations

## Testing Plan
- Unit tests
- Integration tests
- E2E tests

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Out of Scope

## Open Questions
```
```

**Usage:** `/interview-spec git-blame-feature`

---

#### Example 2: Manual Test Case Generator

Generates structured manual test cases for QA with a standard template.

`.claude/skills/manual-test-cases/SKILL.md`:

```markdown
---
name: manual-test-cases
description: Generate manual test cases for new features and regression testing. Outputs structured test cases with ID, Portal, Module, Test Case, Pre Conditions, Steps, Expected Result, and Priority. Use when writing QA test plans, creating test documentation, or preparing for manual testing rounds.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write
---

# Manual Test Case Generator

Generate comprehensive manual test cases for $ARGUMENTS.

## Process

1. **Read the feature code/spec** - Understand what was built or changed
2. **Identify test scenarios** - Cover:
   - Happy path (normal usage)
   - Boundary values (min/max/empty/large)
   - Error handling (invalid input, network failure, permission denied)
   - Regression (ensure existing functionality still works)
   - Security (XSS, injection, unauthorized access)
   - Accessibility (keyboard navigation, screen reader)
   - Cross-browser/device (if applicable)
3. **Generate test cases** in the standard format below

## Test Case Format

Output a Markdown table with these columns:

| ID | Portal | Module | Test Case | Pre Conditions | Steps | Expected Result | Priority |
|----|--------|--------|-----------|----------------|-------|-----------------|----------|

### Column Definitions

- **ID**: Sequential identifier. Format: `TC-[MODULE]-[NUMBER]` (e.g., `TC-AUTH-001`)
- **Portal**: Which application/platform (e.g., `Web App`, `Mobile App`, `Admin Panel`, `API`)
- **Module**: Feature area (e.g., `Authentication`, `File Explorer`, `Git`, `Terminal`)
- **Test Case**: Clear, concise test case title starting with a verb (e.g., "Verify user can login with valid credentials")
- **Pre Conditions**: What must be true BEFORE the test runs (e.g., "User is logged in", "Project is open", "Git repo initialized")
- **Steps**: Numbered steps to reproduce. Be specific with UI elements and actions
- **Expected Result**: What should happen. Be precise and measurable
- **Priority**: `P0` (Critical - blocks release), `P1` (High - core functionality), `P2` (Medium - important but not blocking), `P3` (Low - nice to have)

## Priority Guidelines

| Priority | Criteria | Examples |
|----------|----------|---------|
| **P0** | Data loss, security breach, app crash, login failure | Cannot save file, XSS vulnerability, app freezes |
| **P1** | Core feature broken, major UX issue | Editor not loading, terminal not responding, git commit fails |
| **P2** | Feature works but imperfect, minor UX issues | Styling off, slow performance, missing tooltip |
| **P3** | Cosmetic, edge cases unlikely in production | Alignment pixel-off, rare timezone issue |

## Test Case Categories

### New Feature Tests
Test the NEW functionality end-to-end:
- All user-facing workflows
- All API endpoints (if applicable)
- State transitions
- Error handling and recovery

### Regression Tests
Ensure EXISTING features still work:
- Features that share code/services with the new feature
- Features that depend on modified data models
- UI components that were refactored
- APIs that changed signature or behavior

Mark regression tests with `[REGRESSION]` prefix in the Test Case column.

## Output

Write test cases to `tests/manual/[module-name]-test-cases.md`.

If the file exists, APPEND new test cases (don't overwrite existing ones).

Include a header with:
- Feature/module name
- Date generated
- Total test case count by priority
- Coverage summary (which areas are covered)

## Example Output

```markdown
# Manual Test Cases: Git Blame Feature

**Date:** 2026-02-20
**Total:** 12 test cases (P0: 2, P1: 4, P2: 4, P3: 2)
**Coverage:** Happy path, error handling, regression, edge cases

| ID | Portal | Module | Test Case | Pre Conditions | Steps | Expected Result | Priority |
|----|--------|--------|-----------|----------------|-------|-----------------|----------|
| TC-BLAME-001 | Web App | Git | Verify blame annotations show for tracked file | 1. Project open 2. Git repo initialized 3. File has commits | 1. Open a tracked file in editor 2. Click "Toggle Blame" in status bar | Inline blame annotations appear showing author, date, and commit hash for each line | P1 |
| TC-BLAME-002 | Web App | Git | Verify blame handles file not in git | 1. Project open 2. New unsaved file open | 1. Open a new untitled file 2. Click "Toggle Blame" | Toast notification: "File is not tracked by git" | P2 |
| TC-BLAME-003 | Web App | Git | [REGRESSION] Verify editor still opens files after blame feature | 1. Project open | 1. Click any file in File Explorer 2. Verify file opens in editor 3. Edit the file 4. Save | File opens, edits are accepted, save works normally | P0 |
```
```

**Usage:**
- `/manual-test-cases git-blame-feature`
- `/manual-test-cases authentication-redesign`
- `/manual-test-cases terminal-split-panes`

---

#### Example 3: Simple Deploy Command (Manual-Only)

`.claude/commands/deploy.md` (legacy format, still works):

```markdown
Deploy the application to $ARGUMENTS environment.

1. Run `pnpm validate` (type-check + lint + build)
2. If validation fails, STOP and report errors
3. Run `pnpm test` - all tests must pass
4. If deploying to production:
   - Confirm with user before proceeding
   - Tag the release: `git tag v$(date +%Y%m%d-%H%M%S)`
5. Execute: `pnpm deploy:$ARGUMENTS`
6. Run smoke tests against deployed environment
7. Report deployment status
```

**Usage:** `/deploy staging` or `/deploy production`

---

#### Example 4: Component Generator with Template

`.claude/skills/new-component/SKILL.md`:

```markdown
---
name: new-component
description: Scaffold a new React component with test file, types, and proper conventions.
disable-model-invocation: true
allowed-tools: Write, Read, Glob
---

# New Component Generator

Create a new component named $ARGUMENTS.

## Files to Create

1. `src/components/$ARGUMENTS/$ARGUMENTS.tsx` - Component implementation
2. `src/components/$ARGUMENTS/$ARGUMENTS.test.tsx` - Test file
3. `src/components/$ARGUMENTS/index.ts` - Re-export

## Component Template

- Use named export (not default)
- Add `data-testid="$ARGUMENTS"` to root element
- Use `@/` path aliases for imports
- Use Tailwind CSS + clsx for styling
- Accept `className` prop for composition
- Use specific Zustand selectors (not whole-state destructuring)

## Test Template

- Import from the component file
- Test rendering
- Test user interactions
- Test edge cases (empty props, loading state)
- Use `screen.getByTestId('$ARGUMENTS')` for queries
```

**Usage:** `/new-component FilePreview`

---

#### Example 5: PR Description Generator

`.claude/skills/pr-description/SKILL.md`:

```markdown
---
name: pr-description
description: Generate a comprehensive PR description from git diff and commit history.
disable-model-invocation: true
allowed-tools: Bash(git *)
---

# PR Description Generator

Generate a pull request description for the current branch.

## Steps

1. Run `git log main..HEAD --oneline` to get all commits
2. Run `git diff main...HEAD --stat` to get changed files summary
3. Run `git diff main...HEAD` to get full diff
4. Analyze the changes and generate:

## Output Format

```markdown
## Summary
[2-3 bullet points explaining WHAT changed and WHY]

## Changes
- [File-level breakdown of what was modified]

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Screenshots
[If UI changes, note where screenshots should go]

## Checklist
- [ ] Code follows project conventions
- [ ] No `any` types introduced
- [ ] Error handling follows Result<T> pattern
- [ ] data-testid added to new interactive elements
```

$ARGUMENTS
```

**Usage:** `/pr-description` or `/pr-description --include-screenshots`

---

#### Example 6: Database Migration Skill with Script

`.claude/skills/create-migration/SKILL.md`:

```markdown
---
name: create-migration
description: Create a database migration for Dexie.js schema changes.
disable-model-invocation: true
allowed-tools: Read, Write, Bash(pnpm test *)
---

# Dexie Migration Generator

Create a migration for: $ARGUMENTS

## Process

1. Read current schema from `src/lib/database.ts`
2. Read `references/MIGRATION_GUIDE.md` for patterns
3. Increment the Dexie version number
4. Add the new table/index/column
5. Write migration code with proper upgrade function
6. Run `pnpm test src/lib/database.test.ts` to verify

## Rules

- ALWAYS increment version number
- ALWAYS use transactions for data migrations
- NEVER delete existing stores without a migration path
- Test with both fresh install and upgrade from previous version

See `references/MIGRATION_GUIDE.md` for detailed patterns.
```

`.claude/skills/create-migration/references/MIGRATION_GUIDE.md`:

```markdown
# Dexie Migration Patterns

## Adding a New Store
db.version(N).stores({ newStore: '++id, field1, field2' });

## Adding an Index
db.version(N).stores({ existingStore: '++id, field1, *newField' });

## Data Migration
db.version(N).stores({...}).upgrade(tx => {
  return tx.table('store').toCollection().modify(item => {
    item.newField = defaultValue;
  });
});
```

---

### How to Add Commands to Your Project (Step by Step)

#### Method 1: Skills (Recommended)

```bash
# Create the skill directory
mkdir -p .claude/skills/my-skill

# Create the SKILL.md
cat > .claude/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: What this skill does and when to use it.
---

# My Skill

Instructions here. $ARGUMENTS
EOF

# Commit to share with team
git add .claude/skills/my-skill/
git commit -m "Add /my-skill custom command"
```

#### Method 2: Commands (Legacy, Simpler)

```bash
# Create the commands directory
mkdir -p .claude/commands

# Create the command
cat > .claude/commands/my-command.md << 'EOF'
Do something with $ARGUMENTS.

1. Step one
2. Step two
3. Step three
EOF

# Commit to share with team
git add .claude/commands/my-command.md
git commit -m "Add /my-command custom command"
```

#### Method 3: Personal Global Commands

```bash
# Available across ALL your projects (not shared with team)
mkdir -p ~/.claude/skills/my-personal-skill
# Create SKILL.md in there
```

### Best Practices for Custom Commands

1. **Keep each skill focused on ONE purpose** - `/review` not `/review-and-deploy-and-test`
2. **Make `description` specific with trigger keywords** - Claude uses this for auto-detection
3. **Use `disable-model-invocation: true` for dangerous ops** - deploy, commit, send messages
4. **Include error handling in instructions** - what to do when steps fail
5. **Use skills (not CLAUDE.md) for domain knowledge** that only applies sometimes
6. **Use `allowed-tools` to restrict permissions** - prevents accidental writes in review skills
7. **Test with varied phrasings** if relying on auto-invocation
8. **Namespace with subdirectories** for large command libraries: `/deploy:staging`, `/deploy:production`
9. **Commit `.claude/skills/` and `.claude/commands/` to git** - the whole team benefits
10. **Use `context: fork` for long analyses** - keeps main conversation clean

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
