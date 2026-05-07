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

Everything updates automatically — no manual steps required per session.

| Trigger | Action |
|---------|--------|
| Session opens | `code-review-graph status` + starts `.claude/graph-daemon.sh` |
| Daemon running | `graphify watch .` (continuous) + vault sync poller (every 3s) |
| Claude edits a file (PostToolUse) | `code-review-graph update --skip-flows` |
| `git commit` (post-commit) | `graphify update .` background → Obsidian vault syncs |
| grep/find command (PreToolUse) | Hint to use graphify instead |

Hooks and daemon config live in `.claude/settings.local.json` (gitignored — personal setup).
Daemon script is at `.claude/graph-daemon.sh` (committed — no-op if graphify not installed).

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
