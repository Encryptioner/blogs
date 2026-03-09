# Agent Swarm Plans for Side Projects

> Project-specific plans for applying Claude Code Agent Teams across all open-source projects in `~/Projects/side-projects/`, ordered by swarm value.

---

## Tier 1: High Swarm Value

### 1. browser-ide

**Why:** Complex multi-layer project with ~27 components, ~24 services, E2E tests across 3 browsers + mobile. Clear layer separation. Independent subsystems (editor, terminal, git, AI, filesystem). Files are large (27KB-38KB) making context separation critical.

#### Swarm Plan A: Cross-Layer Feature Development

```
Prompt: "Create an agent team for implementing [feature]:
- 'service-engineer': owns src/services/, src/store/, src/types/
- 'ui-engineer': owns src/components/IDE/, src/hooks/
- 'test-engineer': writes vitest + playwright tests only
Each agent should message findings to others when interface contracts change."
```

**File ownership map:**
| Agent | Files |
|-------|-------|
| service-engineer | services/*.ts, store/*.ts, types/index.ts, lib/database.ts |
| ui-engineer | components/IDE/*.tsx, components/Git/*.tsx, hooks/*.ts |
| test-engineer | *.test.tsx, *.test.ts, playwright tests |

#### Swarm Plan B: Parallel Code Review

```
Prompt: "Create a review team:
- 'security-sentinel': audit COOP/COEP headers (vite.config.ts), CSP policy,
  WebContainer sandboxing (webcontainer-security.test.ts), API key handling (.env),
  XSS vectors in terminal commands
- 'performance-oracle': audit Monaco editor lazy loading, xterm.js rendering,
  Zustand store size (23KB useIDEStore.ts), Dexie DB queries, bundle splitting
- 'architecture-strategist': review service layer patterns, singleton usage,
  store design, component responsibilities, hook abstractions"
```

#### Swarm Plan C: Parallel E2E Testing

```
Prompt: "Create a QA swarm:
- 'qa-chromium': run playwright tests on Chromium
- 'qa-firefox': run playwright tests on Firefox
- 'qa-webkit': run playwright tests on WebKit
- 'qa-mobile': run playwright tests on mobile viewports
Report failures to each other to identify browser-specific vs universal bugs."
```

#### Swarm Plan D: Bug Investigation (Competing Hypotheses)

```
Prompt: "Investigate [bug]. Create a team:
- 'hypothesis-monaco': investigate if the bug is in Editor.tsx / Monaco config
- 'hypothesis-webcontainer': investigate if it's a WebContainer / filesystem issue
- 'hypothesis-state': investigate if it's a Zustand store / state management issue
First agent to find a confirmed root cause messages all others."
```

---

### 2. building-management

**Why:** Full-stack PWA (Astro 5 + React 19 + TailwindCSS v4). Multiple domains (residents, flats, billing). PWA features need testing.

#### Swarm Plan A: New Module (e.g., billing, maintenance requests)

```
Prompt: "Create a team for the [module]:
- 'data-architect': design data model, TypeScript interfaces, Astro data fetching
- 'ui-engineer': build React components with Tailwind v4
- 'pwa-engineer': handle offline support, service worker updates, caching strategy"
```

#### Swarm Plan B: Accessibility + PWA Audit

```
Prompt: "Create an audit team:
- 'a11y-reviewer': audit all pages for WCAG 2.1 AA compliance
- 'pwa-reviewer': audit service worker, manifest, offline behavior, install prompts
- 'responsive-reviewer': audit all breakpoints, test mobile/tablet/desktop layouts"
```

---

### 3. coding-challenges

**Why:** 94+ independent challenge directories. Perfect for self-organizing swarm since each challenge is isolated.

#### Swarm Plan: Bulk Improvement

```
Prompt: "Create a self-organizing swarm. Task pool:
- For each challenge directory (01-wc-tool through 20+), check:
  1. Has README with problem description?
  2. Has tests that pass?
  3. Code follows consistent style?
  4. GitHub Pages deployment works?
Workers: spawn 3 agents, each grabs a challenge from the pool, improves it, marks done."
```

---

### 4. de-encrypt-hub

**Why:** Multiple independent encryption algorithms (AES, RSA, hashing, digital signatures, image encryption). Each algorithm is isolated.

#### Swarm Plan: Parallel Algorithm Implementation/Audit

```
Prompt: "Create a team:
- 'crypto-auditor': verify cryptographic correctness of all implementations
  (AES modes, RSA key sizes, hash functions)
- 'ui-engineer': improve UX for each tool (input validation, error messages, copy buttons)
- 'test-engineer': write comprehensive tests for edge cases (empty input, max size, invalid keys)"
```

---

## Tier 2: Medium Swarm Value

### 5. html-to-pdf-generator

**Why:** Multi-framework library with React/Vue/Svelte/Node adapters. Each adapter is independent.

#### Swarm Plan: Cross-Framework Testing

```
Prompt: "Create a team:
- 'react-agent': test and fix React adapter, ensure SSR compatibility
- 'vue-agent': test and fix Vue adapter, verify Vue 3 composition API support
- 'svelte-agent': test and fix Svelte adapter, check SvelteKit integration
- 'node-agent': test and fix Node.js adapter, verify CLI usage"
```

**Note:** Each agent owns one adapter directory. No file overlap.

---

### 6. private-chat

**Why:** WebAssembly LLM runtime. Performance-sensitive with multiple model formats.

#### Swarm Plan: Model Support + Performance

```
Prompt: "Create a team:
- 'model-engineer': add support for new GGUF model formats, test loading/inference
- 'performance-engineer': profile WASM execution, optimize WebWorker messaging,
  implement response streaming
- 'ui-engineer': improve chat UI, add conversation management, export features"
```

---

### 7. portfolio-template

**Why:** React + Chakra UI portfolio. Multiple independent sections (projects, skills, AI chat).

#### Swarm Plan: Parallel Section Updates

```
Prompt: "Create a team:
- 'content-agent': update project data, skills list, and copy
- 'design-agent': refresh visual design, animations, responsive layout
Each owns different component files — no overlap."
```

**Note:** Subagents (not full teams) may be sufficient here given the smaller codebase.

---

### 8. linkedinify

**Why:** PWA with Markdown parsing, offline-first. Two clear domains: parser and UI.

#### Swarm Plan: Feature + PWA

```
Prompt: "Create a team:
- 'parser-agent': improve Markdown-to-LinkedIn conversion rules, handle edge cases
- 'pwa-agent': audit service worker caching, offline behavior, install experience"
```

---

## Tier 3: Use Subagents Instead (Not Full Teams)

### 9. markdown-to-medium-tool

**Why:** React + Redux Toolkit + MUI. Single-purpose tool. Not enough independent subsystems.

**Use instead:** 2 subagents for parallel review (one for converter logic, one for UI).

---

### 10. markdown-to-slide

**Why:** Next.js + pdfmake. In development. Single-purpose.

**Use instead:** 1 subagent for research (slide generation libraries), then solo implementation.

---

### 11. node-typescript-koa-rest / nestjs-vuejs-typescript-boilerplate

**Why:** Boilerplate projects. Small scope, well-defined patterns.

**Use instead:** Subagents for parallel dependency updates or documentation generation.

---

### 12. frontend-vue3-boilerplate / vite-boot

**Why:** Vue starter templates. Small, templated projects.

**Use instead:** Solo session for updates. Subagent for dependency audit.

---

## Tier 4: Solo Session Only

### 13. blogs / content-plans

Content repos. No code. Solo session for writing, subagent for cross-referencing links.

### 14. ccsh-shell

Single C file (27KB). No parallelizable subsystems.

### 15. career-highlights / encryptioner / encryptioner.github.io

Static sites. Too simple for swarm overhead.

### 16. fish-boat-ludu

Vanilla JS game. Single-file logic.

### 17. testjs / test-project / test-design-patterns / tools-test

Test/experimental projects. Not worth token cost.

---

## Quick Setup: Enable Swarms Across Projects

For each Tier 1-2 project, add to `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Projects that benefit from this:
```bash
# Tier 1
mkdir -p ~/Projects/side-projects/browser-ide/.claude
mkdir -p ~/Projects/side-projects/building-management/.claude
mkdir -p ~/Projects/side-projects/coding-challenges/.claude
mkdir -p ~/Projects/side-projects/de-encrypt-hub/.claude

# Tier 2
mkdir -p ~/Projects/side-projects/html-to-pdf-generator/.claude
mkdir -p ~/Projects/side-projects/private-chat/.claude
mkdir -p ~/Projects/side-projects/portfolio-template/.claude
mkdir -p ~/Projects/side-projects/linkedinify/.claude
```

Then create `settings.json` in each with the feature flag.

---

## Starting Sequence (Recommended)

1. **browser-ide** — Start with **Swarm Plan B (Code Review)**. Low risk, high visibility, proves the concept.
2. **browser-ide** — Graduate to **Swarm Plan C (E2E Testing)**. Highly parallelizable, clear boundaries.
3. **browser-ide** — Attempt **Swarm Plan A (Feature Development)**. Full cross-layer coordination.
4. **coding-challenges** — Try **Self-Organizing Swarm**. Tests the worker-pool pattern.
5. **building-management** — Try **Audit Team**. Multiple independent reviewers.
6. **Remaining projects** — Apply learnings from above.

---

## Key Rules (From All Sources)

1. Never start with "build me X" — always decompose into 5-6 tasks per agent first
2. Define file ownership boundaries in every spawn prompt
3. Cap at 3-4 agents (coordination scales quadratically)
4. Start with review tasks, graduate to implementation
5. Use plan approval gates for anything that writes code
6. Pre-approve permissions before spawning
7. Always cleanup after — orphaned teams waste resources
8. Verify output — agent activity metrics lie about quality
