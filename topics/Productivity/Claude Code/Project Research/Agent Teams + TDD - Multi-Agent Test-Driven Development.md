# Agent Teams + TDD: Multi-Agent Test-Driven Development

> Combining Claude Code Agent Teams with Test-Driven Development for maximum productivity. How to use multiple agents that enforce Red-Green-Refactor at the tool level, with plan approval gates, self-improving loops, and parallel testing.

---

## Why Combine Agent Teams with TDD?

**TDD alone** gives you: failing test -> implementation -> refactor. One agent, sequential.

**Agent Teams alone** give you: parallel work across subsystems. But without TDD discipline, agents produce "looks right" code without verification.

**Combined**, you get:
- **Tool-enforced TDD** - test-writer agent literally cannot write implementation; implementer cannot modify tests
- **Parallel Red-Green-Refactor** - multiple features in TDD simultaneously
- **Plan approval gates** - lead reviews plans before agents execute
- **Self-correction loops** - hooks auto-run tests, agents auto-fix failures
- **Persistent quality** - AGENTS.md captures learnings across sessions

---

## Architecture: The Agent + TDD Stack

```
                    TEAM LEAD (Coordinator)
                    - Creates tasks with dependencies
                    - Reviews plans before approval
                    - Synthesizes results
                    - Updates AGENTS.md
                         |
          +--------------+--------------+
          |              |              |
    TEST-WRITER    IMPLEMENTER    REFACTORER
    (Red Phase)    (Green Phase)  (Clean Phase)
    - Writes tests  - Min code     - Improves code
    - Cannot write   - Cannot        - Tests must
      implementation   touch tests    stay green
    - Must produce   - Runs tests   - Read-only
      failing tests    after each     on tests
                       change
```

### The Pipeline

```
Task 1: "Implement auth service"
  ↓
  test-writer writes failing tests (Red)
  ↓ blocked until Red complete
  implementer writes minimum code (Green)
  ↓ blocked until Green complete
  refactorer cleans up code (Refactor)
  ↓ blocked until Refactor complete
  lead reviews + commits

Task 2: "Implement file service" (runs in PARALLEL with Task 1)
  ↓
  test-writer writes failing tests (Red)
  ↓
  implementer writes minimum code (Green)
  ↓
  refactorer cleans up (Refactor)
```

---

## Setup

### Agent Definitions

`.claude/agents/tdd-test-writer.md`:

```markdown
---
name: tdd-test-writer
description: TDD Red Phase agent. Writes failing tests from requirements. NEVER writes implementation code.
model: sonnet
color: red
tools: Read, Glob, Grep, Write(*.test.*), Write(*.spec.*), Edit(*.test.*), Edit(*.spec.*), Bash(pnpm test *)
disallowedTools: Write(src/*.ts), Write(src/*.tsx), Edit(src/*.ts), Edit(src/*.tsx)
maxTurns: 20
---

# TDD Test Writer (Red Phase)

You write FAILING tests. You NEVER write implementation code.

## Rules
1. Read the requirement/spec carefully
2. Write tests using AAA pattern (Arrange, Act, Assert)
3. Name: "should [behavior] when [condition]"
4. Include edge cases: empty input, null, boundary values, error paths
5. Map each test to a requirement ID
6. Run tests after writing - ALL must FAIL (this is correct!)
7. Message the team when Red phase is complete

## Test Structure
- Unit tests: `src/[module]/[file].test.ts`
- Component tests: `src/components/[Component].test.tsx`
- E2E tests: `tests/e2e/[feature].spec.ts`

## Report Format
When done, message the lead with:
- Number of test cases written
- All test names
- Confirmation all tests FAIL
```

`.claude/agents/tdd-implementer.md`:

```markdown
---
name: tdd-implementer
description: TDD Green Phase agent. Writes MINIMUM implementation to make failing tests pass. NEVER modifies test files.
model: sonnet
color: green
tools: Read, Glob, Grep, Write(src/**/*.ts), Write(src/**/*.tsx), Edit(src/**/*.ts), Edit(src/**/*.tsx), Bash(pnpm test *)
disallowedTools: Write(*.test.*), Write(*.spec.*), Edit(*.test.*), Edit(*.spec.*)
maxTurns: 30
---

# TDD Implementer (Green Phase)

You write MINIMUM code to make tests pass. You NEVER modify test files.

## Rules
1. Read the failing tests carefully - they are your specification
2. Write the simplest code that makes each test pass
3. Follow project conventions: Result<T>, @/ aliases, logger
4. Run tests after EVERY file change
5. Stop the moment ALL tests pass
6. Do NOT add features or code not required by tests
7. Message the team when Green phase is complete

## Report Format
When done, message the lead with:
- All tests passing (output)
- Files created/modified
- Any concerns about the test design
```

`.claude/agents/tdd-refactorer.md`:

```markdown
---
name: tdd-refactorer
description: TDD Refactor Phase agent. Improves code quality while keeping tests green. Read-only on test files.
model: sonnet
color: blue
tools: Read, Glob, Grep, Write(src/**/*.ts), Write(src/**/*.tsx), Edit(src/**/*.ts), Edit(src/**/*.tsx), Bash(pnpm test *)
disallowedTools: Write(*.test.*), Write(*.spec.*), Edit(*.test.*), Edit(*.spec.*)
maxTurns: 15
---

# TDD Refactorer (Refactor Phase)

You improve code quality while keeping ALL tests green.

## Rules
1. Run tests FIRST to confirm baseline green
2. Refactor one thing at a time
3. Run tests after EVERY change
4. If any test fails, UNDO the last change immediately
5. Focus on: naming, duplication, extraction, clarity
6. Do NOT add new functionality
7. Message the team when refactoring is complete

## Refactoring Checklist
- [ ] Names are descriptive and consistent
- [ ] No code duplication
- [ ] Functions are small and focused
- [ ] Error messages are helpful
- [ ] Types are precise (no `any`)
- [ ] Imports use @/ aliases
```

### Hooks for TDD Enforcement

`.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Bash(pnpm test *)",
      "Bash(pnpm test)",
      "Bash(pnpm lint)",
      "Bash(pnpm type-check)",
      "Bash(pnpm build)",
      "Bash(pnpm validate)",
      "Bash(git *)"
    ],
    "deny": [
      "Read(./.env)",
      "Bash(rm -rf *)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\" 2>/dev/null || true"
          },
          {
            "type": "command",
            "command": "bash -c 'FILE=$CLAUDE_TOOL_INPUT_FILE_PATH; [[ \"$FILE\" == *.test.* || \"$FILE\" == *.spec.* ]] && pnpm test \"$FILE\" 2>&1 | tail -30 || exit 0'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "pnpm test --silent 2>/dev/null || (echo 'Tests must pass before finishing' >&2 && exit 2)"
        }]
      }
    ]
  }
}
```

---

## Pattern 1: Sequential TDD Pipeline (Single Feature)

Best for: Features with clear dependencies between tests and implementation.

### Prompt

```
Create an agent team called "tdd-auth" for implementing the authentication service.

Task pipeline:
1. "tdd-test-writer" (Red Phase):
   - Read @PRD/SPEC.md requirements FR-AUTH-001 through FR-AUTH-005
   - Read @src/types/index.ts for type definitions
   - Write failing tests in src/services/auth.test.ts
   - Include: valid login, invalid email, wrong password, token expiry, logout
   - Run tests. Confirm ALL FAIL. Message me when done.

2. "tdd-implementer" (Green Phase):
   - BLOCKED BY task 1
   - Read the failing tests in src/services/auth.test.ts
   - Write src/services/auth.ts with minimum code to pass all tests
   - Follow Result<T> pattern, @/ aliases, logger
   - Run tests after each change. Stop when ALL PASS. Message me when done.

3. "tdd-refactorer" (Refactor Phase):
   - BLOCKED BY task 2
   - Read src/services/auth.ts implementation
   - Improve naming, extract helpers, reduce duplication
   - Run tests after each change. ALL must stay GREEN.
   - Message me when done.

I will review the output of each phase before approving the next.
```

### What Happens

```
test-writer → writes 12 failing tests → messages lead
lead reviews → approves
implementer → writes auth.ts (120 lines) → all 12 tests pass → messages lead
lead reviews → approves
refactorer → extracts validation helper, improves names → still green → messages lead
lead reviews → commits
```

---

## Pattern 2: Parallel TDD Pipelines (Multiple Features)

Best for: Multiple independent features that can be developed simultaneously.

### Prompt

```
Create an agent team called "tdd-sprint" for implementing 3 independent services.

PARALLEL PIPELINE A (Auth):
- Task A1: test-writer writes src/services/auth.test.ts (Red)
- Task A2: implementer writes src/services/auth.ts (Green) - blocked by A1
- Task A3: refactorer cleans auth.ts - blocked by A2

PARALLEL PIPELINE B (FileSystem):
- Task B1: test-writer writes src/services/filesystem.test.ts (Red)
- Task B2: implementer writes src/services/filesystem.ts (Green) - blocked by B1
- Task B3: refactorer cleans filesystem.ts - blocked by B2

PARALLEL PIPELINE C (Git):
- Task C1: test-writer writes src/services/git.test.ts (Red)
- Task C2: implementer writes src/services/git.ts (Green) - blocked by C1
- Task C3: refactorer cleans git.ts - blocked by C2

FILE OWNERSHIP:
- Pipeline A owns: src/services/auth.* (test + impl)
- Pipeline B owns: src/services/filesystem.* (test + impl)
- Pipeline C owns: src/services/git.* (test + impl)
- NOBODY touches: src/types/index.ts, src/store/* (lead only)

After all 3 pipelines complete:
- Task D: Integration tests (blocked by A3, B3, C3)
```

### What Happens

```
Time 0:  A1, B1, C1 all start writing tests simultaneously
Time 5m: A1 completes (12 tests), A2 starts implementing
         B1 completes (8 tests), B2 starts implementing
         C1 still working (complex service)
Time 8m: C1 completes (15 tests), C2 starts implementing
Time 12m: A2 completes, A3 starts refactoring
          B2 completes, B3 starts refactoring
Time 15m: A3 completes
          C2 completes, C3 starts refactoring
Time 18m: B3, C3 complete
          D (integration tests) starts
Time 25m: All done. 3 services with full TDD coverage.

Sequential time: ~45 minutes
Parallel time: ~25 minutes
```

---

## Pattern 3: Review Team + TDD (PR Quality)

Best for: Reviewing PRs before merge with TDD-focused verification.

### Prompt

```
Create an agent team called "tdd-review" with 3 parallel reviewers:

1. "test-coverage-reviewer" (type: Explore):
   - Check that every public function has tests
   - Verify edge cases are covered
   - Check coverage report: pnpm test:coverage
   - Identify missing test scenarios
   - Grade: A (>90%), B (80-90%), C (<80%)

2. "tdd-discipline-reviewer" (type: Explore):
   - Check git log: were tests committed BEFORE implementation?
   - Are tests meaningful (not just `expect(true).toBe(true)`)?
   - Do tests follow AAA pattern?
   - Are tests independent (no shared state between tests)?
   - Grade: Pass / Fail with specific violations

3. "code-quality-reviewer" (type: Explore):
   - Does implementation follow project conventions?
   - Result<T> pattern used correctly?
   - No `any` types?
   - Proper error handling?
   - data-testid on interactive elements?
   - Grade: Pass / Needs Work with specific issues

All three report findings to my inbox. I synthesize into a unified review.
```

---

## Pattern 4: Competing TDD Implementations

Best for: Exploring different approaches to the same problem.

### Prompt

```
Create an agent team called "tdd-compete" to find the best approach for [feature].

SHARED: test-writer writes tests FIRST (one set of tests for all)
- Task 1: test-writer creates src/services/cache.test.ts with comprehensive tests

COMPETING IMPLEMENTATIONS (all blocked by Task 1):
- Task 2A: "impl-memory" implements using in-memory Map
- Task 2B: "impl-indexeddb" implements using Dexie/IndexedDB
- Task 2C: "impl-localstorage" implements using localStorage

ALL implementations must pass the SAME tests.

After all complete, I compare:
- Lines of code
- Performance characteristics
- Complexity
- Edge case handling
And pick the winner.
```

---

## Pattern 5: Self-Improving TDD Loop (Long Sessions)

For extended development sessions with knowledge accumulation.

### Prompt

```
We're doing a TDD sprint on [project]. For EACH feature:

1. Plan Mode: read spec, identify requirements, plan tests
2. Red: test-writer creates failing tests
3. Green: implementer passes all tests
4. Refactor: refactorer cleans up
5. Review: I review the output
6. Learn: update AGENTS.md with any gotchas discovered

CRITICAL: After each feature:
- Log what went well and what didn't in AGENTS.md
- Note any technology-specific gotchas discovered
- Update the Recent Changes Log
- If context is getting large, I'll start a new session

AGENTS.md persists across sessions, so learnings compound.
```

### The Learning Loop

```
Session 1: Feature A
  → Discovery: "LightningFS requires init() before operations"
  → Added to AGENTS.md

Session 2: Feature B
  → Agent reads AGENTS.md, already knows about LightningFS
  → Discovery: "Monaco editor needs automaticLayout: true"
  → Added to AGENTS.md

Session 3: Feature C
  → Agent knows both gotchas from previous sessions
  → Fewer errors, faster implementation
  → Discovery: "Zustand selectors prevent re-renders"
  → Added to AGENTS.md

Session N: Agent has accumulated all project knowledge
  → Faster, fewer mistakes, better code
```

---

## File Ownership Rules for Multi-Agent TDD

### The Golden Rule

**No two agents modify the same file in the same session.**

### Ownership Assignment

| File Pattern | Owner | Why |
|--------------|-------|-----|
| `*.test.ts`, `*.test.tsx` | test-writer ONLY | Tests are the spec; protect them |
| `src/services/*.ts` | implementer/refactorer | Business logic |
| `src/components/*.tsx` | implementer/refactorer | UI code |
| `src/types/index.ts` | **LEAD ONLY** | Type changes cascade everywhere |
| `src/store/*.ts` | **LEAD ONLY** | State schema is shared |
| `vitest.config.ts` | **LEAD ONLY** | Test infrastructure |
| `AGENTS.md` | **LEAD ONLY** | Knowledge base |

### If Types Need Updating

The test-writer may need new types. Instead of modifying `types/index.ts` directly:

```
test-writer messages lead:
"I need a BlameData type with fields: { line: number, author: string, date: Date, commit: string }.
Please add it to src/types/index.ts so I can write tests against it."
```

Lead adds the type, then test-writer proceeds.

---

## Quality Gates for Agent + TDD

| Gate | Who | What | Blocks |
|------|-----|------|--------|
| G1: Plan Approval | Lead | Reviews implementation plan | All work |
| G2: Red Verification | Lead | Confirms tests fail, tests are meaningful | Green phase |
| G3: Green Verification | Lead | Confirms all tests pass, no shortcuts | Refactor phase |
| G4: Refactor Verification | Lead | Confirms tests still green, code improved | Commit |
| G5: Coverage Check | Hook | 80%+ coverage | Stop |
| G6: Full Validation | Hook | type-check + lint + build | Stop |
| G7: AGENTS.md Update | Lead | Learnings logged | Session end |

---

## Cost-Benefit Analysis

| Approach | Tokens per Feature | Time | Quality |
|----------|--------------------|------|---------|
| Solo, no TDD | ~100K | 15 min | Low (no tests) |
| Solo, TDD | ~200K | 25 min | High (tested) |
| 2 agents, TDD pipeline | ~400K | 15 min | High (tool-enforced TDD) |
| 3 agents, parallel TDD | ~800K | 10 min | Highest (parallel + enforced) |

**When to use multi-agent TDD:**
- Features that touch multiple subsystems
- Greenfield projects where establishing patterns matters
- Sprint bursts where speed justifies token cost
- When you want TDD discipline enforced at the tool level, not just the prompt level

**When to use solo TDD:**
- Single-file changes
- Bug fixes with clear scope
- Cost-sensitive work

---

## Troubleshooting

### "Test-writer wrote implementation code"

The `disallowedTools` should prevent this. If it doesn't:
1. Check agent definition: `disallowedTools: Write(src/*.ts), Write(src/*.tsx), Edit(src/*.ts), Edit(src/*.tsx)`
2. Add explicit instruction: "You CANNOT write files outside `*.test.*` or `*.spec.*`"

### "Implementer modified test files"

Same fix: verify `disallowedTools` in agent definition.

### "Tests are too trivial"

Add to test-writer prompt: "Each test must verify a specific behavior. Tests like `expect(true).toBe(true)` are forbidden. Include at minimum: happy path, error path, edge cases, boundary values."

### "Implementer over-engineers"

Add to implementer prompt: "Write the MINIMUM code. If a test expects a string, return a string. Don't build an abstraction layer for one use case."

### "Refactorer breaks tests"

The Stop hook catches this. Also add: "Run `pnpm test` before AND after each change. If any test fails after a change, immediately revert that specific change."

### "Agents stepping on each other's files"

Review the file ownership table. If two agents need the same file, either:
1. Assign it to one agent, other communicates via messages
2. Split the feature into sequential (not parallel) tasks

---

## Sources

- browser-ide TDD_APPROACH.md (5-phase TDD framework with self-improving agent loop)
- browser-ide AGENT_SPEC.md (6-section agent spec, boundary system)
- browser-ide AGENT_BOUNDARIES.md (3-tier boundary system with safeguards)
- [Claude Code Agent Teams Docs](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Custom Subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code TDD (The New Stack)](https://thenewstack.io/claude-code-and-the-art-of-test-driven-development/)
- [Forcing Claude Code to TDD (alexop.dev)](https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/)
- [Claude Code Swarms (Addy Osmani)](https://addyosmani.com/blog/claude-code-agent-teams/)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks)
