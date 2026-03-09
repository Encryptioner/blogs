# Claude Code Agent Swarms: Multi-Agent Development Guide

> A comprehensive summary of Claude Code's Agent Teams feature (aka "swarms") - how to set up, architect, and leverage multi-agent orchestration for real-world software projects. Includes what works, what doesn't, anti-patterns, and lessons learned from practitioners.

---

## What Are Agent Teams?

Claude Code's Agent Teams (launched Feb 6, 2026, research preview) allow a **lead agent** to coordinate multiple **teammate agents** working in parallel. Each agent gets its own clean 200K-token context window, leading to better reasoning than a single agent with a bloated context.

**Evolution:** Solo session -> Subagents (report to parent only) -> Agent Teams (peer-to-peer messaging + shared task list)

**Key benefit:** 5-10x efficiency gains on parallelizable work. Each agent stays focused with a narrow scope.

> "Parallelism alone isn't the win; **separation** is. Swarms succeed through auditable, typed control flows — not through agent autonomy or clever prompting." — [Decode Claude](https://decodeclaude.com/teams-and-swarms/)

---

## Setup

### 1. Enable the Feature Flag

In `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 2. Choose Display Mode (Optional)

```json
{
  "teammateMode": "tmux"
}
```

Or via environment variables:

```bash
export CLAUDE_CODE_SPAWN_BACKEND=tmux       # visible split panes
export CLAUDE_CODE_SPAWN_BACKEND=iterm2     # macOS iTerm2 panes
export CLAUDE_CODE_SPAWN_BACKEND=in-process # default, fastest
```

### 3. Launch

Start a tmux session first (if using tmux mode), then launch Claude Code and describe your team in natural language:

```
Create an agent team: one teammate on backend, one on frontend, one on tests.
```

### 4. Pre-approve Permissions

**Critical tip from [claudefa.st](https://claudefa.st/blog/guide/agents/agent-teams):** Pre-approve permissions before spawning to avoid permission-prompt floods that slow teams. Each teammate triggers its own permission prompts otherwise.

---

## Architecture

### Core Components

| Component | Role |
|-----------|------|
| **Team Lead** | Creates team, spawns teammates, coordinates, synthesizes findings |
| **Teammates** | Separate Claude Code sessions with independent context windows |
| **Task List** | Shared JSON files on disk; tasks have status + dependency graphs |
| **Inboxes** | JSON files enabling direct inter-agent messaging (peer-to-peer) |

### Directory Structure

```
~/.claude/teams/{team-name}/config.json
~/.claude/teams/{team-name}/inboxes/{agent-id}.json
~/.claude/tasks/{team-name}/{task-id}.json
```

### Built-In Agent Types

| Type | Best For |
|------|----------|
| `Explore` | Read-only codebase searching (fast) |
| `Plan` | Architecture and strategy |
| `general-purpose` | Full implementation (all tools) |
| `Bash` | Shell commands only |

### Model Specialization

- **Opus 4.6**: Architectural decisions, complex implementation
- **Sonnet/Haiku**: File exploration, context gathering (cheaper)

---

## Orchestration Patterns

### Pattern 1: Parallel Specialists

Multiple specialists review simultaneously (e.g., security + performance + architecture review).

### Pattern 2: Pipeline (Sequential Dependencies)

```javascript
TaskCreate({ subject: "Research OAuth options" })       // task #1
TaskCreate({ subject: "Implement chosen approach" })    // task #2
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })        // auto-unblocks when #1 completes
```

### Pattern 3: Self-Organizing Swarm

Workers grab available tasks from a shared pool. Workers naturally load-balance; crashed workers' tasks get reclaimed.

### Pattern 4: Research + Implementation

Research agent gathers info first, then implementation agent uses the findings.

### Pattern 5: Plan Approval Gate

Force a teammate to propose a plan before executing risky changes. Lead approves/rejects.

### Pattern 6: Cross-Layer Feature Teams

Backend, frontend, and test engineers each own their layer. Direct messaging handles interface contracts.

---

## What Works (Proven Patterns)

### 1. Parallel Exploration Beats Sequential Investigation

> "Spawn five teammates each investigating a different theory about why the app exits after one message... Multiple investigators running adversarial debates converge on root causes faster" — [Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/)

Single agents suffer from **anchoring bias** — they commit to their first hypothesis. Parallel agents explore independently and challenge each other's findings.

### 2. Cross-Layer Features Benefit Most

Frontend, backend, and test changes owned by separate teammates working simultaneously compress multi-day sequential work into hours, with each agent maintaining deep focus on their domain.

### 3. Research and Specialized Review Thrive

Independent agents investigating different library approaches or reviewing code through distinct lenses (security, performance, test coverage) catch issues single reviewers miss. One developer watched **six agents review an entire codebase** finding 13 easy problems fixed immediately and 22 larger issues reported for planning.

### 4. Specialization Over Comprehensiveness

> "Forcing one agent to context-switch between [architecture, implementation, testing, documentation] produces inconsistent results." — [Zen van Riel](https://zenvanriel.nl/ai-engineer-blog/claude-code-swarms-multi-agent-orchestration/)

Each agent maintaining focused context for its specific role outperforms one agent trying to do everything.

### 5. CLAUDE.md Dramatically Reduces Exploration Costs

Well-structured project context files (`CLAUDE.md`, `AGENTS.md`) mean teammates don't waste tokens rediscovering project structure. Each teammate automatically inherits these files.

### 6. Coordination Artifacts Bridge Agents

Create explicit handoff documents (architecture decisions, implementation notes, test results) that serve as communication points between specialized agents — not just informal messages.

### 7. The 80/20 Planning Rule

> "80% planning and review, 20% execution" — Compound Engineering Plugin philosophy

Thorough specifications before spawning agents reduce agent flailing. Vague prompts produce vague results at higher cost.

---

## What Doesn't Work (Anti-Patterns)

### 1. "Build Me an App" Prompts

> "Build me an app" burns tokens while agents flail. "Implement these five clearly-defined API endpoints according to this specification" works. — [Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/)

**Specificity is non-negotiable.** Each agent needs: what to do, what to produce, how to report back.

### 2. Lead Implementing Instead of Delegating

Teams fail when the lead agent sidesteps coordination and builds features itself. **Fix:** Use delegate mode (`Shift+Tab`) to restrict the lead to coordination-only tools, or add explicit instructions: "Wait for your teammates to complete their tasks before proceeding."

### 3. Two Agents Editing the Same File

> "Two teammates editing the same file leads to overwrites." — [Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/)

**Fix:** Partition work by file boundaries. Same discipline as human teams avoiding merge conflicts. Define explicit file ownership in spawn prompts.

### 4. Too Many Agents

> "Limit yourself to three or four subagents maximum — more than that and you'll spend too much time deciding which agent to invoke, causing your own productivity to drop." — [eesel.ai](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide)

Start with 2-3 agents. Coordination complexity scales quadratically.

### 5. Task Sizing Problems

- **Too small:** Creates coordination overhead that exceeds the work
- **Too large:** Agents work in isolation without checkpoints
- **Sweet spot:** "Self-contained units that produce a clear deliverable... 5-6 tasks per teammate"

### 6. Sycophantic Agents

> "Models make wrong assumptions, don't seek clarifications, don't push back when they should... They'll implement 1,000 lines of bloated code, and when challenged, immediately cut it to 100." — [eesel.ai](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide)

**Fix:** Use plan approval gates for risky changes. Don't trust agent output without verification.

### 7. Activity Metrics as Success Metrics

> "Commits per hour, parallel task completion, lines of code touched look impressive but don't correlate with value." — [Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/)

Verify correctness and maintainability. Quantity isn't quality.

### 8. Consensus Mechanisms Between Workers

Workers debating with each other turns into endless back-and-forth. Use a leader/arbiter pattern instead — workers report findings, the lead decides.

### 9. No Context in Spawn Prompts

**Teammates don't inherit the lead's conversation history.** Whatever context they need, the lead must provide in the spawn prompt. The first teammate may spawn with zero context and start asking basic questions. Be generous with the initial briefing.

### 10. Forgetting Cleanup

Always shut down teammates through graceful shutdown sequence before calling `cleanup`. The lead won't clean up while teammates are still running. Orphaned teams consume resources.

---

## Common Failure Modes

| Failure | Symptom | Fix |
|---------|---------|-----|
| Task status lag | Teammates fail to mark tasks complete, blocking dependents | Manually update task status via lead |
| Lead over-implementing | Lead writes code instead of coordinating | Use delegate mode (`Shift+Tab`) |
| Context overflow | Agent quality degrades mid-task | Split into smaller, focused tasks |
| File conflicts | Overwrites when agents touch same files | Explicit file ownership in prompts |
| Runaway costs | Token bill 10x expected | Cap teammate count; use Haiku for exploration |
| Session loss | `/resume` doesn't restore teammates | Task files persist on disk; restart with task context |
| Permission floods | Each agent triggers permission prompts | Pre-approve permissions before spawning |

---

## Decision Guide: When to Use What

| Situation | Approach | Why |
|-----------|----------|-----|
| Single bug fix | **Solo session** | Swarm overhead exceeds the work |
| Minor feature (<3 files) | **Solo session** | Clean, focused context is sufficient |
| Code review of a PR | **Subagents** (2-3) | Parallel specialists, no peer communication needed |
| Research question | **Subagents** | Independent queries, results merged by lead |
| Cross-layer feature (5+ files) | **Agent Team** | Peer messaging needed for interface contracts |
| Large refactor | **Agent Team** | Multiple owners, plan approval gates |
| QA across browsers/viewports | **Agent Team** | Self-organizing swarm with shared task pool |
| Competing hypothesis debugging | **Agent Team** | Parallel investigation without anchoring bias |
| Sequential, tightly-coupled tasks | **Solo session** | Agents can't share mid-task state efficiently |
| Cost-sensitive work | **Solo session** | 3-4x token cost for teams |

### Escalation Signal

> "If workers keep needing to share discoveries mid-task or validate each other's approaches, that's your signal that agent teams will outperform isolated contractor-style subagents." — [claudefa.st](https://claudefa.st/blog/guide/agents/agent-teams)

---

## Navigation Controls

| Control | Action |
|---------|--------|
| `Shift+Down` / `Shift+Up` | Cycle through teammates |
| `Enter` | View a teammate's session |
| `Escape` | Interrupt a teammate's turn |
| `Ctrl+T` | Toggle shared task list view |
| `Shift+Tab` | Toggle "delegate mode" |

---

## Best Practices (Summary)

1. **Plan first, parallelize second** - Use plan mode to decompose work, then distribute
2. **Use meaningful agent names** - `security-reviewer` not `worker-1`
3. **Write explicit prompts** - Tell each worker exactly what to do and how to report
4. **Leverage dependency auto-unblocking** - Use `addBlockedBy` instead of polling
5. **Prefer targeted `write` over `broadcast`** - Broadcasting sends N messages
6. **Match agent types to tasks** - Use `Explore` for read-only, `Plan` for architecture
7. **Always cleanup after the team finishes** - Call graceful shutdown + `cleanup`
8. **Gate risky work behind plan approval** - Use `plan_mode_required: true`
9. **Start with review tasks** - Low blast radius, clear boundaries
10. **Pre-approve permissions** - Avoid prompt floods across teammates
11. **Define file ownership explicitly** - Prevents overwrite conflicts
12. **Cap at 3-4 agents** - Coordination complexity scales quadratically
13. **Verify agent output** - Don't trust activity metrics; check correctness

---

## Cost Considerations

| Setup | Approximate Token Use |
|-------|-----------------------|
| Solo session | ~200k tokens |
| 3 subagents | ~440k tokens |
| 3-person agent team | ~800k tokens |

**Rule of thumb:** Agent teams consume 4-15x more tokens than single-agent mode. Reserve for high-value, genuinely parallelizable work.

**Performance reality:** Teammates typically spawn within 20-30 seconds and produce results within the first minute. Time savings on complex multi-faceted work justify the token multiplier.

---

## Limitations (Current State)

- **Experimental** - Feature flag required; behavior may change with any update
- **No session resumption** - `/resume` and `/rewind` don't restore teammates
- **One team per session** - No nested teams; a team cannot spawn sub-teams
- **Split panes** - tmux/iTerm2 only (no VS Code terminal, Windows Terminal, Ghostty)
- **Token multiplication** - Multi-agent multiplies API costs significantly
- **TaskCreate restricted** - Only team lead can create tasks
- **5-minute heartbeat timeout** - Crashed teammates auto-detected
- **Stability risks** - "My swarm deleted my repo" type incidents have been reported
- **No per-teammate permissions** - All teammates inherit the lead's permission settings
- **Teammate output invisible** - Text output not visible to other teammates; must use `write` to share

---

## Real-World Examples

1. **PR Code Review** - 3 specialists (security, performance, architecture) in parallel. Unified review in 3 minutes.
2. **Full-Stack Feature** - Research -> parallel backend + frontend -> integration tests pipeline.
3. **Competing Hypothesis Debugging** - Multiple agents investigate different root causes simultaneously.
4. **QA Swarm** - 5 parallel agents: page responses, link checking, SEO, accessibility, post rendering. Found 10 prioritized issues.
5. **Documentation + Code** - Docs-writer and implementer work simultaneously without blocking each other.
6. **iOS App Build** - Developer used swarm for UX plans, code, code review, refactoring, and building additional features.
7. **Full Codebase Review** - 6 agents reviewed entire codebase, found 13 easy fixes + 22 larger issues for planning.
8. **9-Agent Production System** - Manager, architect, paired TDD developers, quality gatekeeper, and monitoring agents. Distributes cognitive load effectively.

---

## Key Insight: Engineering Management = Agent Orchestration

> "The skills that make someone a strong engineering manager translate directly into effective agent orchestration." — [Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/)

Task sizing, file ownership, context loading, avoiding scope creep, and preventing distractions — these are the same problems human engineering teams face. The difference is that agent teams fail faster and more visibly when these fundamentals are neglected.

---

## Sources

- [Official Claude Code Agent Teams Docs](https://code.claude.com/docs/en/agent-teams)
- [Claude Swarm Mode Multi-Agent Guide (apiyi.com)](https://help.apiyi.com/en/claude-code-swarm-mode-multi-agent-guide-en.html)
- [Claude Code Swarm Orchestration Skill - Complete Guide (kieranklaassen GitHub Gist)](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea)
- [Vibe Coding Is So Last Month - Adrian Cockcroft (Medium)](https://adrianco.medium.com/vibe-coding-is-so-last-month-my-first-agent-swarm-experience-with-claude-flow-414b0bd6f2f2)
- [From Tasks to Swarms: Agent Teams in Claude Code (alexop.dev)](https://alexop.dev/posts/from-tasks-to-swarms-agent-teams-in-claude-code/)
- [Claude Code Agent Swarm Architecture (mejba.me)](https://www.mejba.me/public/index.php/blog/claude-code-agent-swarm-architecture)
- [Claude Code Now Supports Agent Teams - Boris Cherny (Threads)](https://www.threads.com/@boris_cherny/post/DUYr3wwkxHH)
- [How to Setup Claude Code Agent Swarm - Dylan Boudro (LinkedIn)](https://www.linkedin.com/posts/dylanboudro_how-to-setup-claude-code-agent-swarm-teams-activity-7426029680404770816-ogmx/)
- [Claude Code Swarms - Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/)
- [Claude Code's Hidden Multi-Agent System (paddo.dev)](https://paddo.dev/blog/claude-code-hidden-swarm/)
- [Claude Code Agent Teams: The Complete Guide 2026 (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-teams)
- [Teams and Swarms (Decode Claude)](https://decodeclaude.com/teams-and-swarms/)
- [Claude Code Swarms: Multi-Agent AI Coding (Zen van Riel)](https://zenvanriel.nl/ai-engineer-blog/claude-code-swarms-multi-agent-orchestration/)
- [Claude Code Multiple Agent Systems: Complete 2026 Guide (eesel.ai)](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide)
