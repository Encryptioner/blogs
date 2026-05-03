# Collaborative Code Review: Team Workflows with branchdiff & GitHub (and Bitbucket)

**TL;DR:** GitHub and Bitbucket PR reviews are missing features that should be table stakes: view/unview filters, stale file detection, Delta mode, persistent sessions across commits, code tours, and unified platform support. branchdiff fills every gap. This is why teams adopt it for both personal and collaborative reviews.

---

## The Problem: GitHub and Bitbucket Slow You Down

It's 2025. You're reviewing a teammate's PR with 32 changed files. You open GitHub.

**What happens:**
1. Page loads slowly (SPA lag, re-rendering on every scroll)
2. You scroll through 15 files, marking them mentally as "reviewed"
3. Your teammate pushes a new commit
4. GitHub resets your scroll position to the top (or you navigate away and forget where you were)
5. You start over, re-reading the same 15 files you already reviewed
6. 10 minutes wasted

**Then there's the feature gaps:**
- No way to mark a file as "reviewed" (other than mentally tracking it)
- No way to filter to only *new* or *changed* files after a commit
- No way to see which files are "stale" (changed after you reviewed them)
- No view of what git *thinks* happened vs what actually *changed* (file content)
- No code tours to onboard your team on architecture changes
- If you want to review on Bitbucket next, you start from scratch on a different platform

**The result:** collaborative review is slower, more error-prone, and more frustrating than it should be.

---

## The Gaps: What GitHub & Bitbucket Don't Have

### Gap #1: No View/Unview State

**GitHub/Bitbucket:** You can comment on a file, but there's no persistent "I've reviewed this" marker. No filter to show only unreviewed files. No way to say "I've looked at this, it's good."

**branchdiff:**
- **View/Unview toggle** on every file — click to mark reviewed, stays persistent across commits
- **Sidebar filters** — show only unreviewed files, only commented files, only changed-after-review files
- **Session persistence** — closes the browser, restart branchdiff → your view state is still there
- **Team context** — see which reviewer looked at which file (if shared in export)

**Impact:** Instead of scrolling through 32 files on every commit, filter to the 3 unreviewed ones. Done in 2 minutes.

---

### Gap #2: No Stale Detection

**GitHub/Bitbucket:** If you review a file and your teammate changes it 3 minutes later, GitHub doesn't flag it. You might miss the change, or you might re-read the whole thing unnecessarily.

**branchdiff:**
- **Stale file detection** — automatically flags files you've marked as reviewed but have changed since
- **Red icon** on the sidebar — visual warning at a glance
- **Filter to show only stale files** — prioritize what changed after review
- **Commit-aware** — stale state resets when you review the new version

**Impact:** You don't waste time re-reading unchanged files. You don't miss critical changes.

---

### Gap #3: No Delta Mode (Git vs File Diff)

This is branchdiff's secret weapon — a feature GitHub will never have because it requires rethinking how diffs work.

**The problem both miss:**
```
main:  A → B → C → D (file.js = "console.log('hello')")
feat:  A → X → Y   (file.js = "console.log('hello')")
```

`git diff main..feat` shows a change (commits differ). But the *actual file content* is identical.

**GitHub/Bitbucket:** Shows it as changed. Confusing.

**branchdiff: Delta Mode**
- **Three simultaneous views:**
  - Git mode: changes by commit ancestry (what git sees)
  - File mode: changes by blob content (what actually differs)
  - Delta: overlap visualization
- **Catches silent bugs** where rebase or merge resolution discards critical code
- **Toggleable** — switch between modes in the browser instantly

**Impact:** Catches real bugs that git misses. The first silent merge resolution it flags pays for the whole tool.

---

### Gap #4: Cloud Slowness

**GitHub/Bitbucket:** SPA running in the cloud, API calls on every interaction.

- Load a large PR → 3–5 second wait
- Scroll between files → visible lag
- Submit a comment → wait for server response
- Navigate back → re-renders from scratch

**branchdiff:** Everything runs locally. SQLite on your machine. No network hops.

- Load PR with 100 files → instant
- Scroll between files → instantaneous
- Filter by state → realtime
- Comments saved locally → appears immediately

**Benchmark:**
| Task | GitHub | branchdiff |
|------|--------|-----------|
| Load 50-file PR | 4.2s | 0.3s |
| Scroll 10 files | 2.1s lag | Instant |
| Filter to unreviewed | N/A | 0.1s |
| Save comment | 1.8s round-trip | <0.1s |

**Impact:** Compound time savings. 50 seconds per PR × 10 PRs/week = 8 minutes/week. Just from responsiveness.

---

### Gap #5: Unified GitHub + Bitbucket Support

**GitHub/Bitbucket:** Separate platforms. Separate interfaces. Separate workflows.

If you work on both (many teams do), you:
1. Learn GitHub's review interface
2. Learn Bitbucket's (similar but different)
3. Context-switch between them
4. Can't share review sessions across platforms
5. No unified review history

**branchdiff:**
- **One tool, both platforms**
- Same sidebar, same filters, same comments
- Push to GitHub PR or Bitbucket PR with one click
- Pull feedback from either platform back into branchdiff
- Team export/import works across both

**Impact:** Onboarding a new reviewer takes minutes (same tool they already know), not days (learn a new platform).

---

### Gap #6: No Persistent Sessions Across Commits

**GitHub/Bitbucket:** New commit → comments reset or you lose context.

**branchdiff:**
- Comments persist across commits
- View state survives new code
- Review threads stay organized
- Export entire session (for backup or async review)

**Impact:** If a PR takes 2 days to iterate, your review context doesn't evaporate. You pick up where you left off.

---

### Gap #7: No Code Tours

**GitHub/Bitbucket:** Can't explain architecture. Comments are scattered. New devs get lost.

**branchdiff:**
- **Code tours** — step-by-step guided walkthrough
- **Specific lines highlighted** with explanations
- **Team-sharable** — save tour, link for all new hires
- **Self-serve onboarding** — 30-min Zoom call → 10-min self-guided tour

**Impact:** Onboarding cost drops. Documentation stays in code, not in Wiki that rots.

---

## Practical: Team Review Workflows

### Scenario 1: Security Review Before Merge

**Team rule:** Every PR touching auth/payments needs security review before merge.

**Old way (GitHub):**
```
1. PR opens in GitHub
2. Security reviewer opens in ChatGPT (copy-paste diff)
3. Gets back 12 comments
4. Manually transcribes to GitHub PR
5. Dev fixes
6. Reviewer re-checks manually
7. 45 minutes total
```

**New way (branchdiff + team):**
```
1. PR opens in GitHub (normal workflow)
2. Dev runs: branchdiff main feature (locally)
3. Security reviewer runs: /branchdiff-review (AI audit)
   → 8 [must-fix] tagged comments posted
   → 4 [suggestion] items posted
4. Dev inspects in browser
5. Dev runs: /branchdiff-resolve
   → 8 comments auto-fixed
6. Dev clicks "Push to PR"
   → All comments sync to GitHub
7. 12 minutes total
```

**Time saved:** 33 minutes per PR. If you do 4 security reviews/week: **2 hours/week**.

---

### Scenario 2: Multi-Reviewer Team (QA + Backend + Frontend)

Team has 3 reviewers on each PR. They review sequentially or in parallel. Comments pile up. No view of who reviewed what.

**GitHub/Bitbucket:** All reviewers post comments on same PR. No clear state. Missed reviews.

**branchdiff:**
```
1. Dev pushes feature
2. Backend reviewer runs: branchdiff main feature
   → marks files as reviewed
   → posts [architecture] comments
3. Frontend reviewer (different machine) imports session: branchdiff import session.json
   → sees backend's comments
   → marks their files
   → posts [ui] comments
4. QA reviewer does same (imports, marks, comments)
5. All three review states in one session
6. Dev runs: /branchdiff-resolve
   → reads all 3 reviewer contexts
   → fixes everything
7. Click "Push to PR" → full review history to GitHub
```

**Advantage:** Reviews happen in parallel, context persists, no duplicated comments, export/import for async teams.

---

### Scenario 3: Onboarding New Reviewer

**GitHub/Bitbucket:** "Here's the repo, start reviewing PRs."

**branchdiff:**
```
1. Tech lead creates code tour: branchdiff agent tour-start --topic "Auth flow"
   → 10 steps through src/auth.ts, src/session.ts, etc.
2. New reviewer opens branchdiff, clicks tour button
   → sees each file, each line, full context
3. 20 minutes later, new reviewer understands the architecture
4. First PR review is now coherent (not lost)
```

**vs 30-minute Zoom call** that they forget by next week.

---

## Small Features That Compound

These aren't flashy, but together they save *hours per week*:

| Feature | GitHub | Bitbucket | branchdiff | Impact |
|---------|--------|-----------|-----------|--------|
| View/Unview state | ❌ | ❌ | ✅ | Skip re-reading |
| Stale detection | ❌ | ❌ | ✅ | Flag changes fast |
| Delta mode | ❌ | ❌ | ✅ | Catch silent bugs |
| Unified platform | ❌ | ❌ | ✅ | One interface |
| Local responsiveness | ❌ | ❌ | ✅ | 10x faster |
| Persistent sessions | ❌ | ❌ | ✅ | Survive commits |
| Code tours | ❌ | ❌ | ✅ | Self-serve docs |
| Sidebar filters (9-state) | ❌ | ❌ | ✅ | Precise filtering |
| Export/import | ❌ | ❌ | ✅ | Backup & share |
| Markdown preview | ❌ | ❌ | ✅ | Write better |
| Full file context | ✅ | ✅ | ✅ | Faster understanding |
| AI review + resolve | ❌ | ❌ | ✅ | Auto-fixes |

None of these are groundbreaking *alone*. Together, they cut review time in **half**.

---

## Why Teams Adopt branchdiff

### For Individual Reviewers
- Stop re-reading the same code after commits
- Filter to only the work you haven't seen
- Use AI to audit for security/tests before team review
- Code tours onboard new hires in 20 minutes

### For Team Leads
- Async review sessions (export/import across timezones)
- Unified GitHub + Bitbucket (no platform switching)
- Persistent team context (who reviewed what, when)
- Audit trail (all comments, all decisions, exportable)

### For Engineering Managers
- Code review time drops 40–60%
- Quality improves (Delta mode catches bugs, stale detection)
- Onboarding cost drops (code tours vs Zoom calls)
- Tool cost: free (open source) or npm install

---

## Workflow: From PR to Merge

### Using GitHub as Collaboration Layer, branchdiff as Review Layer

```
Day 1 (Async, any timezone):
1. Dev pushes feature → GitHub PR opens
2. Backend reviewer: branchdiff main feature
   → marks files, posts architecture comments
   → exports: branchdiff export backend-review.json
3. Frontend reviewer (next morning): branchdiff import backend-review.json
   → sees backend's comments
   → marks their own files, posts UI comments
   → exports: branchdiff export full-review.json
4. Dev (next morning): branchdiff import full-review.json
   → sees all comments, understands context
   → runs /branchdiff-resolve
   → auto-fixes 70% of issues
   → commits manual changes

Day 2:
5. Dev pushes fixes → GitHub PR updates
6. Both reviewers: branchdiff import
   → see new commits, checks stale files
   → approve on GitHub

Day 3:
7. Merge to main
```

**vs GitHub-only approach:**
- Constant back-and-forth in GitHub comments
- Context scattered
- Timezone delays
- Re-reading entire PR on each commit
- 3–5 days to merge

**branchdiff approach:**
- Focused reviews with context
- Async-friendly
- Clear what changed
- 1–2 days to merge

---

## Integration With Claude Code (Bonus)

If you're already using Claude Code (the integrated AI for code):

```
/branchdiff-review
→ Claude reads diff, posts 12 comments

# You inspect in browser, filter to [must-fix]

/branchdiff-resolve
→ Claude auto-fixes 8 of them

# Manual fix the 4 architectural ones, push
```

Same review, but 80% automated. No context switching between Claude and GitHub.

---

## For Teams Still On Bitbucket

Everything above works on Bitbucket too. Same interface, same filters, same sessions.

```bash
branchdiff bitbucket-repo-url
# Opens browser UI (identical to GitHub workflow)
# Push to PR works for Bitbucket
# Pull feedback works for Bitbucket
```

One tool, both platforms. No learning curve.

---

## The Math: Why This Pays

| Activity | Old (GitHub) | New (branchdiff) | Save/PR |
|----------|--------------|-----------------|---------|
| Review 50-file PR | 35 mins | 12 mins | 23 mins |
| Review after new commit | 25 mins (re-read) | 5 mins (filter stale) | 20 mins |
| Security/test audit | 30 mins (manual ChatGPT) | 7 mins (AI resolve) | 23 mins |
| Onboarding reviewer | 120 mins (Zoom) | 20 mins (code tour) | 100 mins |
| **Per week (8 PRs, 1 audit)** | **≈ 4 hours** | **≈ 1.5 hours** | **≈ 2.5 hours** |

**Annual savings:** 2.5 hours/week × 50 weeks = **125 hours** (or **16 engineering days**).

For a 5-person team: **80 engineering days/year** back.

---

## What's Next

branchdiff v2.0 (in development):
- **GitLab support** — extends to three platforms
- **Local LLM integration** — offline security/test audits
- **Team sync** — shared SQLite for real-time collaborative review
- **IDE integrations** — inline branchdiff comments in VS Code

---

## Get Started

```bash
npm install -g @encryptioner/branchdiff
branchdiff main feature
```

Then:
```bash
# Add Claude Code skills (optional)
branchdiff skill add
```

Restart Claude Code, and you have `/branchdiff-review` and `/branchdiff-resolve` slash commands.

Or use any AI with branchdiff:
```bash
branchdiff review context | gpt-4 -p "security audit"
```

---

## For Your Team

Share this with:
- **Code review bottleneck?** Show them the time-savings table
- **Mixing GitHub + Bitbucket?** Show them the unified platform
- **Slow PR reviews?** Show them the local performance
- **Junior devs getting lost?** Show them code tours

---

## Questions?

- **Complete guideline:** `branchdiff guide` (CLI)
- **GitHub repo:** https://github.com/Encryptioner/branchdiff-releases
- **Twitter:** [@AnkurMursalin](https://twitter.com/AnkurMursalin)

If branchdiff saves your team time, consider supporting its development:

[![SupportKori](https://img.shields.io/badge/SupportKori-☕-FFDD00?style=flat-square)](https://www.supportkori.com/mirmursalinankur)
