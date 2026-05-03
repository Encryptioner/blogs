# Why I Built a Local-First Diff Tool — The Story Behind branchdiff

**TL;DR:** I built **branchdiff** because code review tools shouldn't require the cloud, shouldn't spy on your diffs, and shouldn't lock you into one platform. A browser UI with local SQLite sessions, AI-powered resolve workflows, and cross-platform PR sync changed how I review code. Here's why it matters.

---

## The Problem I Kept Running Into

Picture this: it's 2025, and I'm reviewing a feature branch with 40 changed files. I open GitHub's PR page and... scroll, scroll, scroll. The UI lags. Comments take 3 seconds to load. I navigate away to check something in my terminal, and when I come back, GitHub makes me scroll to the top again.

Then there's the privacy angle. Every diff I view is logged. Every comment, timestamped. GitHub's a company with advertising incentives and data-collection practices. Microsoft's analytics are watching. It's the default, and we've accepted it, but it doesn't have to be this way.

And then the workflow breaks entirely when you work across GitHub *and* Bitbucket. Or when you want to review with your AI assistant but need to juggle context between the PR page and your terminal. Or when you want to post AI-generated comments and have them sync back to the PR — without a plugin, without special setup.

**The core insight:** code review is a *local* activity. Your diff is already on your machine. Your AI assistant is on your machine (or a trusted API you control). Why send it to the cloud?

---

## The Innovation: Blob-Hash Comparison

branchdiff's real breakthrough isn't the browser UI — it's the **file mode** diff algorithm.

Standard `git diff` compares *commit ancestry*. So if:
- `main`: A → B → C → D (file.js = "hello world")
- `feat`: A → X → Y (file.js = "hello world")

Then `git diff main..feat` shows a "change" even though the file is identical. The commits are different, so git says it's a diff. This is noisy and confusing.

**File mode** compares actual *blob content* using hash comparison. Same content = no diff. Different commits? Doesn't matter.

```
branchdiff main feat --mode file
  → "no diff" (content is identical)

git diff main feat
  → "changed" (commit paths differ)
```

I built the **Delta mode** to visualize this divergence:
- **Git-only** (amber) — appears in git diff but not file diff
- **File-only** (blue) — appears in file diff but not git diff
- **Shared** — both modes agree

This catches silent merge resolution bugs that git misses. It's the kind of tool that pays for itself the first time it flags a rebase that silently discarded a critical change.

---

## Three Core Design Principles

### 1. **Everything Runs Locally**

No API calls except:
- `localhost` (browser ↔ CLI server)
- GitHub API via your local `gh` CLI (only when *you* click "Push to PR", not automatically)

Your diffs never leave your machine. Review sessions live in `~/.branchdiff/` as local SQLite. Export/import for backups. That's it.

### 2. **The Browser is the Right UI**

Terminal diffs are fine for quick checks, but reviewing 40 files needs:
- Syntax highlighting (150+ languages)
- Split and unified views (toggle instantly)
- Full file view (see context)
- Inline comments (click any line)
- Keyboard navigation (no mouse)

Building this in the terminal would be painful. A local browser server (like `http://localhost:5391`) gives you React, styling, and zero deployment friction.

### 3. **AI Review Should Be Seamless**

I use Claude Code daily. The `/branchdiff-review` and `/branchdiff-resolve` skills integrate branchdiff's agent commands directly into Claude's workflow:

```bash
branchdiff skill add
# → creates .claude/skills/branchdiff-review/SKILL.md
```

Then:
- `/branchdiff-review` reads the diff, posts inline comments with severity tags
- `/branchdiff-resolve` reads open threads, fixes the code, marks resolved

No copy-paste. No context switching. No special setup. Just slash commands.

---

## Use Cases That Make This Real

### **Use Case 1: Security Audit Before Merge**

You're about to merge a dependency update. You want a security-focused review.

```bash
branchdiff main..feature
```

Then:
```
/branchdiff-review

# Claude Code reads the diff, posts comments tagged [must-fix]:
# - CWE-89 SQL injection on line 42
# - Hardcoded API key in env.ts line 15
```

You fix them (or dismiss with reasons), mark resolved. No Slack thread, no email chain. Everything's in one place.

### **Use Case 2: Code Tour for Onboarding**

A junior dev is joining the team. You want to walk them through your authentication module.

```bash
branchdiff agent tour-start --topic "How does auth work?" --body "Full auth flow from request to session"
branchdiff agent tour-step --tour <id> --file src/auth.ts --line 42 --body "Token validation happens here..."
```

They open the tour in the browser, see 8 steps linked to specific lines with explanations. Beats a 30-minute Zoom call.

### **Use Case 3: Review + Resolve in One Session**

You've written a feature. You want AI feedback and automatic fixes.

```bash
branchdiff main..feature
/branchdiff-review
# → posts 12 comments (bugs, suggestions, nitpicks)

# You inspect in the browser, decide which ones to fix

/branchdiff-resolve
# → reads open threads, fixes 8 of them, marks resolved
# → you manually fix the 4 architectural ones
```

Total time: 5 minutes. No context switching.

---

## Why Not Just Use GitHub/GitLab/Bitbucket?

**GitHub PR page pros:**
- Everyone's there
- Real-time collaboration

**GitHub PR page cons:**
- Slow UI (especially on large diffs)
- Doesn't scale to 100+ files
- Your data feeds into their analytics
- AI integration is bolted-on, not native
- No local session persistence
- Can't run a security audit without third-party tools

**branchdiff pros:**
- Instant, responsive (local SQLite)
- Scales to 1000+ files (lazy-load hunks)
- 100% private (nothing leaves localhost)
- Native AI workflows (Claude Code skills)
- Persistent sessions (comments survive new commits)
- Syncs back to GitHub/Bitbucket (push/pull comments)
- Multiple repos open simultaneously
- No telemetry, no vendor lock-in

**branchdiff cons:**
- Requires Node.js or a standalone binary (one-time install)
- Best with Claude Code (though any AI works via prompts)
- Not real-time collaboration (but you can still push comments to the PR)

Use GitHub for *collaboration*. Use branchdiff for *review*.

---

## The Architecture: Why This Is Fast

**Frontend:**
- React + TypeScript
- Syntax highlighting via Shiki (same as VS Code)
- Lazy-load hunks (only render visible diffs)
- Full file view when you need context
- Mermaid diagram support in comments

**Backend:**
- Node.js + Express
- SQLite for session persistence (no network)
- Async git operations (don't block the UI)
- Local file system only

**Distribution:**
- npm package (`@encryptioner/branchdiff`)
- Standalone binaries (macOS/Linux/Windows, no Node.js required)
- Homebrew, pip, Scoop, Snap, apt support

**CI/CD Integration:**
- GitHub Actions build binaries on every tag push
- Cross-platform smoke tests in PRs
- Auto-update command detects your package manager

---

## What I Learned Building This

### 1. **Blob-hash diffs are underrated**

Most people don't realize commit ancestry diff can be misleading. Showing the divergence (Delta mode) was eye-opening for my own workflow. It flags real bugs.

### 2. **AI agents need command-line interfaces**

The `/branchdiff-review` skill works because branchdiff exposes `branchdiff agent diff` and `branchdiff agent comment` as simple CLI commands. AI agents can call these without SDK magic. Simpler interface = better integration.

### 3. **Sessions matter**

Comment threads persisting across commits (like a GitHub PR) is essential. Every time you commit, your review context should survive. This is why I built a persistent SQLite database instead of ephemeral JSON.

### 4. **Local-first doesn't mean offline**

branchdiff integrates with GitHub and Bitbucket (push/pull comments), but only when you explicitly click. It's not a sync daemon. It's intentional, user-driven sync. This gives you the best of both worlds: local privacy + cross-platform reach.

### 5. **Multiple diff modes prevent bugs**

Having git mode, file mode, and delta mode exposed as toggles in the UI caught edge cases I never would have seen. The 3-way view is powerful.

---

## How It Fits Into the Broader Ecosystem

branchdiff is **complementary**, not competitive:

- **GitHub/Bitbucket:** great for collaboration and CI integration
- **branchdiff:** great for deep, focused reviews (yours, or with AI)
- **GitHub Copilot / Claude Code:** great for inline fixes (while coding)
- **branchdiff + Claude Code:** great for *post-hoc* review and automated fixes

The workflow is:
1. Push your branch → GitHub PR opens
2. Run `branchdiff main..feature` locally
3. Use `/branchdiff-review` to post comments
4. Use `/branchdiff-resolve` to fix them
5. Click "Push to PR" → comments sync to GitHub
6. Team reviews on GitHub (or imports local threads)

You own the review data. GitHub gets the collab layer. Everyone wins.

---

## What's Next

Current focus:
- **Performance:** async git operations, lazy-load hunks (done in v1.4)
- **Integrations:** GitHub sync (done), Bitbucket sync (done), GitLab (pending)
- **AI workflows:** security audit, test coverage gaps, breaking-change detection, dependency review (all documented in the guideline)
- **State sync:** UI collapse state, reviewed-file markers, filter prefs persist across machines (done in v1.4)

Long-term:
- Local LLM support (Ollama, llama.cpp) for offline code review
- Team review workflow (shared SQLite over secure tunnel)
- MCP server for seamless AI integration beyond Claude Code

---

## Try It

```bash
npm install -g @encryptioner/branchdiff
branchdiff main feat
```

Or standalone binary (no Node.js):
```bash
brew tap encryptioner/branchdiff https://github.com/encryptioner/branchdiff-releases
brew install branchdiff
```

Open an issue, share feedback, or star the [GitHub repo](https://github.com/Encryptioner/branchdiff-releases).

---

## Support

If branchdiff saves you time, consider supporting its development:

[![SupportKori](https://img.shields.io/badge/SupportKori-☕-FFDD00?style=flat-square)](https://www.supportkori.com/mirmursalinankur)

---

**Questions?** Read the [complete guideline](https://encryptioner.github.io/branchdiff-releases/guideline.html) or run `branchdiff guide` after install. The CLI includes full AI review workflows, code tour creation, security audits, and dependency review.
