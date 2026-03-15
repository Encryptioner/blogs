# Claude Code for Existing Projects: Onboarding Guide

> How to effectively onboard Claude Code onto an existing codebase. Step-by-step setup for CLAUDE.md, permissions, hooks, agents, and skills - with real examples from production projects.

---

## The Problem

You have an existing project with established patterns, conventions, and tribal knowledge. Claude Code knows nothing about it. Without proper setup, Claude will:

- Reinvent patterns you've already established
- Use `console.log` when you have a custom logger
- Write relative imports when you use path aliases
- Skip your Result pattern and use raw try/catch
- Ignore your test conventions

**The fix:** A 30-60 minute onboarding session that pays dividends across every future Claude session.

---

## Step 1: Generate Starter CLAUDE.md (5 minutes)

```bash
cd your-project
claude
# Inside Claude Code:
/init
```

This generates a starter CLAUDE.md from your project structure. Then refine it.

### What to Include

```markdown
# Project: [Name]
One-line description.

## Tech Stack
- [Language] [version]
- [Framework] [version]
- [Test framework]
- [Build tool]

## Commands
- `[package-manager] dev` - start dev server
- `[package-manager] test` - run tests
- `[package-manager] lint` - lint check
- `[package-manager] build` - production build

## Architecture
- `src/[dir]/` - [purpose]
- (repeat for each key directory)

## Code Conventions
- [Your patterns - Result types, error handling, imports]
- [Your naming conventions]
- [Your state management patterns]

## Critical Gotchas
- [Things Claude WILL get wrong without being told]
```

### What NOT to Include

- Formatting rules (use a linter - deterministic and faster)
- Information for rare situations (use skills instead)
- More than ~150 lines (brevity > completeness)
- User-specific preferences (use `CLAUDE.local.md`)

### Reference Detailed Docs

```markdown
See @docs/architecture.md for system design.
See @AGENTS.md for technology-specific gotchas.
```

---

## Step 2: Create AGENTS.md (Living Knowledge Base) (15 minutes)

AGENTS.md is a living document that persists learnings across agent iterations. Start from your team's tribal knowledge.

```markdown
# Agent Knowledge Base

## Project Patterns & Conventions
- Service Layer Pattern: all services return `{ success: boolean, data?: T, error?: string }`
- Import conventions: always use `@/` aliases
- Component patterns: all need `data-testid` for E2E
- State management: Zustand with specific selectors (not whole-state destructuring)

## Technology-Specific Gotchas
### [Your ORM/DB]
- [Common pitfall and fix]

### [Your UI Framework]
- [Common pitfall and fix]

### [Your Test Framework]
- [Common pitfall and fix]

## Lessons Learned
- [Date]: [What happened, what was the fix, which files]

## Recent Changes Log
- [Date]: [Changed X in Y files]

## Performance Notes
- [Bundle sizes, memory concerns, lazy loading requirements]
```

**Key principle:** Update AGENTS.md after every significant debugging session or discovery. It compounds in value.

---

## Step 3: Set Up Permissions (10 minutes)

Create `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm test)",
      "Bash(pnpm test:*)",
      "Bash(pnpm lint)",
      "Bash(pnpm type-check)",
      "Bash(pnpm build)",
      "Bash(pnpm validate)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git branch *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Write(./.env)",
      "Write(./.env.*)",
      "Bash(rm -rf *)",
      "Bash(git push --force *)",
      "Bash(DROP TABLE *)"
    ]
  }
}
```

Create `.claude/settings.local.json` for personal overrides (gitignored):

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm dev)"
    ]
  }
}
```

---

## Step 4: Add Hooks (10 minutes)

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\" 2>/dev/null || true"
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "bash -c 'FILE=$(cat | jq -r \".tool_input.file_path // empty\"); [[ \"$FILE\" == *.env* ]] && echo \"Protected file\" >&2 && exit 2 || exit 0'"
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "pnpm test --silent 2>/dev/null || (echo 'Tests must pass before finishing' >&2 && exit 2)"
        }]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [{
          "type": "command",
          "command": "echo '## Session Context' && git branch --show-current && git log --oneline -3 && echo '---' && git status --short | head -10"
        }]
      },
      {
        "matcher": "compact",
        "hooks": [{
          "type": "command",
          "command": "cat CLAUDE.md | head -50"
        }]
      }
    ]
  }
}
```

**What each does:**
- **PostToolUse (Write|Edit):** Auto-formats every file Claude creates or modifies
- **PreToolUse (Write|Edit):** Blocks writes to .env files
- **Stop:** Prevents Claude from claiming "done" if tests fail
- **SessionStart (startup):** Gives Claude git context immediately
- **SessionStart (compact):** Re-injects critical rules after context compression

---

## Step 5: Create Custom Agents (10 minutes)

```bash
mkdir -p .claude/agents
```

### Security Reviewer (Read-Only)

`.claude/agents/security-reviewer.md`:

```markdown
---
name: security-reviewer
description: Use for security audits, vulnerability scanning, credential checks, and reviewing code for OWASP top 10 issues.
model: opus
color: red
tools: Read, Glob, Grep, Bash(git diff *), Bash(git log *)
disallowedTools: Write, Edit
maxTurns: 15
---

# Security Reviewer

Check for:
1. Hardcoded secrets, API keys, credentials
2. SQL injection, XSS, CSRF vulnerabilities
3. Authentication/authorization bypass
4. Input validation gaps
5. Insecure dependencies

Report with severity: Critical / High / Medium / Low
```

### Test Writer (Can Only Write Test Files)

`.claude/agents/test-writer.md`:

```markdown
---
name: test-writer
description: Use when writing tests for existing code. Creates unit tests, integration tests, and E2E tests following project conventions.
model: sonnet
color: green
tools: Read, Glob, Grep, Bash(pnpm test *), Write(*.test.*), Write(*.spec.*), Edit(*.test.*), Edit(*.spec.*)
maxTurns: 25
---

# Test Writer

Follow project test conventions:
- Co-locate tests with source files
- Naming: "should [behavior] when [condition]"
- Use AAA pattern: Arrange, Act, Assert
- Mock external services, not internal logic
- Add data-testid for E2E tests
- Aim for edge cases, not just happy paths
```

---

## Step 6: Create Project-Specific Skills (Optional, 10 minutes)

### Code Review Skill

`.claude/skills/review/SKILL.md`:

```markdown
---
name: review
description: Review recent changes for quality, security, and adherence to project conventions.
allowed-tools: Read, Grep, Glob, Bash(git diff *), Bash(git log *)
---

# Code Review

1. Run `git diff --cached --name-only` and `git diff --name-only` to find changed files
2. Read each changed file
3. For each file, check:
   - Follows project conventions (from CLAUDE.md)
   - No security vulnerabilities
   - Proper error handling (Result pattern)
   - Tests exist for new/changed code
   - No `any` types, no console.log
4. Output structured review

$ARGUMENTS
```

### Validate Skill

`.claude/skills/validate/SKILL.md`:

```markdown
---
name: validate
description: Run full project validation - type check, lint, test, build.
allowed-tools: Bash(pnpm *), Read
---

# Full Validation

Run in order, stop on first failure:
1. `pnpm type-check`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`

Report results with pass/fail for each step.

$ARGUMENTS
```

---

## Step 7: Add MCP Servers (Optional, 5 minutes)

Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

Add GitHub integration if needed:

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

---

## Final File Structure

After onboarding, your project should have:

```
your-project/
  CLAUDE.md              # Main project context (in git)
  CLAUDE.local.md        # Personal overrides (gitignored)
  AGENTS.md              # Living knowledge base (in git)
  .mcp.json              # MCP server configs (in git)
  .claude/
    settings.json        # Permissions, hooks (in git)
    settings.local.json  # Personal settings (gitignored)
    agents/
      security-reviewer.md
      test-writer.md
    skills/
      review/
        SKILL.md
      validate/
        SKILL.md
```

Add to `.gitignore`:

```
CLAUDE.local.md
.claude/settings.local.json
```

---

## Onboarding Checklist

| Step | Time | Impact |
|------|------|--------|
| 1. `/init` + refine CLAUDE.md | 5 min | Critical - project context |
| 2. Create AGENTS.md | 15 min | High - technology gotchas |
| 3. Set up permissions | 10 min | High - safety + speed |
| 4. Add hooks | 10 min | High - auto-format, test enforcement |
| 5. Create custom agents | 10 min | Medium - specialized reviews |
| 6. Create skills | 10 min | Medium - repeatable workflows |
| 7. Add MCP servers | 5 min | Low-Medium - external integrations |
| **Total** | **~60 min** | **Compounds across every future session** |

---

## What to Do After Onboarding

### First Session

Ask Claude to explore the codebase:

```
Enter plan mode. Explore this codebase and tell me:
1. What patterns do you see?
2. What's unclear or inconsistent?
3. What would you add to CLAUDE.md or AGENTS.md?
```

Then update CLAUDE.md and AGENTS.md with any missing patterns Claude identifies.

### Ongoing Maintenance

After every significant session:

```
Based on what you learned in this session, what should we add to AGENTS.md?
```

Or use the `/claude-md-improver` skill if available.

### Team Adoption

1. Commit `.claude/settings.json`, `.claude/agents/`, `.claude/skills/`, CLAUDE.md, AGENTS.md
2. Each developer creates their own `CLAUDE.local.md` and `.claude/settings.local.json`
3. Review and update AGENTS.md in PRs (like you would README.md)

---

## Sources

- [Writing a Good CLAUDE.md (humanlayer.dev)](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [How to Write a Good CLAUDE.md (builder.io)](https://www.builder.io/blog/claude-md-guide)
- [Claude Code Customization (alexop.dev)](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)
- [Claude Code Best Practices (code.claude.com)](https://code.claude.com/docs/en/best-practices)
- [Claude Code Hooks: Complete Guide (aiorg.dev)](https://aiorg.dev/blog/claude-code-hooks)
- [Claude Code Permissions Guide (eesel.ai)](https://www.eesel.ai/blog/claude-code-permissions)
