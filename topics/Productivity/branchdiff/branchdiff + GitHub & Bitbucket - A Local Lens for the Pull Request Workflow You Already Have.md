# branchdiff + GitHub & Bitbucket: A Local Lens for the Pull Request Workflow You Already Have

GitHub and Bitbucket are excellent at what they do. They host your code, run your CI, gate your merges, manage your branch protection rules, and keep an auditable record of every approval, comment, and force-push. None of that is broken, and **branchdiff is not trying to replace any of it**. If your team's review process works on GitHub or Bitbucket today, it will continue to work the same way after you install branchdiff — the platform is still where reviews are recorded, where merges are gated, and where the history lives.

What branchdiff *does* try to fix is the small, daily friction that builds up around the PR page. The tab-switching. The page reloads. The moment you lose your place when a teammate pushes a new commit and the diff scrolls back to the top. The constant copy-paste between your editor, your terminal, and the review UI. The slow round-trip every time you click a file in the file list. The mismatch between how you read code in VS Code (with the full file in front of you) and how you read it on a PR page (with hunks ripped out of context). Each of those frictions is small. Together they are the reason most engineers procrastinate on reviews until the end of the day.

branchdiff is a local browser app that opens beside your editor, reads the diff straight from your repo on disk, and talks to GitHub or Bitbucket through the same `gh` CLI or REST API you would use anyway. It runs entirely on `localhost`, stores its state in `~/.branchdiff/` as a SQLite file, and only makes a network call when you click *Push to PR*, *Pull from PR*, or one of the PR lifecycle actions in the toolbar.

There is one more reason this layer matters in 2026: **AI is now part of almost every review**, whether the team formalised it or not. Engineers paste diffs into ChatGPT, run Copilot review, fire a Claude Code session against a branch, or pipe `git diff` into an `llm` CLI. Done ad-hoc, that AI usage drifts — different people use different prompts, comments do not land on the right lines, and the context never makes it back to the PR. branchdiff gives that AI usage a controlled, repeatable surface: the same diff the human is looking at, the same line numbers, the same comment threads, with explicit `branchdiff agent` commands so the AI cannot wander outside the review, and a one-click sync back to the canonical PR. The deeper AI workflows are covered in the next two posts in this series; the point here is that the local lens is what makes systematic AI review *possible* without giving up control over what gets posted and where.

This post is about how those two pieces — the platform and the local lens — fit together. What stays on the platform, what moves to your machine, and how the seams are designed so neither side has to know the other exists.

---

## The mental model: source of truth vs. working surface

Think of the PR on GitHub or Bitbucket as the **source of truth**. The review history, approvals, merge state, CI status, branch protection, and audit trail all live there. Nothing in branchdiff changes any of that. Your reviewers, your release process, and your compliance posture keep working exactly the way they always have.

branchdiff is the **working surface** for the part of review that is fundamentally local — reading the diff, marking files as you go, drafting comments, navigating between files with the keyboard, and (optionally) running an AI pass. When you are ready, you push the comments to the PR with one click and the platform takes over again.

The split looks like this:

| Concern                              | Lives on GitHub/Bitbucket | Lives in branchdiff |
| ------------------------------------ | ------------------------- | ------------------- |
| Merge gating, branch protection      | Yes                       |                     |
| CI / status checks                   | Yes                       |                     |
| Approvals & required reviewers       | Yes                       |                     |
| Final review comments                | Yes (after sync)          | Yes (drafted here)  |
| Reading the diff with full context   |                           | Yes                 |
| Marking files reviewed / stale       |                           | Yes                 |
| Running AI review or resolve         |                           | Yes                 |
| PR lifecycle clicks (approve, merge) | Yes (canonical)           | Yes (proxied)       |

Everything in the right column is a convenience layer. Everything in the left column is still authoritative. If you uninstall branchdiff tomorrow, your team's review process keeps working — you just go back to clicking on the PR page directly. That is the design constraint the whole tool is built around.

---

## Opening a PR locally without leaving the canonical PR

You can point branchdiff at a PR URL on either platform:

```bash
branchdiff https://github.com/owner/repo/pull/123
branchdiff https://bitbucket.org/workspace/repo/pull-requests/45
```

Under the hood, branchdiff reads the URL, resolves the base and head refs from `gh pr view --json baseRefName,headRefName,...` (or the equivalent Bitbucket REST endpoint), runs `git fetch` if the head is not already local, and opens a browser tab at `http://localhost:5391` with the diff rendered. Syntax highlighting for 150+ languages, split or unified view, sidebar of changed files, keyboard shortcuts for next/previous file (`j`/`k`) and next/previous hunk (`n`/`p`). The PR on the platform is untouched — branchdiff is just rendering the same diff differently, with different ergonomics.

When the comparison is between two named refs (`main..feature`), branchdiff opens a **persistent review session** backed by SQLite. Inline comments you write here survive new commits to either branch — the same idea as a GitHub PR thread, but stored locally. If you want to start fresh, the toolbar has a *New review* button or you can pass `--new` on the command line. Archived sessions are kept (`branchdiff review threads --session <id>`) so you can audit what feedback was raised on the previous round.

Snapshot reviews — your working tree, staged changes, or a specific commit — get an ephemeral session per HEAD state. A new commit creates a new session. That is deliberate: comments anchored to lines that no longer exist would be misleading, so they get archived rather than re-projected onto something that drifted underneath them.

Multiple PRs at once is the default, not a workaround. Each unique ref pair gets its own port (the second comparison opens on `5392`, the third on `5393`, and so on). The toolbar tells you which session you are on, and `branchdiff list` enumerates everything currently running. Reviewing a teammate's PR while iterating on your own branch in another tab works without any process juggling.

---

## PR lifecycle from the toolbar (without losing the audit trail)

Since v1.5.0 the toolbar shows a dropdown for the open PR with the actions you would otherwise click on the platform. This is the part most people are skeptical about — "you're rebuilding the GitHub UI?" — so it is worth being precise about what the dropdown actually is.

It is **not** a parallel database of PR state. It is a remote control. Each action calls out to `gh` for GitHub or the Bitbucket REST API for Bitbucket, and the canonical PR records the action with the same timestamp it would have had if you had clicked on the website. If you approve from branchdiff and immediately refresh the PR page, the approval is right there. If your repo has branch protection requiring two reviews, an approve from branchdiff counts toward exactly one of them — the platform's gating logic still applies.

The dropdown groups four kinds of action:

**Review actions** — Approve, Request Changes, Comment. The Comment action posts a regular PR comment via `gh pr comment` (fixed in v1.5.1; the previous version mistakenly created a formal review object). Request Changes is now optional-comment on both platforms; if you provide nothing, a default "Changes requested." message is posted, because both APIs always update the review state.

**Merge action** — with a strategy picker. GitHub offers *Merge commit*, *Squash*, and *Rebase*; Bitbucket offers *Merge commit*, *Squash*, and *Fast-forward* (added in v1.5.1 — previously Bitbucket merges always used the repository default). The strategy is passed through to the API as `merge_method` (GitHub) or `merge_strategy` (Bitbucket). Branch protection rules and required status checks still apply — if the PR cannot merge, the platform refuses and branchdiff surfaces the error inline in the confirm dialog.

**State actions** — Close, Reopen (only when valid; `SUPERSEDED` Bitbucket PRs do not show Reopen because the API does not support it), Mark as Draft, Mark Ready for Review.

**Metadata actions** — Edit title and description, Sync comments, Open in browser.

The dropdown header carries a **state dot** (green for open, purple for merged, red for closed/declined) and a row of **reviewer pills** showing each reviewer's latest state — approved, changes requested, commented, pending, or dismissed (the last one was added in v1.5.1; previously dismissed reviewers fell back to "pending"). On GitHub the reviews are deduplicated to the latest entry per reviewer; on Bitbucket they are normalised so the labels read the same on both sides.

Destructive actions (merge, close, request changes) show a confirmation dialog before they fire. Since v1.5.1 errors stay inline in the dialog, so a typed comment is not lost when the network blips — that single fix removed about 80% of the "the dialog vanished and ate my comment" frustration that earlier versions had.

---

## Comment sync — both directions, opt-in

Comments are where most of the day-to-day review work happens, so this is the seam that matters most. branchdiff does two things here, both opt-in.

**Push local comments to the PR.** If you drafted comments in branchdiff (manually or via an AI pass), the toolbar shows a button labelled with the PR number, e.g. `#42`, with a state dot indicating the PR's current status. Click it, choose **Push to PR**, and each single-comment thread is posted as an inline review comment on the PR. Duplicates (same file, line, body) are skipped automatically. Threads that already have replies are skipped because the platform review-comment APIs do not map cleanly to multi-reply threads — those conversations belong on the PR itself.

A status toast tells you exactly what happened: pushed N, skipped K duplicates, skipped M multi-reply threads, failed P with a per-thread reason. Failures (e.g. line numbers no longer present in the PR head) keep the local thread intact so you can fix the anchor and try again.

**Pull PR comments into branchdiff.** Same dialog, **Pull from PR** button. Existing review comments come down as local threads so you can read and respond in the same place you read the diff. This is what makes branchdiff usable for re-review — open the PR locally on day three, pull the comments, see the threads inline, mark them resolved as the author addresses them, push the resolutions back.

The sync requires your local HEAD to match the PR head, and your working tree to be clean. Both are real constraints that any serious review tool would impose to keep line numbers honest. branchdiff surfaces both in the dialog with a one-line explanation of what to do (`git pull --rebase`, `git stash`) so you do not have to remember which check you failed.

This is the only cloud round-trip in the whole tool. There is no telemetry, no analytics call, no remote diff service. The tool is otherwise bound to `localhost`. Wipe `~/.branchdiff/` (`branchdiff prune`) and there is nothing in any backend with your data on it.

---

## A typical 90-second flow

To make the integration concrete, here is what reviewing a teammate's PR looks like after branchdiff is installed:

```bash
# Teammate posts: "PR is up — https://github.com/acme/api/pull/482"
branchdiff https://github.com/acme/api/pull/482     # ~3 seconds
```

Browser opens. Toolbar shows `#482` with a green state dot. Reviewer pills: one teammate already approved, one pending. The diff loads instantly because it is reading from disk. You scroll, mark a few files viewed, drop two `[suggestion]` comments and one `[must-fix]`. Click `#482`, choose **Push to PR**. Toast: "Pushed 3 comments." Click **Approve** in the dropdown — the toolbar updates to show your green pill alongside the existing one. Total wall-clock time: 90 seconds for the round-trip from "teammate posts link" to "PR has your review on it." The work of *reading* the PR is unchanged; everything around it shrunk.

The same flow on Bitbucket is identical except the URL and the merge strategy choices in the dropdown. That uniform UX is the second-biggest reason multi-platform teams adopt branchdiff — engineers stop having to remember which platform's UI does which click.

---

## What this saves you (honestly)

It is not magic. branchdiff does not write your reviews for you and it does not change how your team merges code. What it gives you is:

- **Fewer tab switches.** Diff, comments, AI assistant, and PR lifecycle all sit on one local page that loads in milliseconds.
- **A consistent UI across GitHub and Bitbucket.** If your team straddles both — many do — the review keystrokes are the same on either side. The platforms still have their own UIs; branchdiff just spares you from learning two of them at once.
- **No re-reading after a force-push.** The viewed/stale tracking and persistent sessions remember which files you have already looked at, so you only re-read the parts that actually changed.
- **A predictable place to plug an AI assistant.** That is the topic of the next two posts in this series — self-review on your own branch before you open a PR, and AI-augmented review of teammates' PRs, both pushing back to the platform when you are done.
- **Controlled AI surface.** Every AI comment lands on a real line, with a tag, in the same review session as your manual comments. You can dismiss, resolve, or push selectively. The AI cannot post directly to the PR — it goes through the same `branchdiff agent` commands you would use, and you stay the gate.

---

## Where it stops

A few things branchdiff deliberately does not do, so the picture is not over-claimed:

- It does not run your CI. Your platform's checks are still the gate.
- It does not store comments in the cloud. If you wipe `~/.branchdiff/` you lose local drafts that have not been pushed.
- It does not push multi-reply threads. If you need a back-and-forth before merge, that conversation belongs on the PR.
- It does not bypass branch protection. Merge actions still respect required reviews, status checks, and protected branches on the platform.
- It does not replace the PR page entirely. The PR description, the CI status block, the linked issues — all of that still lives on the platform, and branchdiff has a one-click *Open in browser* in the dropdown to get you there.

The tool is intentionally small. It does the part that benefits from being local, and it gets out of the way of the part that benefits from being on the platform.

---

## Try it on a PR you already have open

```bash
npm install -g @encryptioner/branchdiff
# or:  pip install branchdiff
# or:  brew tap encryptioner/branchdiff https://github.com/encryptioner/branchdiff-releases && brew install branchdiff
branchdiff https://github.com/your-org/your-repo/pull/123
```

Click the PR badge in the toolbar, watch the reviewer pills populate, push a comment back, and check that it shows up on the PR. The point of the exercise is not "branchdiff vs. GitHub" — it is to see where your existing review workflow keeps a tab open that does not need to be open.

The next two posts cover the AI half of the workflow: self-review on your own branch *before* the PR opens, and AI-assisted review of teammates' PRs that pushes comments back to the canonical thread.

---

## Let's Connect

I'm always excited to hear about what you're building! If you found this guide helpful, have questions, or just want to share your code review and AI workflow setup:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
- **Support**: [SupportKori](https://www.supportkori.com/mirmursalinankur)

*branchdiff is open source under Commons Clause + MIT. Source, releases, and changelog: [github.com/Encryptioner/branchdiff-releases](https://github.com/Encryptioner/branchdiff-releases).*
