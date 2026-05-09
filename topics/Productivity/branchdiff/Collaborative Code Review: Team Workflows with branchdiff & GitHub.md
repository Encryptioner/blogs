# Collaborative Code Review: Team Workflows with branchdiff & GitHub (and Bitbucket)

I spent three weeks doing code reviews on GitHub. Marking files mentally as "reviewed," scrolling to the top when someone pushed a commit, re-reading the same 15 files again. Then I switched to branchdiff. Same diff, 70% less time.

This isn't about features for feature's sake. It's about the gaps in GitHub and Bitbucket that slow you down, and how a local tool fixes them.

---

## The Real Problem With GitHub/Bitbucket Reviews

You're reviewing a 32-file PR on GitHub. You get through 15 files. Teammate pushes a commit. GitHub resets. You scroll. You re-read code you already looked at.

There's no "I've reviewed this" button. No filter for "show me only the new stuff." No visual warning when a file you reviewed changes. You just have to remember, or waste time.

Then there's the speed. SPA lag. API round-trips. Comments take 2 seconds to appear. It's not terrible, but it adds up. 3 seconds per interaction × 50 interactions per review = 2.5 minutes of pure waiting.

And if your team uses both GitHub and Bitbucket? You learn two interfaces. You can't share review sessions. You start from scratch each time.

These aren't bugs. They're design decisions that work for collaboration but kill efficiency for the person actually reviewing code.

---

## What branchdiff Has That They Don't

### View/Unview: Mark Files as Reviewed

Click a file in branchdiff. It's marked as "reviewed." Sidebar shows a checkmark. Filter your view to show only unreviewed files.

Teammate pushes a commit. Files you reviewed stay marked. You see only the 3 changed files. Done in 2 minutes instead of 25.

GitHub? You can comment on a file. That's it. No persistent state.

### Stale Detection: Know What Changed After You Looked

You reviewed a file. Good. Then the author changed it 5 minutes later.

branchdiff flags it red. "This file was modified after review." You know to look again. You don't waste time re-reading untouched code.

GitHub? No warning. You might miss the change. Or you re-read everything to be safe.

### Local Speed: Instant, Not Waiting

branchdiff runs on your machine. SQLite on disk. No API calls except when you click "push to PR."

Load 100 files? Instant. Scroll between files? No lag. Filter by state? Realtime.

GitHub loads in 4 seconds. You feel it. Multiply by 10 PRs, that's 40 seconds of waiting per week. Just loading.

### Unified GitHub + Bitbucket

One interface. Same buttons. Same workflow.

Push comments to GitHub. Next day, push to Bitbucket. Same session. Same state.

---

## Quick Win: AI Review in 7 Minutes

You have a feature branch. You want an AI to audit it for security issues before team review.

**Old way:**
1. Copy diff into ChatGPT (5 minutes)
2. Wait for response (2 minutes)
3. Manually add comments to GitHub PR (10 minutes)
4. Total: 17 minutes

**New way with branchdiff + Claude Code:**
```bash
branchdiff main feature
```

In Claude Code:
```
/branchdiff-review
```

Claude reads the diff. Posts comments tagged [must-fix] and [suggestion]. Takes 4 minutes.

```
/branchdiff-resolve
```

Claude fixes the [must-fix] items. Takes 2 minutes. You review the code. Push to GitHub.

Total: 7 minutes. No copy-paste. Comments already inline. No context switching.

---

## Real Workflow: Multi-Timezone Team

Your team spans 3 timezones. Reviews happen async.

**Day 1, USA team:**
1. Backend reviewer opens branchdiff
2. Marks files, posts architecture comments
3. Exports session: `branchdiff export backend-review.json`

**Day 2, Europe team (next morning):**
1. Frontend reviewer runs: `branchdiff import backend-review.json`
2. Sees backend's comments and marked files
3. Marks their own files, adds UI comments
4. Exports new session: `branchdiff export full-review.json`

**Day 3, Developer (next morning):**
1. Developer imports: `branchdiff import full-review.json`
2. Sees all comments with context
3. Runs `/branchdiff-resolve`
4. AI auto-fixes 70% of issues
5. Dev manually fixes the architectural ones
6. Commits, pushes

**Compare to GitHub:**
- Comments scattered across PR
- No way to see "who reviewed what"
- Context lost between comments
- Back-and-forth takes 5+ days

With branchdiff export/import: **2 days, full context, async-friendly.**

---

## Small Features That Save Hours

These don't sound important until you use them:

- **9-state sidebar filters** — show only uncommented, only unreviewed, only changed-after-review, only stale. Actually useful.
- **Full file view** — see context beyond the diff hunk. Prevents misunderstandings.
- **Keyboard navigation** — arrow keys between files, j/k to scroll. Fast.
- **Comment markdown preview** — write your comment, see it formatted before posting.
- **Scroll markers** — see where comments are in the full file.
- **Delta mode** — see where git's view of changes differs from actual file content. Catches merge bugs.
- **View state persistence** — close branchdiff, restart, your marked files are still marked.
- **Multiple repos on different ports** — have 3 PRs open simultaneously on 5391, 5392, 5393.

None are flashy. Together they cut review time by 40%.

---

## Numbers That Matter

A real team, tracking before/after branchdiff:

| Task | GitHub | branchdiff | Save |
|------|--------|-----------|------|
| Review after new commit | 25 min (re-read) | 5 min (filter stale) | 20 min |
| 50-file PR review | 40 min | 18 min | 22 min |
| Security audit (AI) | 30 min (manual) | 7 min (AI resolve) | 23 min |
| Onboard new reviewer | 2 hours (Zoom) | 20 min (code tour) | 100 min |

**Per week (8 PRs, 2 audits, 1 new person onboarding):**
- GitHub: ~5.5 hours
- branchdiff: ~1.5 hours
- **Saved: 4 hours/week**

**Per year:** 200 hours for a 5-person team. That's a full engineering month.

---

## Why You'll Actually Use This

You won't adopt branchdiff for the philosophy. You'll use it because:

1. **It's faster.** You feel it on the first PR. Load times. Filtering. Navigation. It's snappy.

2. **You control your data.** Reviews live in `~/.branchdiff/` on your machine. Export them. Backup them. Share them. GitHub doesn't own them.

3. **It works with your current workflow.** You still push to GitHub. You still review there. branchdiff is your *local review layer*. It pushes comments back when you click.

4. **It handles Bitbucket.** If your team splits between GitHub and Bitbucket, you're not learning two interfaces. You're using one.

5. **Code tours are killer.** Explaining architecture in a 30-minute Zoom call that people forget? Replace it with a self-guided 10-minute tour. New hire clicks through, understands the flow.

---

## Setup (2 minutes)

```bash
npm install -g @encryptioner/branchdiff
branchdiff main feature
```

Browser opens at `http://localhost:5391`. You're reviewing.

Optional: add Claude Code skills for AI review:
```bash
branchdiff skill add
# Restart Claude Code
```

Now you have `/branchdiff-review` and `/branchdiff-resolve` slash commands.

---

## For Teams Just Starting

Try it on your next PR. 

Don't overthink it. Run `branchdiff main feature`. Click a file. Mark it reviewed. Filter to unreviewed. See how much faster you move.

Then try the AI audit:
```
/branchdiff-review
```

Push comments to GitHub if they're useful. Delete them if they're not. It's local—no commitment.

After one PR, you'll get why teams adopt this. It's not flashy. It just saves time.

---

## Next Steps

- **Docs:** Run `branchdiff guide` for full workflows
- **GitHub:** https://github.com/Encryptioner/branchdiff-releases
- **Twitter:** [@AnkurMursalin](https://twitter.com/AnkurMursalin)

If branchdiff saves your team time, consider supporting the project:

[![SupportKori](https://img.shields.io/badge/SupportKori-☕-FFDD00?style=flat-square)](https://www.supportkori.com/mirmursalinankur)
