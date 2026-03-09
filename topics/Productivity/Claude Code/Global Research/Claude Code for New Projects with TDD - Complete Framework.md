# Claude Code for New Projects with TDD: Complete Framework

> How to start a brand new project using Claude Code with Test-Driven Development from day one. Based on the proven TDD framework from browser-ide (5 phases, self-improving agent loop, 3-tier boundaries, quality gates).

---

## Why TDD with Claude Code?

Claude's default instinct is **implementation first, tests later**. This produces code that "looks right" but has subtle bugs. TDD inverts this:

1. **Tests are unambiguous targets** - Claude has a clear pass/fail signal
2. **Self-correction loop** - Hook runs tests -> Claude sees failure -> Claude fixes -> repeat
3. **Prevents scope creep** - Tests define exactly what's needed, nothing more
4. **Persistent quality** - Every feature has tests from the start

---

## Phase 0: Project Bootstrap (30 minutes)

### 0.1 Scaffold the Project

```bash
# Create project
mkdir my-project && cd my-project
git init

# Initialize with your stack
pnpm init
pnpm add -D typescript vitest @vitest/coverage-v8 prettier eslint
pnpm add -D @testing-library/react @testing-library/jest-dom  # if React
pnpm add -D playwright @playwright/test                        # for E2E

# Create structure
mkdir -p src/{components,services,store,hooks,types,utils}
mkdir -p tests/{e2e,integration,performance}
mkdir -p PRD .claude/{agents,skills,rules}
```

### 0.2 Create CLAUDE.md

```markdown
# Project: [Name]
[One-line description]

## Tech Stack
- TypeScript 5.x strict mode
- [Framework]
- Vitest + Playwright
- [Package manager]

## Commands
- `pnpm dev` - dev server
- `pnpm test` - run tests
- `pnpm test:watch` - watch mode
- `pnpm test:coverage` - coverage report
- `pnpm test:e2e` - E2E tests
- `pnpm lint` - ESLint
- `pnpm type-check` - TypeScript check
- `pnpm validate` - type-check + lint + build

## Architecture
- `src/services/` - Business logic (singleton services, Result<T> pattern)
- `src/components/` - UI components (data-testid required)
- `src/store/` - State management
- `src/types/` - TypeScript definitions (single source of truth)
- `src/utils/` - Utilities

## TDD Rules (CRITICAL)
- **ALWAYS write tests FIRST** - no implementation without a failing test
- Red-Green-Refactor: failing test -> minimal implementation -> clean up
- Test naming: "should [behavior] when [condition]"
- AAA pattern: Arrange, Act, Assert
- 80% coverage minimum (statements, branches, functions, lines)
- Co-locate tests: `Component.test.tsx` next to `Component.tsx`

## Code Conventions
- No `any` types (strict TypeScript)
- Use `@/` path aliases (never relative imports)
- All services return `Result<T>`: `{ success: boolean, data?: T, error?: string }`
- Use logger utility (never console.log)
- Add `data-testid` to all interactive elements
```

### 0.3 Create TDD-Enforcing Configuration

`.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm test *)",
      "Bash(pnpm test)",
      "Bash(pnpm test:watch *)",
      "Bash(pnpm test:coverage)",
      "Bash(pnpm test:e2e *)",
      "Bash(pnpm lint)",
      "Bash(pnpm type-check)",
      "Bash(pnpm build)",
      "Bash(pnpm validate)",
      "Bash(git *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Bash(rm -rf *)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\" 2>/dev/null || true"
        }]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "bash -c 'FILE=$CLAUDE_TOOL_INPUT_FILE_PATH; [[ \"$FILE\" == *.test.* ]] && pnpm test \"$FILE\" 2>&1 | tail -20 || exit 0'"
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "pnpm test --silent 2>/dev/null || (echo 'All tests must pass before finishing' >&2 && exit 2)"
        }]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [{
          "type": "command",
          "command": "echo '## TDD REMINDER: Write tests FIRST. Red-Green-Refactor.' && echo '---' && git branch --show-current 2>/dev/null && git log --oneline -3 2>/dev/null"
        }]
      }
    ]
  }
}
```

**What this enforces:**
- Every test file edit triggers an automatic test run (instant Red/Green feedback)
- Claude cannot finish a task unless all tests pass
- Every session starts with a TDD reminder

### 0.4 Create AGENTS.md

```markdown
# Agent Knowledge Base

## Project Patterns & Conventions
(Will be populated as project grows)

## Technology-Specific Gotchas
(Will be populated as gotchas are discovered)

## Lessons Learned
(Updated after each significant session)

## Recent Changes Log
(Track all changes with dates)
```

### 0.5 Create Agent Boundaries

`PRD/AGENT_BOUNDARIES.md`:

```markdown
# Agent Boundaries

## Tier 1: Always Do (Auto-Approved)
- Run type-check, lint, format, test, build before committing
- Write tests BEFORE implementation
- Use Result<T> pattern for all service functions
- Use @/ path aliases
- Use logger utility (never console.log)
- Add data-testid to all interactive elements
- Follow Red-Green-Refactor cycle

## Tier 2: Ask First (Requires Approval)
- Add/remove/update dependencies
- Modify database schema
- Change build configuration
- Modify authentication/security code
- Rename or move files

## Tier 3: Never Do
- Commit secrets, passwords, .env files
- Use `any` type
- Skip error handling
- Remove existing tests
- Commit to main directly
- Use console.log
- Skip the Red-Green-Refactor cycle

## Safeguards
- Max 5 retry attempts per task
- Max 10 files modified per task
- Max 500 line changes per file
- Stop on: error loop, scope creep, uncertainty
```

---

## Phase 1: Architecture & Standards (Developer Responsibility)

Before Claude writes any code, YOU define the architecture.

### 1.1 Create the Spec

`PRD/SPEC.md`:

```markdown
# [Project Name] Specification

## Requirements
- FR-001: [Functional Requirement 1]
- FR-002: [Functional Requirement 2]
- ...

## Architecture
[High-level system design]

## Data Model
[Types, interfaces, database schema]

## API Design
[Endpoints, service interfaces]
```

### 1.2 Define the Type Foundation

`src/types/index.ts`:

```typescript
// Result pattern - all services use this
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Define your domain types here FIRST
// These drive the tests that drive the implementation
```

### 1.3 Create Test Infrastructure

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // or 'jsdom'
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Phase 2: AI Planning (Use Plan Mode)

Now bring Claude in. Start every feature with Plan Mode.

```
Enter plan mode. I want to implement [feature] for [project].

Here is the spec: @PRD/SPEC.md
Here are the types: @src/types/index.ts

Create a detailed implementation plan with:
1. Which files to create/modify
2. What tests to write (test cases, not implementations)
3. What order to implement (dependencies)
4. Any architectural decisions needed
```

Claude explores, asks questions via AskUserQuestion, and produces a plan. You approve before any code is written.

---

## Phase 3: Test Case Development (The Red Phase)

This is the core TDD step. Claude writes ONLY tests.

### The Prompt Pattern

```
Implement the tests for [feature] following TDD.

CRITICAL RULES:
1. Write tests ONLY. Do NOT write any implementation code.
2. Tests should fail when run (we're in the Red phase).
3. Each test maps to a requirement from the spec.
4. Follow AAA pattern: Arrange, Act, Assert.
5. Name tests: "should [behavior] when [condition]"
6. Add edge cases: empty input, null, boundary values, error paths.

Files to create:
- src/services/[service].test.ts
- src/components/[component].test.tsx

Run the tests after writing. Confirm they all FAIL.
```

### Example Output

```typescript
// src/services/auth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '@/services/auth';

describe('AuthService', () => {
  describe('login', () => {
    it('should return success with token when credentials are valid', async () => {
      const service = new AuthService();
      const result = await service.login('user@test.com', 'validpass');
      expect(result.success).toBe(true);
      expect(result.data?.token).toBeDefined();
    });

    it('should return error when email is invalid', async () => {
      const service = new AuthService();
      const result = await service.login('invalid-email', 'pass');
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid email');
    });

    it('should return error when password is empty', async () => {
      const service = new AuthService();
      const result = await service.login('user@test.com', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('password required');
    });
  });
});
```

The PostToolUse hook automatically runs these tests. Claude sees all RED. Good.

---

## Phase 4: AI Code Generation (The Green Phase)

Now Claude writes the minimum implementation to make tests pass.

### The Prompt Pattern

```
Now implement the minimum code to make all tests in [file] pass.

RULES:
1. Write the MINIMUM code to pass each test. No gold-plating.
2. Follow the Result<T> pattern from types/index.ts.
3. Use @/ path aliases.
4. Use the logger utility (never console.log).
5. Run tests after each file change.
6. Stop when all tests are GREEN.
```

The PostToolUse hook provides instant feedback: every file write triggers test run. Claude iterates until green.

---

## Phase 5: Refactor (The Refactor Phase)

With green tests as a safety net, improve the code.

```
All tests pass. Now refactor for clarity:
1. Extract common patterns into utilities
2. Improve naming
3. Remove duplication
4. Ensure error messages are helpful
5. Run tests after EVERY change to ensure they stay GREEN.
```

---

## The Self-Improving Agent Loop

After each feature cycle, update the knowledge base:

```
Based on this session:
1. What gotchas did you discover? Add them to AGENTS.md.
2. What patterns worked well? Document them.
3. What would you do differently? Note it as a lesson learned.
4. Update the Recent Changes Log.
```

### The 7-Step Cycle

```
1. Select Task (from spec/TODO)
     ↓
2. Write Tests (Red phase - tests fail)
     ↓
3. Implement (Green phase - tests pass)
     ↓
4. Fix & Retry (if tests fail, iterate)
     ↓
5. Refactor (improve while green)
     ↓
6. Commit (with conventional commit message)
     ↓
7. Log Learnings (update AGENTS.md)
     ↓
   Reset Context → Next Task
```

### Why Reset Context?

Claude's quality degrades as context fills. After each feature (or after ~30 minutes of work), start a new session. The task files and AGENTS.md persist, so nothing is lost.

---

## Quality Gates

Build these checkpoints into your workflow:

| Gate | When | What |
|------|------|------|
| G1: Plan Review | Before coding | Developer approves the plan |
| G2: Test Review | After Red phase | Developer reviews test cases |
| G3: Implementation Review | After Green phase | Tests pass, code reviewed |
| G4: Refactor Review | After Refactor | Code clean, tests still green |
| G5: Coverage Check | Before commit | 80%+ coverage |
| G6: Full Validation | Before PR | `pnpm validate` passes |
| G7: Security Scan | Before merge | No secrets, no vulnerabilities |

---

## The Modular Prompt Strategy

Don't overwhelm Claude with all instructions at once. Use phase-specific prompts:

| Phase | What Claude Needs |
|-------|-------------------|
| Planning | Spec + types + architecture only |
| Testing | Spec + types + test patterns only |
| Implementation | Tests + types + code conventions only |
| Refactoring | Implementation + test results only |

This is why CLAUDE.md should be concise (~150 lines) - it's loaded every session. Phase-specific details go in skills or the prompt itself.

---

## Requirement Traceability

Map every test to a requirement:

```typescript
// FR-AUTH-001: User can log in with email and password
describe('FR-AUTH-001: Login', () => {
  it('should authenticate valid credentials', ...);
  it('should reject invalid email', ...);
  it('should reject empty password', ...);
});

// FR-AUTH-002: User can reset password
describe('FR-AUTH-002: Password Reset', () => {
  it('should send reset email', ...);
  it('should reject unknown email', ...);
});
```

This creates a direct spec -> test -> implementation chain.

---

## TDD Agents (Optional Power Setup)

### Test-Writer Agent (Can Only Write Tests)

`.claude/agents/test-writer.md`:

```markdown
---
name: test-writer
description: Writes failing tests from requirements. Use during the Red phase of TDD.
model: sonnet
color: red
tools: Read, Glob, Grep, Write(*.test.*), Write(*.spec.*), Edit(*.test.*), Edit(*.spec.*), Bash(pnpm test *)
disallowedTools: Write(src/*.ts), Write(src/*.tsx), Edit(src/*.ts), Edit(src/*.tsx)
maxTurns: 20
---

# Test Writer Agent

You write FAILING tests. You NEVER write implementation code.

Follow:
- AAA pattern (Arrange, Act, Assert)
- Name: "should [behavior] when [condition]"
- Include edge cases
- Map each test to a requirement (FR-*)
- Run tests after writing - ALL must FAIL
```

### Implementer Agent (Cannot Touch Tests)

`.claude/agents/implementer.md`:

```markdown
---
name: implementer
description: Writes minimum implementation to pass failing tests. Use during the Green phase of TDD.
model: sonnet
color: green
tools: Read, Glob, Grep, Write(src/*.ts), Write(src/*.tsx), Edit(src/*.ts), Edit(src/*.tsx), Bash(pnpm test *)
disallowedTools: Write(*.test.*), Write(*.spec.*), Edit(*.test.*), Edit(*.spec.*)
maxTurns: 25
---

# Implementer Agent

You write MINIMUM code to make tests pass. You NEVER modify test files.

Follow:
- Result<T> pattern for services
- @/ path aliases
- Logger utility (never console.log)
- data-testid on interactive elements
- Run tests after each change
- Stop when ALL tests pass
```

### Separation Benefit

The test-writer **cannot** write implementation code. The implementer **cannot** modify tests. This enforces TDD discipline at the tool level, not just the prompt level.

---

## New Project TDD Checklist

```
Day 1 (Setup):
[ ] Scaffold project structure
[ ] Create CLAUDE.md with TDD rules
[ ] Create AGENTS.md (empty template)
[ ] Create agent boundaries (PRD/AGENT_BOUNDARIES.md)
[ ] Set up .claude/settings.json (permissions + hooks)
[ ] Create test-writer and implementer agents
[ ] Configure vitest with 80% coverage thresholds
[ ] Set up Playwright for E2E
[ ] Write first spec (PRD/SPEC.md)
[ ] Define type foundation (src/types/index.ts)

Day 2+ (Development Cycle):
For each feature:
  [ ] Plan Mode: explore and plan
  [ ] Red: write failing tests
  [ ] Green: implement minimum code
  [ ] Refactor: clean up while green
  [ ] Commit: conventional commit
  [ ] Log: update AGENTS.md
  [ ] Reset: new session for next feature
```

---

## Sources

- browser-ide TDD_APPROACH.md (5-phase framework, self-improving loop)
- browser-ide AGENT_SPEC.md (6-section agent spec based on Addy Osmani's Good Spec)
- browser-ide AGENT_BOUNDARIES.md (3-tier boundary system)
- browser-ide AGENTS.md (living knowledge base pattern)
- [Claude Code TDD - The New Stack](https://thenewstack.io/claude-code-and-the-art-of-test-driven-development/)
- [Forcing Claude Code to TDD (alexop.dev)](https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/)
- [Claude Code Best Practices (code.claude.com)](https://code.claude.com/docs/en/best-practices)
- [Claude Code Hooks Guide (code.claude.com)](https://code.claude.com/docs/en/hooks)
