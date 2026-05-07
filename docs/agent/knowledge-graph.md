# Knowledge Graph Reference

This repository has two knowledge graph tools configured. Use them before grepping or globbing.

## Tools

### graphify (primary for this content repo)

Parses markdown files into a queryable graph with community detection (1155 nodes, 1129 edges, 100 communities).

```bash
# Query connections between topics
graphify query "what connects Node.js to productivity" --graph graphify-out/graph.json --budget 1500

# Trace paths between articles
graphify path "ArticleA" "ArticleB" --graph graphify-out/graph.json

# Explain a node
graphify explain "SomeTopicNode" --graph graphify-out/graph.json

# BFS traversal
graphify query "Claude Code" --graph graphify-out/graph.json

# Continuous watch (auto-rebuild on changes)
graphify watch .
```

**Start here:** Read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.

### code-review-graph (MCP tools)

28 MCP tools available for structural queries. Note: this repo is markdown-only so code graph is minimal.

```bash
code-review-graph status    # check current graph state
code-review-graph update    # incremental update
```

## When to Use Each

| Question | Tool |
|----------|------|
| "What topics are related to X?" | `graphify query` |
| "Which articles link to which?" | `graphify path` |
| "What community does this belong to?" | `graphify explain` |
| "Overview of all topic clusters" | Read `graphify-out/GRAPH_REPORT.md` |

## Auto-Update Pipeline

- **File edit by Claude** → `PostToolUse` hook → `code-review-graph update --skip-flows`
- **Session start** → daemon launches `graphify watch` in background
- **git commit** → post-commit hook → `graphify update .` in background
- **Branch switch** → post-checkout hook → `graphify update . --force` in background

## Outputs

```
graphify-out/
├── graph.json        ← queryable graph (1155 nodes)
├── GRAPH_REPORT.md   ← community report (100 communities)
└── graph.html        ← interactive D3 visualization
```

Open `graphify-out/graph.html` in browser for visual exploration.
