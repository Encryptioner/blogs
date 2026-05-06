# Graphify + Claude Code: Build a Self-Updating Knowledge Graph for Your Codebase

> Every developer working with LLMs on a large codebase eventually hits the same wall: context windows are finite, but codebases are not.

You start a new Claude Code session, ask about the payment flow — and Claude starts re-reading dozens of files just to get oriented. Twenty thousand tokens evaporated before a single line of code is written. Multiply that by every session, every team member, every day.

Two open-source tools solve this in different but complementary ways:

- **Graphify** — converts your folder into a queryable knowledge graph with community detection, Obsidian-compatible reports, and cross-file traversal
- **code-review-graph** — builds a SQLite-backed AST graph with blast-radius analysis, 28 MCP tools, and sub-second incremental updates

This guide walks through installing both tools, connecting them to Claude Code, wiring auto-updates for code edited by humans, git commits, or Claude itself — and pairing everything with an Obsidian vault as a persistent memory layer.

All commands in this guide were tested on Ubuntu and macOS across multiple real pnpm monorepos of varying sizes.

---

## Real Numbers from Two Test Projects

Before diving in, here's what both tools produced across two real codebases — one a full-stack TypeScript monorepo with 5 packages, the other a lighter frontend-only repo:

| Metric | Graphify (AST-only) | code-review-graph |
|--------|--------------------|--------------------|
| Files indexed (large) | 1,020 | 1,052 |
| Nodes (large) | 3,815 | 5,780 |
| Edges (large) | 4,830 | 30,611 |
| Files indexed (small) | 702 | 711 |
| Nodes (small) | 2,035 | 2,773 |
| Edges (small) | 2,357 | 15,037 |
| Communities | 750 / 499 | 28 wiki pages each |
| Incremental update | ~10s (8 workers) | **0.425s** |
| LLM tokens used | 0 | 0 |
| Storage | `graphify-out/` (JSON) | `.code-review-graph/` (SQLite) |

---

## How Each Tool Works

### Graphify — Two-Pass Graph with Communities

```
Your Code
    │
    ▼
Pass 1: Tree-sitter AST   ← 0 tokens, 25 languages
(classes, functions, imports, call graphs)
    │
    ▼
Pass 2: AI Extraction     ← only for PDFs, images, markdown (optional)
(semantic relationships via Claude subagents)
    │
    ▼
NetworkX Graph + Leiden Clustering
    │
    ├── graphify-out/graph.json       (queryable)
    ├── graphify-out/GRAPH_REPORT.md  (750 communities, Obsidian links)
    ├── graphify-out/graph.html       (interactive visual)
    └── graphify-out/cache/           (SHA256 per file)
```

Each edge has a confidence tag:

| Tag | Source | Confidence |
|-----|--------|-----------|
| `EXTRACTED` | Directly in AST | 1.0 |
| `INFERRED` | Reasonable deduction | 0.7–0.9 |
| `AMBIGUOUS` | Needs review | <0.7 |

On the large monorepo: **87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS**

### code-review-graph — Blast-Radius Graph with MCP

```
Your Code (git-tracked files)
    │
    ▼
Tree-sitter AST (23 languages, 0 tokens)
    │
    ▼
SQLite (.code-review-graph/graph.db)
    │
    ├── Nodes: functions, classes, files
    ├── Edges: imports, calls, inheritance
    └── Full-text search index (FTS5)
    │
    ▼
28 MCP tools exposed to Claude Code
(get_minimal_context, detect_changes, semantic_search, ...)
```

---

## Installation

### Ubuntu

```bash
# Install both tools
pip install graphifyy         # Note: two y's on PyPI
pip install code-review-graph

# Verify
graphify --help | head -5
code-review-graph --version
```

### macOS

```bash
# Via uv (fastest)
uv tool install graphifyy
uv tool install code-review-graph

# Or via pipx
brew install pipx
pipx install graphifyy
pipx install code-review-graph
```

> **PyPI quirk**: The package is `graphifyy` (two y's). The CLI command after install is `graphify` (one y).

---

## Step 1: Create Ignore Files

Before building any graph, exclude noise from indexing. Place these at your project root.

**`.graphifyignore`**

```
node_modules/
dist/
build/
.pnpm-store/
coverage/
*.min.js
*.min.css
*.map
pnpm-lock.yaml
yarn.lock
*.lock
*.log
.env*
graphify-out/
.code-review-graph/
*.example.*
```

**`.code-review-graphignore`** (same content)

```
node_modules/
dist/
build/
.pnpm-store/
coverage/
*.min.js
*.min.css
*.map
pnpm-lock.yaml
yarn.lock
*.lock
*.log
.env*
graphify-out/
.code-review-graph/
*.example.*
```

---

## Step 2: Build the Graphs Manually

### code-review-graph

```bash
cd /path/to/your-project

# Full build (first time) — parses all files
code-review-graph build

# Output (large monorepo):
# Full build: 1052 files, 5780 nodes, 30611 edges (postprocess=full)

# Output (smaller frontend repo):
# Full build: 711 files, 2773 nodes, 15037 edges (postprocess=full)
```

### Graphify (AST-only, no LLM cost)

```bash
cd /path/to/your-project

# AST-only update (no API key required)
graphify update .

# Output (large monorepo):
# Rebuilt: 3815 nodes, 4830 edges, 750 communities
# graph.json, graph.html and GRAPH_REPORT.md updated in graphify-out

# Output (smaller repo):
# Rebuilt: 2035 nodes, 2357 edges, 499 communities
```

For the richer semantic graph (PDFs, images, markdown — uses LLM):

```bash
# Full extraction with Claude subagents (requires ANTHROPIC_API_KEY)
graphify extract .
```

---

## Step 3: Register with Claude Code

### code-review-graph (auto-configures 5 platforms)

```bash
code-review-graph install
```

This single command:
- Writes `.mcp.json` (Claude Code MCP server config)
- Writes `.cursor/mcp.json`, `.opencode.json`, Zed settings, `.cursorrules`, `GEMINI.md`, `AGENTS.md`
- Creates `.claude/skills/` for Claude Code tool integration
- Installs hooks in `.claude/settings.json` (move these to `settings.local.json` — see below)
- Installs a **git pre-commit hook**
- Updates `.gitignore` to exclude `.code-review-graph/`

**Post-install housekeeping:** `code-review-graph install` is aggressive — it writes configs for every AI IDE it knows about. Most teams only use one. Add the noise to `.gitignore`:

```
# .gitignore additions
AGENTS.md
GEMINI.md
.mcp.json          # keep only .mcp.example.json
.cursorrules
.windsurfrules
.opencode.json
.kiro/
```

**Move hooks out of `settings.json`:** The hooks `code-review-graph install` writes into `.claude/settings.json` are personal setup — not everyone on the team will have the CLI installed. Move them to `.claude/settings.local.json` (already gitignored) instead:

```bash
# Remove hooks from .claude/settings.json, then add to settings.local.json:
{
  "hooks": {
    "PostToolUse": [{"matcher": "Edit|Write|Bash", "hooks": [{"type": "command", "command": "code-review-graph update --skip-flows", "timeout": 30}]}],
    "SessionStart": [{"matcher": "", "hooks": [{"type": "command", "command": "code-review-graph status", "timeout": 10}]}]
  }
}
```

The `.mcp.json` it creates (keep as `.mcp.example.json` only):

```json
{
  "mcpServers": {
    "code-review-graph": {
      "command": "uvx",
      "args": ["code-review-graph", "serve"],
      "type": "stdio"
    }
  }
}
```

### Graphify (Claude Code integration)

```bash
# Adds graphify section to CLAUDE.md + PreToolUse hook
graphify claude install

# Installs post-commit + post-checkout git hooks
graphify hook install
```

Graphify's `claude install` adds a `PreToolUse` hook that intercepts `grep`, `rg`, `find` commands and reminds Claude to use `graphify query` instead — turning search interception into graph navigation.

### CLAUDE.md: brief mention pattern

Rather than pasting the full tool docs into `CLAUDE.md` (which bloats every session's context), create a dedicated `docs/agent/knowledge-graph.md` and add only a pointer in `CLAUDE.md`:

```markdown
## Knowledge Graph
This project has knowledge graph tools (graphify, code-review-graph, Obsidian vault) configured.
Read `docs/agent/knowledge-graph.md` before exploring unfamiliar code or answering architecture questions.
```

This pattern keeps `CLAUDE.md` lean while the full reference — tool commands, MCP tool table, Obsidian vault path, update pipeline — lives in `docs/agent/knowledge-graph.md` and is only loaded when actually needed.

---

## Step 4: Verify Your Setup

Run these checks after setup to confirm everything is wired correctly.

### Check CLI installation

```bash
graphify --help | head -3
code-review-graph --version
# code-review-graph 2.3.2
```

### Check graph outputs exist

```bash
ls graphify-out/
# cache  graph.html  graph.json  GRAPH_REPORT.md  manifest.json

code-review-graph status
# Nodes: 5780  Edges: 30611  Files: 1052
# Languages: bash, javascript, vue, typescript
# Last updated: 2026-05-05T18:29:51
```

### Check GRAPH_REPORT.md freshness

```bash
head -15 graphify-out/GRAPH_REPORT.md
# ## Corpus Check
# - 1020 files · ~1,587,186 words
# - Verdict: corpus is large enough that graph structure adds value.
#
# ## Summary
# - 3815 nodes · 4830 edges · 750 communities (533 shown, 217 thin omitted)
# - Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS
#
# ## Graph Freshness
# - Built from commit: `4968d67a`
# - Run `git rev-parse HEAD` and compare to check if the graph is stale.
```

### Check hooks are in settings.local.json

```bash
python3 -m json.tool .claude/settings.local.json | grep -A5 '"PostToolUse"'
# Should show: "matcher": "Edit|Write|Bash"
# (hooks live in settings.local.json, not settings.json — they're personal/gitignored)
```

### Check MCP server config

```bash
cat .mcp.example.json
# Should show: code-review-graph serve entry
# Copy to .mcp.json locally if it doesn't exist yet:
cp .mcp.example.json .mcp.json
```

### Check git hooks

```bash
# Husky projects
grep -c "graphify" .husky/_/post-commit
# 1 (or more)

# Plain git projects
head -5 .git/hooks/pre-commit
```

### Test incremental update speed

```bash
time code-review-graph update --skip-flows
# real  0m0.425s  ← confirms PostToolUse hook is fast enough

time graphify update .
# SHA256 cache skips unchanged files — subsequent runs are near-instant
```

### Test vault sync (if vault is configured)

```bash
bash ~/ai-vault/sync-graphs.sh
# [vault-sync] project-alpha: synced
# [vault-sync] project-beta: synced

ls ~/ai-vault/graphify/
# project-alpha/  project-beta/
```

---

## Step 5: Query the Graphs

### Graphify CLI

```bash
# BFS traversal — find connections between concepts
graphify query "what connects payment to enrollment" \
  --graph graphify-out/graph.json --budget 1500

# Depth-first traversal for flow tracing
graphify query "auth flow" --dfs --graph graphify-out/graph.json

# Shortest path between two nodes
graphify path "UserDashboard.vue" "PaymentService" \
  --graph graphify-out/graph.json

# Plain-language explanation of a node
graphify explain "UserDashboard.vue" --graph graphify-out/graph.json
```

Example output from `graphify explain`:

```
Node: UserDashboard.vue
  Source:    packages/client/src/views/Dashboard
  Community: 239
  Degree:    3

Connections (3):
  --> UserDashboard()  [imports_from] [EXTRACTED]
  --> handleApiError() [contains]     [EXTRACTED]
  --> AuthService      [calls]        [INFERRED]
```

### Inside Claude Code

After `graphify install` and `code-review-graph install`, Claude Code gets skills and MCP tools automatically. Just start a session — the `SessionStart` hook shows the graph status.

```
# code-review-graph status on session open:
Nodes: 5780  Edges: 30611  Files: 1052
Languages: bash, javascript, vue, typescript
Last updated: 2026-05-05T18:29:51
```

---

## Step 6: Auto-Update Strategies

The graph is only valuable if it reflects current code. Here are the four strategies, from manual to fully automatic.

### Strategy A: Manual Update (Always Available)

```bash
# Incremental (only changed files — fast)
code-review-graph update        # 0.425s on ~1000-file project
graphify update .               # SHA256 cache, AST-only

# Full rebuild (when switching branches or major refactors)
code-review-graph build
graphify update . --force
```

### Strategy B: `--watch` (Active Dev Sessions)

```bash
# In a separate terminal — monitors filesystem, auto-rebuilds
graphify watch .

# Background (Ubuntu)
nohup graphify watch . > ~/.cache/graphify-watch.log 2>&1 &

# macOS LaunchAgent (auto-start on login)
# See: ~/Library/LaunchAgents/com.graphify.watch.plist
```

code-review-graph equivalent:

```bash
code-review-graph watch
```

### Strategy C: Git Hooks (On Commit + Branch Switch)

Both tools install git hooks automatically:

```bash
# code-review-graph: pre-commit hook in .git/hooks/pre-commit
code-review-graph install

# graphify: post-commit + post-checkout in .husky/_/ (or .git/hooks/)
graphify hook install
```

The graphify post-commit hook runs the rebuild **in the background** (detached process) so `git commit` returns immediately. Rebuild logs go to `~/.cache/graphify-rebuild.log`.

### Strategy D: Claude Code Hooks (AI-Driven Updates)

When Claude Code edits files, the `PostToolUse` hook triggers an incremental graph update. `code-review-graph install` writes these into `.claude/settings.json` initially, but they should live in `.claude/settings.local.json` (gitignored) so teammates without the CLI aren't affected:

```json
"PostToolUse": [
  {
    "matcher": "Edit|Write|Bash",
    "hooks": [
      {
        "type": "command",
        "command": "code-review-graph update --skip-flows",
        "timeout": 30
      }
    ]
  }
]
```

At **0.425s per update**, this runs after every file edit without blocking Claude's workflow.

For the global `~/.claude/settings.example.json`, add a fallback-safe version:

```json
"PostToolUse": [
  {
    "matcher": "Edit|Write|MultiEdit",
    "hooks": [
      {
        "type": "command",
        "command": "command -v code-review-graph >/dev/null 2>&1 && code-review-graph update --skip-flows 2>/dev/null || true",
        "timeout": 30
      }
    ]
  }
]
```

---

## Step 7: Generate Additional Outputs

### Wiki (Markdown pages per community)

```bash
code-review-graph wiki
# Wiki: 28 new pages → .code-review-graph/wiki/

graphify tree --graph graphify-out/graph.json
# D3 collapsible-tree HTML
```

### Interactive Visualization

```bash
code-review-graph visualize
# → .code-review-graph/graph.html

# graphify-out/graph.html is generated automatically during build
```

### Blast-Radius Analysis

```bash
# What does this commit affect?
code-review-graph detect-changes --base HEAD~1 --brief

# Risk-scored output:
# Analyzed 3 changed file(s)
# - 2 changed function(s)/class(es)
# - 1 affected flow(s)
# - Overall risk score: 0.42
```

---

## Step 8: Obsidian Vault (Persistent Memory Layer)

The Obsidian layer adds a **human-readable, cross-session memory vault** on top of the graph. Instead of graph queries being ephemeral, you build up a Zettelkasten of architecture decisions, session logs, and imported conversations — all connected to the graph reports.

### Vault Structure

```
~/ai-vault/
├── .obsidian/           ← Obsidian config
├── CLAUDE.md            ← Global Claude instructions for the vault
├── graphify/
│   ├── project-alpha/
│   │   └── GRAPH_REPORT.md   ← synced from project
│   └── project-beta/
│       └── GRAPH_REPORT.md   ← synced from project
├── permanent/           ← Architecture decisions (atomic notes)
├── logs/                ← Session records (/save command)
├── chats/               ← Imported Claude conversations
└── sync-graphs.sh       ← Vault sync script
```

### Setup

```bash
# Create vault
mkdir -p ~/ai-vault/{graphify/project-alpha,graphify/project-beta,permanent,logs,chats}

# Initial sync
cp /path/to/project-alpha/graphify-out/GRAPH_REPORT.md \
   ~/ai-vault/graphify/project-alpha/
cp /path/to/project-beta/graphify-out/GRAPH_REPORT.md \
   ~/ai-vault/graphify/project-beta/
```

**`~/ai-vault/sync-graphs.sh`** (auto-sync on commit):

```bash
#!/bin/bash
VAULT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sync_project() {
  local name="$1" project_path="$2"
  local target="$VAULT_DIR/graphify/$name"
  mkdir -p "$target"
  [ -f "$project_path/graphify-out/GRAPH_REPORT.md" ] && \
    cp "$project_path/graphify-out/GRAPH_REPORT.md" "$target/GRAPH_REPORT.md" && \
    echo "[vault-sync] $name: synced"
}

sync_project "project-alpha" "/path/to/project-alpha"
sync_project "project-beta"  "/path/to/project-beta"
```

```bash
chmod +x ~/ai-vault/sync-graphs.sh
```

### Add vault sync to post-commit hooks

Append to each project's `.husky/_/post-commit` (or `.git/hooks/post-commit`):

```bash
# Sync graph reports to Obsidian vault (background, non-blocking)
VAULT_SYNC="$HOME/ai-vault/sync-graphs.sh"
[ -f "$VAULT_SYNC" ] && nohup bash "$VAULT_SYNC" > /dev/null 2>&1 &
```

### `~/ai-vault/CLAUDE.md` (vault-level Claude instructions)

```markdown
## AI Vault — Global Claude Instructions

## Session Commands
- `/resume` — Read the latest log in `logs/` to restore context
- `/save` — Write a timestamped session summary to `logs/YYYY-MM-DD-HH-MM.md`

## Navigation
- `graphify/project-alpha/` — Large monorepo graph report (1052 files, 5780 nodes)
- `graphify/project-beta/`  — Frontend repo graph report (711 files, 2773 nodes)
- `permanent/` — Architecture decisions and atomic notes
- `logs/` — Session records

## Graph Usage
Before answering architecture questions, read the relevant GRAPH_REPORT.md.
Use `graphify query`, `graphify path`, and `graphify explain` in the project directory.
```

### Open in Obsidian

```
File → Open vault → Select ~/ai-vault/
```

**Useful graph view filters in Obsidian:**

| Filter | Shows |
|--------|-------|
| `path:graphify` | Code structure communities |
| `path:permanent` | Architecture decisions only |
| `path:logs` | Session records |
| `-path:graphify` | Human notes only |

**Install Obsidian:**

```bash
# Ubuntu
snap install obsidian

# macOS
brew install --cask obsidian
```

---

## Complete Auto-Update Flow

After full setup, the pipeline looks like this:

```
Code edited by human
    → --watch rebuilds graph (graphify/code-review-graph)
    → Obsidian vault shows updated community structure

Code committed
    → post-commit: graphify update . (background, non-blocking)
    → pre-commit: code-review-graph update
    → post-commit: sync-graphs.sh → vault updated
    → post-checkout (branch switch): graphify update --force

Claude Code edits files
    → PostToolUse hook fires after Edit/Write/Bash
    → code-review-graph update --skip-flows (0.425s)
    → Graph current before next Claude query

Session starts
    → SessionStart hook: code-review-graph status
    → Claude sees: 5780 nodes, 30611 edges, last updated timestamp
    → Claude reads GRAPH_REPORT.md instead of scanning 1000+ files
```

---

## Quick Reference

### Installation

```bash
pip install graphifyy code-review-graph
```

### Project Setup (run once per project)

```bash
# Create ignore files
touch .graphifyignore .code-review-graphignore  # then add exclusions

# Build graphs manually
code-review-graph build     # SQLite graph (fast, no tokens)
graphify update .           # JSON graph, AST-only (no tokens)

# Register with Claude Code (auto-installs hooks, MCP, skills)
code-review-graph install
graphify claude install
graphify hook install
```

### Verify (run after setup)

```bash
code-review-graph status            # shows node/edge counts
head -15 graphify-out/GRAPH_REPORT.md
time code-review-graph update --skip-flows   # should be <1s
python3 -m json.tool .claude/settings.local.json | grep -A3 PostToolUse
cat .mcp.example.json
```

### Daily Commands

```bash
# Manual incremental update
code-review-graph update    # 0.4s
graphify update .           # SHA256 incremental

# Query
graphify query "auth flow" --graph graphify-out/graph.json
graphify path "ComponentA" "ServiceB" --graph graphify-out/graph.json
graphify explain "MyService" --graph graphify-out/graph.json

# Blast-radius review
code-review-graph detect-changes --base HEAD~1 --brief

# Status
code-review-graph status

# Wiki / visualization
code-review-graph wiki
code-review-graph visualize
```

### Watch Mode

```bash
graphify watch .                  # continuous auto-rebuild (graphify)
code-review-graph watch           # continuous auto-rebuild (crg)
```

---

## Why Not a Vector Database?

Code navigation is fundamentally relational — `UserController` calls `AuthService` which imports `TokenRepository`. This is a directed graph, not a bag of vectors.

| | Knowledge Graph | Vector DB |
|--|--|--|
| Code structure | Topology-exact | Approximate |
| Setup | No embedding pipeline | Embedding + chunking + sync |
| Hallucination | None (AST is deterministic) | Can return similar-but-wrong |
| Cost (indexing) | 0 tokens (AST mode) | Embedding cost per file |
| Incremental update | 0.4s (SQLite diff) | Re-embed changed chunks |
| Exact symbol lookup | Use grep/LSP (still best) | Often worse |

Knowledge graphs excel at **"how does X relate to Y"** questions. For exact symbol lookup, grep and LSP still win — and both tools' `PreToolUse` hooks redirect Claude toward the graph for structural questions while leaving grep for exact matches.

---

## Files Created / Modified

After completing this setup, here's what changes in each project:

**Committed to repo:**
```
your-project/
├── .graphifyignore                    ← new
├── .code-review-graphignore           ← new
├── .mcp.example.json                  ← new (reference config for teammates)
├── CLAUDE.md                          ← 2-line pointer to docs/agent/knowledge-graph.md
├── .claude/
│   ├── settings.json                  ← permissions only, no hooks
│   ├── settings.example.json          ← new (shows hook structure for local setup)
│   └── skills/                        ← new (code-review-graph query skills)
└── docs/agent/knowledge-graph.md      ← new (full tool reference)
```

**Gitignored (local only, not committed):**
```
your-project/
├── .mcp.json                          ← personal MCP config (copy from .mcp.example.json)
├── .claude/settings.local.json        ← personal hooks (PostToolUse, SessionStart, PreToolUse)
├── graphify-out/                      ← generated (graph.json, GRAPH_REPORT.md, graph.html)
├── .code-review-graph/                ← generated (SQLite db, wiki, visualization)
├── AGENTS.md / GEMINI.md              ← tool-generated, IDE-specific
├── .cursorrules / .windsurfrules      ← IDE-specific
└── .kiro/ / .opencode.json            ← IDE-specific
```

**Outside repos:**
```
~/ai-vault/                            ← new (Obsidian vault for all projects)
~/.claude/settings.example.json        ← updated (PostToolUse hook reference)
```

**New teammate setup** (copy `.mcp.example.json` and configure local hooks):
```bash
cp .mcp.example.json .mcp.json
# Add hooks from .claude/settings.example.json into .claude/settings.local.json
```

---

*Published: 2026-05-05*
*Category: Productivity / Claude Code*
*Tags: graphify, code-review-graph, claude-code, knowledge-graph, obsidian, ai-tooling, developer-productivity*
