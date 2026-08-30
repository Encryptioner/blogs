# Knowledge Graph Tools

Two complementary tools are configured for this repo. **graphify is the primary tool** — this is a markdown-only content repo, so code-review-graph finds 0 code nodes (expected). Both are optional; fall back to grep/glob/read if not installed.

## Tools at a Glance

| Tool | Storage | Role in this repo |
|------|---------|-------------------|
| **graphify** | JSON + Markdown report | **Primary** — indexes 1,178 markdown nodes across 104 topic communities |
| **code-review-graph** | SQLite + 28 MCP tools | Secondary — 0 code files (markdown only); provides PreToolUse hint hook |

## For Agents: When to Use the Graph

**Prefer graphify for:**
- "Which blogs cover topic X?" — use `graphify query`
- Understanding how topics/blogs cluster — read `graphify-out/GRAPH_REPORT.md`
- Tracing relationships between content nodes — use `graphify path`

**Still use grep for:**
- Searching inside a specific blog's text
- Finding a known filename you already have

---

## graphify

Produces `graphify-out/GRAPH_REPORT.md` — a Markdown file with community clusters over 29 markdown files (1,178 nodes, 104 communities). Read it for a topic-map overview before diving into specific files.

**Check if available and read the map:**
```bash
[ -f graphify-out/GRAPH_REPORT.md ] && head -40 graphify-out/GRAPH_REPORT.md
```

**Current stats:** 1,178 nodes · 1,168 edges · 104 communities · 29 files

**Query commands:**
```bash
graphify query "npm publishing" --graph graphify-out/graph.json
graphify path "Node.js" "Productivity" --graph graphify-out/graph.json
graphify explain "INDEX.md" --graph graphify-out/graph.json
```

**Manual update:**
```bash
graphify update .          # SHA256-cached, no API cost
graphify update . --force  # full rebuild
```

---

## code-review-graph

MCP server auto-connects when `.mcp.json` is present. In this markdown-only repo it indexes 0 code files, so MCP tools like `semantic_search_nodes` and `get_impact_radius` return empty results — that is expected behavior.

**Check status:**
```bash
code-review-graph status
# Nodes: 0  Edges: 0  Files: 0  (markdown repo — expected)
```

---

## Auto-Update Pipeline

| Trigger | Action |
|---------|--------|
| Session opens | `code-review-graph status` |
| Claude finishes a turn (Stop hook) | `code-review-graph update + embed` (~0.4s, PID-guarded, CRG only) |
| `git commit` (post-commit) | `graphify update .` background nohup + CRG update |
| Branch switch (post-checkout) | `graphify update .` background nohup |
| grep/find command (PreToolUse) | Hint to use graphify/CRG instead |

> **graphify is not in Claude hooks.** `graphify update` takes ~10s+ on large repos — running it after every AI turn causes stuck background processes and CPU/memory pressure. It runs only via git hooks (post-commit, post-checkout) where the rebuild happens in the background after the developer's action.

Hooks live in `.claude/settings.local.json` (gitignored — personal setup).

---

## First-Time Setup

```bash
pip install graphifyy code-review-graph

# Build graphs
graphify update .
code-review-graph build

# Wire Claude Code + git hooks
graphify claude install
graphify hook install
code-review-graph install
```
