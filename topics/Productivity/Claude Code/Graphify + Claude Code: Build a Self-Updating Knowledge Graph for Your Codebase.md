# Graphify + Claude Code: Build a Self-Updating Knowledge Graph for Your Codebase

> Every developer working with LLMs on a large codebase eventually hits the same wall: context windows are finite, but codebases are not.

You start a new Claude Code session, ask about the payment flow — and Claude starts re-reading dozens of files just to get oriented. Twenty thousand tokens evaporated before a single line of code is written. Multiply that by every session, every team member, every day.

Two open-source tools solve this in different but complementary ways:

- **Graphify** — converts your folder into a queryable knowledge graph with community detection, Obsidian-compatible reports, and cross-file traversal
- **code-review-graph** — builds a SQLite-backed AST graph with blast-radius analysis, 28 MCP tools, and sub-second incremental updates

This guide walks through installing both tools, connecting them to Claude Code, wiring auto-updates for code edited by humans, git commits, or Claude itself — and pairing everything with an Obsidian vault as a persistent memory layer.

All commands in this guide were tested on Ubuntu with a real pnpm monorepo (Vue 3 + Express.js + MongoDB LMS).

---

## Real Numbers from the Test Project

Before diving in, here's what both tools produced on `ft-education-admin` — a real production monorepo with 5 packages, 56 backend modules, and full-stack TypeScript:

| Metric | Graphify (AST-only) | code-review-graph |
|--------|--------------------|--------------------|
| Files indexed | 1020 | 1052 |
| Nodes | 3,815 | 5,780 |
| Edges | 4,830 | 30,611 |
| Communities | 750 | 28 wiki pages |
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

On the test project: **87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS**

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
aws.config.json
certs/
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
aws.config.json
certs/
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

# Output:
# Full build: 1052 files, 5780 nodes, 30611 edges (postprocess=full)
```

### Graphify (AST-only, no LLM cost)

```bash
cd /path/to/your-project

# AST-only update (no API key required)
graphify update .

# Output:
# Rebuilt: 3815 nodes, 4830 edges, 750 communities
# graph.json, graph.html and GRAPH_REPORT.md updated in graphify-out
```

For the richer semantic graph (PDFs, images, markdown — uses LLM):

```bash
# Full extraction with Claude subagents (requires ANTHROPIC_API_KEY)
graphify extract .
```

For ft-education-web (the student portal), results are smaller but proportional:

```bash
# ft-education-web:
# code-review-graph: 711 files, 2773 nodes, 15037 edges
# graphify: 702 files, 2035 nodes, 2357 edges, 499 communities
```

---

## Step 3: Register with Claude Code

### code-review-graph (auto-configures 5 platforms)

```bash
code-review-graph install
```

This single command:
- Writes `.mcp.json` (Claude Code MCP server config)
- Writes `.cursor/mcp.json`, `.opencode.json`, Zed settings
- Appends instructions to `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules`
- Creates `.claude/skills/` for Claude Code tool integration
- Installs hooks in `.claude/settings.json`:
  - **PostToolUse** (Edit|Write|Bash → `code-review-graph update --skip-flows`)
  - **SessionStart** (shows graph status on every session open)
  - **PreToolUse** (intercepts grep/find → nudges to use graph instead)
- Installs a **git pre-commit hook**
- Updates `.gitignore` to exclude `.code-review-graph/`

The `.mcp.json` it creates:

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

---

## Step 4: Query the Graphs

### Graphify CLI

```bash
# BFS traversal — find connections between concepts
graphify query "what connects payment to enrollment" \
  --graph graphify-out/graph.json --budget 1500

# Depth-first traversal for flow tracing
graphify query "auth flow" --dfs --graph graphify-out/graph.json

# Shortest path between two nodes
graphify path "EnrollmentRequestList.vue" "PaymentService" \
  --graph graphify-out/graph.json

# Plain-language explanation of a node
graphify explain "EnrollmentRequestList.vue" --graph graphify-out/graph.json
```

Real output from `graphify explain "EnrollmentRequestList.vue"`:

```
Node: EnrollmentRequestList.vue
  Source:    packages/client/src/views/Admin/PaymentManagement/L1
  Community: 239
  Degree:    3

Connections (3):
  --> EnrollmentRequestList() [imports_from] [EXTRACTED]
  --> handleAxiosError()      [contains]     [EXTRACTED]
  --> if()                    [contains]     [EXTRACTED]
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

## Step 5: Auto-Update Strategies

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

# graphify: post-commit + post-checkout in .husky/_/
graphify hook install
```

The graphify post-commit hook runs the rebuild **in the background** (detached process) so `git commit` returns immediately. Rebuild logs go to `~/.cache/graphify-rebuild.log`.

### Strategy D: Claude Code Hooks (AI-Driven Updates)

When Claude Code edits files, the `PostToolUse` hook triggers an incremental graph update. This is installed automatically by `code-review-graph install` in `.claude/settings.json`:

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

## Step 6: Generate Additional Outputs

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
# Analyzed 1 changed file(s)
# - 0 changed function(s)/class(es)
# - 0 affected flow(s)
# - Overall risk score: 0.00
```

---

## Step 7: Obsidian Vault (Persistent Memory Layer)

The Obsidian layer adds a **human-readable, cross-session memory vault** on top of the graph. Instead of graph queries being ephemeral, you build up a Zettelkasten of architecture decisions, session logs, and imported conversations — all connected to the graph reports.

### Vault Structure

```
~/ai-vault/
├── .obsidian/           ← Obsidian config
├── CLAUDE.md            ← Global Claude instructions for the vault
├── graphify/
│   ├── ft-education-admin/
│   │   └── GRAPH_REPORT.md   ← synced from project
│   └── ft-education-web/
│       └── GRAPH_REPORT.md   ← synced from project
├── permanent/           ← Architecture decisions (atomic notes)
├── logs/                ← Session records (/save command)
├── chats/               ← Imported Claude conversations
└── sync-graphs.sh       ← Vault sync script
```

### Setup

```bash
# Create vault
mkdir -p ~/ai-vault/{graphify/ft-education-admin,graphify/ft-education-web,permanent,logs,chats}

# Initial sync
cp /path/to/ft-education-admin/graphify-out/GRAPH_REPORT.md \
   ~/ai-vault/graphify/ft-education-admin/
cp /path/to/ft-education-web/graphify-out/GRAPH_REPORT.md \
   ~/ai-vault/graphify/ft-education-web/
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

sync_project "ft-education-admin" "/path/to/ft-education-admin"
sync_project "ft-education-web"   "/path/to/ft-education-web"
```

### Add vault sync to post-commit hooks

Append to each project's `.husky/_/post-commit`:

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
- `graphify/ft-education-admin/` — Admin LMS graph report (1052 files, 5780 nodes)
- `graphify/ft-education-web/` — Student portal graph report (711 files, 2773 nodes)
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

---

## Complete Auto-Update Flow

After full setup, the pipeline looks like this:

```
Code edited by human
    → --watch rebuilds graph (graphify/code-review-graph)
    → Obsidian vault shows updated community structure

Code committed
    → post-commit hook: graphify update . (background)
    → post-commit hook: code-review-graph (via pre-commit)
    → post-commit hook: sync-graphs.sh → vault updated
    → post-checkout hook (branch switch): graphify update --force

Claude Code edits files
    → PostToolUse hook fires after Edit/Write/Bash
    → code-review-graph update --skip-flows (0.425s)
    → Graph current before next Claude query

Session starts
    → SessionStart hook: code-review-graph status
    → Claude sees: 5780 nodes, 30611 edges, last updated timestamp
    → Claude reads GRAPH_REPORT.md instead of scanning 1052 files
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

After completing this setup, here's what changed across both projects:

```
ft-education-admin/
├── .graphifyignore                    ← new
├── .code-review-graphignore           ← new
├── .mcp.json                          ← new (code-review-graph MCP)
├── .mcp.example.json                  ← new (example copy)
├── CLAUDE.md                          ← appended (graphify + crg sections)
├── AGENTS.md                          ← new (code-review-graph)
├── .claude/
│   ├── settings.json                  ← updated (PostToolUse, SessionStart, PreToolUse hooks)
│   ├── settings.example.json          ← new (example copy)
│   └── skills/                        ← new (code-review-graph skills)
├── graphify-out/                      ← new (graph.json, GRAPH_REPORT.md, graph.html)
├── .code-review-graph/                ← new (SQLite db, wiki, visualization)
└── .husky/_/post-commit               ← appended (graphify rebuild + vault sync)

ft-education-web/                      ← same structure
ai-vault/                              ← new (Obsidian vault for all projects)
~/.claude/settings.example.json        ← updated (PostToolUse hook added)
```

---

*Published: 2026-05-05*
*Category: Productivity / Claude Code*
*Tags: graphify, code-review-graph, claude-code, knowledge-graph, obsidian, ai-tooling, developer-productivity*
