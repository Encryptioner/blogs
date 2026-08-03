# Branchdiff Features — Presentation Plan

Source-of-truth plan for the `P-5-branchdiff-features/` presentation directory. This
file decides **what to present** and **how**, and is the spec the HTML decks are
built from. Read this before adding or editing a deck.

---

## 1. Goal & audience

Public-facing, step-by-step feature decks for **branchdiff** (v2.0.0), aimed at
developers who review code on GitHub / Bitbucket. Each deck is a self-contained
HTML file framed as **native problem → branchdiff solve**, with real UI
screenshots and conceptual diagrams.

Not a feature dump: every slide earns its place by naming a real pain in the
native PR workflow and showing how branchdiff removes it.

---

## 2. Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Structure | Multiple **standalone** HTML decks (one per theme) + an `index.html` navigation hub | User wants modular, linkable decks — not one mega-deck |
| Scope | **8 themed decks** curating all features through v2.0.0 | Public-friendly; not exhausting; every feature group maps to one deck |
| Screenshots | **Fresh captures** (11 UI shots) + existing conceptual diagrams (11) | Real, current v2.0.0 UI; diagrams for flows that can't be screenshotted |
| Visual identity | **GitHub-dark + neon mint** (matches a git tool's identity) | User pick |
| CSS approach | **Self-contained custom CSS** (Style A architecture) recoloured to Style B palette | Robust through the raw-GitHub proxy — no Tailwind CDN dependency to fail; easy to template across decks |
| Extensibility | Numbered files, data-driven hub, documented deck template | New feature ships → add one deck = one file + one hub entry |

> **Note on style:** the visual identity is Style B (Harness deck: `--bg #0D1117`,
> `--accent #00E3A8`, Inter + JetBrains Mono, terminal-window code blocks). It is
> implemented with Style A's (Token Economics) clean, reusable custom-CSS
> component architecture so each deck is a single dependency-free file that
> renders correctly through the preview proxy. If literal Tailwind is preferred,
> swap the `<style>` block — the slide markup is independent of the CSS method.

---

## 3. File structure

```
blogs/presentations/P-5-branchdiff-features/
├── index.md                      ← this plan
├── index.html                    ← navigation hub (deck gallery + install + proxy links)
├── 01-local-diff-cockpit.html    ← Deck 1
├── 02-local-first-privacy.html   ← Deck 2
├── 03-comments-review-surface.html ← Deck 3
├── 04-ai-review-resolve.html     ← Deck 4
├── 05-automatic-pr-review.html   ← Deck 5
├── 06-sessions-sync-platform.html ← Deck 6
├── 07-repo-exploration.html      ← Deck 7
├── 08-multi-repo-auto.html       ← Deck 8
└── images/
    ├── 01-diff-unified.png       ← fresh capture
    ├── 02-diff-split.png
    ├── 03-diff-full.png
    ├── 04-inline-comment.png
    ├── 05-history.png
    ├── 06-commit-graph.png
    ├── 07-branches.png
    ├── 08-file-tree.png
    ├── 09-blame.png
    ├── 10-search.png
    └── 11-commit-detail.png
```

Conceptual diagrams are **not copied** — they're referenced via the blog-wide
relative path `../../assets/B-13|B-14|B-15/<name>.png` (same convention as the
Token Economics deck), so they stay single-sourced.

---

## 4. Preview / link pattern (the hub)

Decks are viewed through the raw-GitHub preview proxy. The hub builds each link
in JS so adding a deck is a one-line data entry:

```js
const REPO = 'Encryptioner/blogs', BRANCH = 'master';
const DIR  = 'presentations/P-5-branchdiff-features';
const PROXY = 'https://encryptioner.github.io/public-websites/any-page/';
function deckUrl(file) {
  const raw = `https://raw.githubusercontent.com/${REPO}/refs/heads/${BRANCH}/${DIR}/${file}`;
  return PROXY + '#' + encodeURI(raw).slice(8);   // slice(8) drops https://; encodeURI → %20 for the space
}
```

The hash form (`any-page/#…`) is the scheme-less raw URL — `slice(8)` drops
`https://` (slashes stay literal; `encodeURI` is a no-op now that the dir has no
spaces). Image paths inside each deck stay
relative (`images/…`, `../../assets/B-NN/…`) — proven to resolve through this
proxy by the existing Token Economics deck.

---

## 5. Feature → deck mapping (coverage through v2.0.0)

All 16 feature groups map to exactly one deck (install lives in the hub). Deck 8
extends `auto` to multiple repos — new in v2.0.0, the only feature not in the
original G1–G16 grouping. Nothing is dropped.

| # | Deck | Feature groups covered |
|---|---|---|
| 1 | The Local Diff Cockpit | G1 viewing · G5 sidebar/filters · G14 keyboard |
| 2 | 100% Local-First & Privacy | G2 local/sqlite/fingerprint/no-auth/export · G1.5 stale-tab guard |
| 3 | Comments & Review Surface | G3 comments · G4 viewed/stale/collapse state · G12 tours |
| 4 | AI Review & Resolve | G8 agent · skills · resolve-with-verify |
| 5 | Automatic PR Review | G9 `auto` · G10 worktrees |
| 6 | Sessions, Sync & Platform Actions | G6 sessions · G7 PR integration · G11 CLI · G16 branch sync |
| 7 | Repo Exploration | G13 history/blame/tree/search/branches/show/graph/commit-detail |
| 8 | Multi-Repo Auto Cycles | multi-repo `auto` · `--repo-paths`/depth-1 discovery · `--repo-concurrency` · `--keep-servers` · discovery consent · cycle report · session-death resilience |
| — | (hub) Get Started | G15 cross-platform install · self-update |

---

## 6. Asset inventory

### Fresh UI screenshots (`images/`, all master↔dev/initial-implementation-v7 unless noted)

| File | Depicts | Deck |
|---|---|---|
| `01-diff-unified.png` | Unified diff, 147-file sidebar, Files/Commits tabs | 1 |
| `02-diff-split.png` | Split (side-by-side) view | 1 |
| `03-diff-full.png` | Full-file compare modal + minimap | 1 |
| `04-inline-comment.png` | Inline `[suggestion]` thread on a diff line (demo pair) | 3 |
| `05-history.png` | Commit history list, count, search, Merges/Graph toggles | 7 |
| `06-commit-graph.png` | Full-DAG commit graph (coloured lanes, merge curves) | 7 |
| `07-branches.png` | Branches & tags browser | 7 |
| `08-file-tree.png` | File browser (tree + syntax-highlighted preview) | 7 |
| `09-blame.png` | Blame view (per-line commit/author/message hunks) | 7 |
| `10-search.png` | Code search results, grouped by file | 7 |
| `11-commit-detail.png` | Commit detail page (SHA, parents, file list, diff) | 7 |

### Conceptual diagrams (`../../assets/B-NN/`, single-sourced from blog posts)

| File | Depicts | Deck |
|---|---|---|
| `B-13/platform-vs-local-split.png` | Source of truth vs. working surface | 2 |
| `B-13/pr-lifecycle-groups.png` | PR lifecycle action groups | 6 |
| `B-13/90-second-flow.png` | 90-second PR review flow | 6 |
| `B-14/self-review-before-after.png` | Self-review before vs. after opening PR | 4 |
| `B-14/self-review-4-steps.png` | Self-review workflow in 4 steps | 4 |
| `B-14/comment-tag-taxonomy.png` | Comment tag taxonomy | 3 |
| `B-14/session-stats.png` | Sample self-review session breakdown | 4 |
| `B-15/viewed-stale-state.png` | Viewed/stale state machine | 3 |
| `B-15/sidebar-filters-grid.png` | 9 sidebar filters | 1, 3 |
| `B-15/ai-passes-decision.png` | AI passes decision tree | 4, 5 |
| `B-15/review-cadence.png` | Review cadence in 6 steps | 5 |

CLI commands (decks 2, 4, 5, 6, 8) are shown as **styled code blocks** (real
commands + output as text), not terminal screenshots — cleaner and matches the
existing decks' `.code-block` pattern. Deck 8 (Multi-Repo Auto) uses code blocks
exclusively — its content is terminal output (combined PR lists, cycle reports,
server tallies), so it ships no screenshot or conceptual diagram of its own.

---

## 7. Visual style spec

**Palette** (CSS variables, GitHub-dark + neon mint):
```
--bg #0D1117  --bg-elev-1 #161B22  --bg-elev-2 #1C2230  --bg-code #0A0E14
--border #30363D  --border-soft #21262D
--text #E6EDF3  --muted #8B949E
--accent #00E3A8  (neon mint — primary actions, key emphasis)
--warn #F2CC60  --danger #FF7B72  --info #79C0FF
```
**Fonts:** Inter (body) + JetBrains Mono (code, eyebrows, chrome) — Google Fonts
`<link>`. No serif (dev-tool tone).

**Layout:** full-viewport slide deck. Each `<section class="slide">` is
`position:absolute; inset:0`; only `.slide.active` shows; `←/→`/`Space`/click/touch
advance; bottom nav pill + top progress bar + `NN / total` counter; `O` overview,
`F` fullscreen. (Ported from Token Economics' deck mechanics.)

**Reusable components** (defined once in each deck's `<style>`):
`.eyebrow`, `h3.section` (with `<em>` accent word), `ul.bullets` (diamond markers),
`ul.checklist`, `.two-col`, `.code-block` (terminal window with red/yellow/green
dots), `.callout` / `.callout.accent` / `.callout.danger`, `.stat-row > .stat`,
`.fig` + `.fig-caption` (click → lightbox), `.vs` (problem | solve two-column).

**Slide chrome:** hero slide (`badge` + `h1.title` + `h2.subtitle` + meta);
content slides (`.slide-num` → `NN · UPPERCASE` → `h3.section`).

---

## 8. Per-deck content

Each deck follows the same skeleton (~10–14 slides):
1. **Hero** — title + the one-line problem hook.
2. **The native problem** — what GitHub/Bitbucket makes painful (concrete).
3. **The solve** — how branchdiff removes it (step by step).
4. **Feature deep-dive** — screenshots/diagrams + step walkthroughs.
5. **How to use it** — real commands in `.code-block`s, numbered click/keystroke flows.
6. **Recap** — what this deck covered, link to next deck + hub.

**The decks are a live demo, not just a pitch.** Every feature slide pairs *what it
is* with *how to use it*: the exact CLI command, the click sequence, or the
keystroke flow a user performs. A reader should be able to reproduce the feature
from the deck alone. Prefer a numbered step list (`.checklist`) or a `.code-block`
on every feature slide — never describe an action without showing how to do it.

### Deck 1 — The Local Diff Cockpit
- **Problem:** GitHub's hunk view rips lines from context → "fifty disconnected
  three-line windows" on refactor PRs; mouse-heavy; GitHub and Bitbucket differ.
- **Solve:** one local page, whole file in place, identical on both forges.
- **Features:** split/unified/full views, syntax highlight (Shiki), markdown
  preview, 9 stacking sidebar filters, file-row status badges, right-click bulk
  ops, collapse-all (keeps open threads), virtualized lists, vim keys (`j/k n/p
  u/s/f x r /`), auto-advance, behind-by indicator, swap.
- **Assets:** `01-diff-unified`, `02-diff-split`, `03-diff-full`, `B-15/sidebar-filters-grid`.

### Deck 2 — 100% Local-First, Private, Offline
- **Problem:** reviewing proprietary code in a cloud diff ships it to a third
  party; PR comments vanish offline; UI state tied to a folder path.
- **Solve:** diff never leaves the machine; SQLite sessions in `~/.branchdiff/`;
  repo fingerprint follows the repo, not the dir.
- **Features:** localhost-only server, SQLite persistence, repo fingerprint, no
  auth (reuses `gh`/Bitbucket App Password), export/import bundle (portable JSON,
  LWW merge), stale-tab protection (`409 STALE_SERVER`).
- **Assets:** `B-13/platform-vs-local-split`; code blocks (`branchdiff info`,
  `export --all`, `import`).

### Deck 3 — Comments & Review Surface
- **Problem:** no severity taxonomy (ad-hoc prefixes); GitHub "viewed" resets on
  every push; Write/Preview toggle is clunky; onboarding = "go read the codebase".
- **Solve:** tagged inline threads, persistent viewed/stale state, WYSIWYG
  comments, AI-generated code tours.
- **Features:** `[must-fix]/[suggestion]/[nit]/[question]` tags, WYSIWYG Milkdown
  editor, thread lifecycle (open/resolved/dismissed + replies), general comments
  (one consolidated comment per review pass), viewed counter that survives
  force-pushes, FNV-1a stale detection, per-(pair+mode) collapse persistence,
  working-tree (staged/unstaged) toggle, code tours.
- **Assets:** `04-inline-comment`, `B-14/comment-tag-taxonomy`,
  `B-15/viewed-stale-state`, `B-15/sidebar-filters-grid`.

### Deck 4 — AI Review & Resolve
- **Problem:** engineers paste diffs into ChatGPT — comments don't land on lines,
  every engineer uses different prompts, re-runs re-litigate everything, AI
  claims fixes without verifying.
- **Solve:** a controlled `branchdiff agent` surface; comments land on real lines
  with tags; nth-pass awareness; resolve verifies before claiming.
- **Features:** `agent` command surface, generated Claude Code/opencode skills,
  plugin marketplace, copy-paste prompts, `review run --exec` one-shot pipe,
  nth-time review awareness, constructive-tone skill, reads-from-git (`agent file
  --ref`), resolve-with-verification, 8 pre-built workflows, local-only resolve
  (`--sync` to mirror), remote-pull-first.
- **Assets:** `B-14/self-review-before-after`, `B-14/self-review-4-steps`,
  `B-14/session-stats`, `B-15/ai-passes-decision`; code blocks (`agent comment`,
  `review run --exec`, `/branchdiff-review`).

### Deck 5 — Automatic PR Review (`branchdiff auto`)
- **Problem:** reviewers forget to re-review; fear of "AI posted to the PR
  without me"; reviewing someone's PR means `gh pr checkout` — your working tree
  is gone.
- **Solve:** watch open PRs, review only ones with new commits, stay-in-control
  flags, isolated worktree per PR.
- **Features:** `auto` watch/pick, `--review/--notify/--push`,
  `--tool/--exec`, `--skill`, `--parallel`, `--resolve`, deterministic
  `--approve/--request-changes [level]` gate (severity levels 1-5),
  pre-run "Using:" / "Defaults in effect:" summary, `--max-files`/`--min-files`/`--max-lines`/`--min-lines` size-skip (whole-PR-vs-base, composes, unknown size reviewed), `--no-skip`, account/env
  isolation, one-`auto`-per-repo, `--worktree` / `--worktree-remove` (dirty guard),
  config file support (`~/.branchdiff/config.json` global + `.branchdiff.json`
  per-repo, `defaults`/`auto` keys, CLI > repo > global precedence, `auto.exec`/
  `auto.tool` global-or-CLI-only, `branchdiff config` / `config sample [--force]`).
- **Assets:** `B-15/review-cadence`, `B-15/ai-passes-decision`; code blocks.

### Deck 6 — Sessions, Sync & Platform Actions
- **Problem:** the tab-switching tax (PR → editor → PR → Slack → AI → PR);
  force-push resets your place; every forge action is a cloud round-trip;
  comparing against a stale local branch.
- **Solve:** persistent sessions, two-way comment sync, PR lifecycle from the
  toolbar, branches fetched/fast-forwarded before comparison.
- **Features:** persistent named-pair sessions (survive force-push, PR-number
  auto-reset), multi-session (per-port), session isolation, background `--detach`,
  close-from-browser, open any PR URL locally, push/pull/Sync All, per-thread sync
  badge, preview-pull, PR lifecycle actions (approve/request/merge/close/reopen/
  draft/ready/edit), create PR, push-before-request-changes, approve-with-comments,
  `pr`/`sync`/`session`/`list`/`kill`/`info`/`doctor`/`update` CLI, shell
  completion, branch fetch/ff, stale-code refusal.
- **Assets:** `B-13/90-second-flow`, `B-13/pr-lifecycle-groups`; code blocks.

### Deck 7 — Repo Exploration (History, Blame, Tree, Search)
- **Problem:** `git log` is text; forge commit lists are paginated/slow; blame is
  a separate page per file; `git checkout <old-commit>` detaches HEAD.
- **Solve:** one browser tab — history, graph, blame, tree, search, branches,
  repo-at-a-commit — all virtualized, all read-only time-travel.
- **Features:** file browser, `history`, `show <ref>`, per-file history
  (follows renames), `branches`, `search`, blame, commit graph DAG, commit detail
  page, merge badges, cross-page icon nav, typo-tolerant refs, behind-by + swap.
- **Assets:** `05-history`, `06-commit-graph`, `07-branches`, `08-file-tree`,
  `09-blame`, `10-search`, `11-commit-detail`.

### Deck 8 — Multi-Repo Auto Cycles
- **Problem:** reviewing PRs across several repos means `auto` once per repo —
  `cd` in, run, wait, `cd` out, repeat. The per-repo prompts fragment one decision,
  each run re-pays startup, and a shell loop cannot produce one combined list.
- **Solve:** one `auto` run over a set of repos — `--repo-paths` or depth-1
  discovery, one combined PR list across both forges, pick once, review each
  selected PR in its own repo, then a cross-repo cycle report.
- **Features:** `--repo-paths` (comma-separated, repeatable, abs/relative/`~`);
  depth-1 discovery (cwd-is-repo vs. direct child repos; excludes `.`-prefixed and
  `node_modules`); one combined list with flat numbering + `1-5` ranges and name
  disambiguation; `--repo-concurrency` bounded scan pool (default 4); discovery
  consent gate before unattended review; `--keep-servers` residual cap (one sweep
  per cycle, finished-review servers only); session-death resilience and a
  publication gate so a PR is marked reviewed only once its findings publish;
  end-of-cycle report with live/stopped session markers; `--watch` across repos;
  exit codes 0 (clean) / 1 (refusal) / 2 (skipped or failed).
- **Assets:** none — code blocks only (terminal output: combined lists, cycle
  reports, server tallies).

---

## 9. The hub (`index.html`)

A standalone gallery page (same visual style) that:
- Lists all 8 decks as cards (number, title, one-line problem, thumbnail) → each
  links via `deckUrl(file)` (§4). A deck with no screenshot (deck 8) renders a
  branded `no-thumb` placeholder instead of an empty box.
- Has a **Get Started** section: install methods (npm/pnpm/yarn/pip/brew/scoop/apt/
  binary/npx) as copyable code chips + `branchdiff update` self-update note.
- **Version coverage signal:** a `v2.0.0` badge in the topbar (the `.ver` class)
  plus a hero line — "Decks cover branchdiff through v2.0.0 — multi-repo auto,
  detached server review, severity-gated approve, click-to-open notifications." Footer links to the user
  guide / changelog / GitHub. Bump both when a new version's features land.
- **Data-driven:** decks come from a single `DECKS = [...]` array. Adding a deck =
  drop the file in the dir + add one `{n, file, title, hook, thumb}` entry. No
  other edit needed.

---

## 10. Extensibility — adding a deck when a new feature ships

Deck 8 (Multi-Repo Auto) is the first deck added via this path — copy `05-automatic-pr-review.html`
(sibling `auto` deck), keep the external CSS/JS refs and `Deck.mount` verbatim, and add one entry
to the `DECKS` array. General steps:

1. Copy the closest sibling deck → `NN-<new-theme>.html`.
2. Edit the `<title>`, hero, slides, and asset refs. The `<style>` is shared externally —
   nothing to port; only the `<section class="slide">` bodies change.
3. Add a screenshot to `images/` if the feature is visual; otherwise leave `thumb:''` for the
   branded `no-thumb` placeholder (deck 8 does this).
4. Add one entry to the `DECKS` array in `index.html`; bump the topbar badge + coverage line.
5. Add a row to §5 (mapping) and §6 (inventory) here.

The `<style>` block is identical across decks — copy it whole, only the
`<section class="slide">` bodies change.

---

## 11. Build order

1. `index.html` hub (establishes the shared style + `deckUrl` + `DECKS` array).
2. Deck 1 (Local Diff Cockpit) — also validates the template + screenshot rendering.
3. Decks 2–7, in order.
4. Verify each via the proxy URL; fix image paths if the proxy rewrites them.

---

## 12. Honest scope boundaries (credibility slide, esp. decks 2 & 6)

From the blog posts — worth one slide so the decks read as honest, not salesy:
- No CI — platform checks still gate the merge.
- No cloud storage — wipe `~/.branchdiff/` and unpushed local drafts are gone.
- Multi-reply threads stay local (forge APIs don't map them).
- No branch-protection bypass — merge respects required reviews and status checks.
- Not a full PR-page replacement — description, linked issues, CI block stay on the forge ("Open in browser" is one click).
