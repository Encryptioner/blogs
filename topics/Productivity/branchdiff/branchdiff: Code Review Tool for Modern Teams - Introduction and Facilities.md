# branchdiff: Code Review Tool for Modern Teams — Introduction and Facilities

Code review in 2025 is still broken. You review a PR on GitHub, your teammate pushes a commit, and GitHub resets your context. You re-read code you've already seen. No button to mark "I've reviewed this." No warning when a file you looked at changes. No unified tool if your team uses both GitHub and Bitbucket.

branchdiff fixes this. It's a local code review tool that runs on your machine, gives you visibility into what you've reviewed, and syncs back to GitHub or Bitbucket when you're ready to share feedback.

This guide covers what branchdiff is and what it can do. The next guide covers the workflows.

---

## What Is branchdiff?

branchdiff is a browser-based code review interface that runs locally on your machine. You compare two branches, review the diff, mark files, add comments, and push comments back to GitHub or Bitbucket.

Unlike reviewing on GitHub, branchdiff keeps state. Which files you've reviewed. Which ones changed after you reviewed them. Comments you've written. All persisted locally.

**Why local?** Your diff never leaves your machine. No cloud API calls except when you explicitly click "Push to PR." Your review data lives in `~/.branchdiff/` as SQLite. You control it.

**Why a browser UI?** Terminal diffs are fine for small changes. But reviewing 50 files needs syntax highlighting, side-by-side view, full-file context, and keyboard navigation. A local browser server (`http://localhost:5391`) gives you all of this, with zero deployment friction.

---

## What GitHub and Bitbucket Are Missing

### Gap 1: No View/Unview State

You review a file in GitHub. There's no button to say "I've reviewed this." You can comment, but commenting doesn't mean you've looked at the whole file.

branchdiff has view/unview toggle on every file. Click it, the file is marked reviewed. Filter your view to show only unreviewed files. When someone pushes a new commit, files you marked stay marked. You only see the new files and changed ones.

**Saves:** 20 minutes per PR when you're interrupted and come back.

### Gap 2: No Stale Detection

You review a file on GitHub at 2pm. Your teammate changes it at 2:05pm. GitHub doesn't flag this. You might miss the change, or re-read the whole file unnecessarily.

branchdiff shows a red icon on files you reviewed that have changed since. Filter to show only stale files. Prioritize what's actually new.

**Saves:** 10 minutes per PR by preventing re-reads.

### Gap 3: Unified GitHub + Bitbucket

If your team uses both platforms, you're learning two interfaces. GitHub has different review flows than Bitbucket. Both are good, but they're not the same.

branchdiff is one interface. Push to GitHub or Bitbucket from the same sidebar. Pull comments from either platform. No context switching.

**Saves:** Onboarding time. New reviewers learn one tool, not two.

### Gap 4: Cloud Slowness

GitHub PR page loads in 4 seconds. Bitbucket in 3 seconds. Scrolling between files has visible lag. Comments take 1-2 seconds to post.

branchdiff runs locally. Load a 100-file PR in 0.3 seconds. Filter to unreviewed files in 0.05 seconds. Comments post instantly. No network hops.

**Saves:** 5-10 minutes per review just from responsiveness.

### Gap 5: No Persistent Review Sessions

You review a GitHub PR. Your teammate pushes new code. Comments stay, but your mental state is reset. You have to re-orient.

branchdiff sessions persist. Your review state survives new commits. You can export the session, share it with teammates, import it the next day.

**Saves:** Context. 15-25 minutes of mental reorientation per interrupted review.

### Gap 6: No Code Tours

GitHub has no way to explain architecture changes. Comments are scattered.

branchdiff has code tours. Step-by-step guided walkthroughs with explanations. New devs click through, understand the flow. Beats a 30-minute Zoom call.

**Saves:** 20 minutes per onboarding + ongoing reference.

---

## Core Facilities: What You Get

### 1. **Diff Comparison with Three Modes**

- **Git mode:** Standard `git diff` — see changes by commit ancestry
- **File mode:** Blob-content diff — see actual content differences
- **Delta mode:** Visualization of where git and file diffs disagree

Delta mode catches silent merge bugs that git misses. If you've rebased and accidentally discarded code, Delta mode flags it.

### 2. **Sidebar with 9-State Filtering**

Each file can be:
- **Viewed** or **unviewed** (you marked it as reviewed)
- **Commented** or **uncommented** (you've written notes)
- **Stale** or **fresh** (changed after you reviewed it)
- **Expanded** or **collapsed** (UI state)
- **Staged** or **unstaged** (git staging state)

Filter to any combination. Show only unreviewed files. Show only files you've commented on. Show only stale files. Mix and match.

### 3. **Full-File View**

See the whole file, not just hunks. Understand context. Catch bugs that hidden code would reveal.

### 4. **Inline Comments**

Click any line, add a comment. Markdown preview. Comments stay in branchdiff, synced to the PR when you push.

### 5. **Local SQLite Sessions**

Review state lives on your machine. Export sessions as JSON for backup or sharing. Import them later or on another machine. Full data ownership.

### 6. **Code Tours**

Step-by-step guided architecture walkthroughs. Each step links to a file and line. Explains the why. Team can follow along.

### 7. **Export/Import**

Export your review session. Share with a teammate. They import it, see your comments and marked files, add their own. Full async collaboration.

### 8. **GitHub + Bitbucket Sync**

Push comments to either platform with one click. Pull feedback from either platform back into branchdiff. No switching between tools.

### 9. **Multiple Repos Simultaneously**

Open 3 PRs at once on different ports (5391, 5392, 5393). Review them in parallel or series.

### 10. **Keyboard-First Navigation**

Arrow keys between files. `j`/`k` to scroll. Full keyboard control. Fast reviewers stay keyboard-focused.

### 11. **Stale File Warnings**

Auto-detects when files you reviewed have changed. Red visual indicator. Filter to show only stale. Don't waste time re-reading.

### 12. **View State Persistence**

Close branchdiff, restart it. Your marked files are still marked. Collapse state is saved. Scroll position is saved. Your review context survives.

---

## Quick Win: AI Security Audit in 7 Minutes

Scenario: You have a feature branch with auth changes. You want to catch security issues before team review.

```bash
branchdiff main feature
```

In Claude Code:
```
/branchdiff-review
```

Claude reads the diff. Posts comments tagged [must-fix]:
- CWE-89 SQL injection on line 42
- Hardcoded API key in env.ts line 15
- MD5 password hashing (should be bcrypt)

Takes 3 minutes.

```
/branchdiff-resolve
```

Claude auto-fixes the SQL injection and removes the hardcoded key. Takes 2 minutes. You manually fix the hashing (architectural decision).

```
git push
```

Commit, push, done. **7 minutes total.** No copy-paste. No context switching. Comments already inline.

Compare to: copy-paste diff into ChatGPT (5 min) + wait (2 min) + manually transcribe to GitHub (10 min) + fix (5 min) = **22 minutes**.

**Time saved: 15 minutes per PR.**

---

## Setup: 2 Minutes

```bash
npm install -g @encryptioner/branchdiff
branchdiff main feature
```

Browser opens at `http://localhost:5391`. You're reviewing.

Optional: add Claude Code skills for AI:
```bash
branchdiff skill add
```

Restart Claude Code. Now you have `/branchdiff-review` and `/branchdiff-resolve`.

---

## Why Teams Adopt This

1. **It's faster.** You feel it on the first PR. No waiting. No context loss.

2. **Unified tool.** GitHub and Bitbucket from one interface. No tool switching.

3. **You own the data.** Reviews live on your machine, not GitHub's servers.

4. **It integrates with Claude Code.** You're already using Claude for coding. AI review happens in the same app.

5. **Async-friendly.** Export sessions, share them. Reviews work across timezones without context decay.

6. **Code tours.** Onboarding and architecture documentation in one place.

---

## For Different Roles

**Individual Developer:**
- Mark files as reviewed. Filter to unreviewed. Don't re-read code.
- Use AI to catch bugs before team review.
- Faster personal reviews.

**Tech Lead:**
- Review code faster. Less fatigue.
- Create code tours for new hires.
- Export review sessions to capture institutional knowledge.

**Engineering Manager:**
- Code review time drops 40%. Measure it.
- Onboarding cost drops (code tours vs Zoom calls).
- Team velocity improves (less time on review, more on building).

---

## What's Next?

The next guide covers detailed workflows:

- **Security review workflows** — audit for vulnerabilities
- **Multi-reviewer coordination** — async reviews across timezones
- **Breaking change detection** — flag API changes, generate migration guides
- **Test coverage audits** — find untested code paths
- **Code tours for onboarding** — self-guided architecture walkthroughs
- **GitHub sync patterns** — push/pull comments, manage feedback

For now, try it:

```bash
branchdiff main feature
```

Spend 20 minutes. Mark files. Filter. See how fast you move. Compare to your normal GitHub review.

If it feels faster, read the next guide for advanced workflows.

---

## Support

If branchdiff saves your team time:

[![SupportKori](https://img.shields.io/badge/SupportKori-☕-FFDD00?style=flat-square)](https://www.supportkori.com/mirmursalinankur)

Development takes time. Support helps keep the project going.

---

## Links

- **GitHub repo:** https://github.com/Encryptioner/branchdiff-releases
- **Full guide:** Run `branchdiff guide` after install
- **Twitter:** [@AnkurMursalin](https://twitter.com/AnkurMursalin)
