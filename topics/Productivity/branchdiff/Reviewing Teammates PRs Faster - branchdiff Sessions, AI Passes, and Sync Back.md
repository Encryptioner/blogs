# Reviewing Teammates' PRs Faster — branchdiff Sessions, AI Passes, and Sync Back

Reviewing your own code is one workflow. Reviewing somebody else's pull request is another, and it is the one most engineers spend the most time on. A good review is slow on purpose — *understanding* somebody else's intent takes real attention, and there is no AI shortcut for that. But the **mechanics** around the read (re-reading files after a force-push, losing your place between sessions, copy-pasting AI suggestions into the PR comment box, scrolling past the same fifty unchanged lines for the third time) are not work, they are friction. Friction is what burns out reviewers and makes engineers procrastinate on the review queue until Friday afternoon.

This post walks through how I review teammates' PRs with **branchdiff** sitting next to my editor: pull the PR locally, mark what I have already read, run AI passes for the things I am bad at catching, and push the comments back to GitHub or Bitbucket when I am done. The PR itself stays on the platform — that is where the review history is recorded, where merges are gated, where CI runs. branchdiff is just the cockpit I sit in for the parts of review that do not benefit from being a round-trip to the cloud.

---

## Step 1 — open the PR locally

```bash
branchdiff https://github.com/owner/repo/pull/123
# or
branchdiff https://bitbucket.org/workspace/repo/pull-requests/45
```

branchdiff fetches the PR head (running `git fetch` if needed), opens a browser tab on `localhost:5391`, and shows the diff with split or unified view, syntax highlighting, and a sidebar of changed files. The toolbar carries a `#123` badge with a state dot — green for open, purple for merged, red for closed/declined — so at a glance you know what kind of review you are about to do (a fresh review, a re-review of a closed PR, a post-merge audit).

Because this is a comparison between two named refs, the session is **persistent**. Comments survive new commits to either branch — the same idea as a GitHub PR thread, but stored locally in SQLite under `~/.branchdiff/`. If the author force-pushes mid-review, your view markers and any draft comments are still there when you reopen. That single property is what makes branchdiff usable for the kind of review that takes more than one sitting.

You can run multiple PRs at once. Each ref pair gets its own port — the second comparison opens on `5392`, the third on `5393`, and so on — so reviewing your colleague's PR while diffing your own branch in another tab is the default behaviour, not a workaround. `branchdiff list` enumerates every running session if you lose track. Same ref pair re-running in the same repo? branchdiff reuses the existing session and just reopens the browser, so you do not accidentally fragment the review across two ports.

If a PR already has comments on the platform, click the `#123` button and choose **Pull from PR**. Existing review comments come down as local threads anchored to the same lines, with author and timestamp preserved. Now you are reading the diff and the existing review at the same time, in the same place. That is the moment branchdiff stops feeling like a "diff viewer" and starts feeling like the actual review surface.

---

## Step 2 — pace the read with viewed / stale tracking

Big PRs are intimidating because you cannot see your progress. branchdiff borrows GitHub's "viewed" idea and pushes it further:

- Mark a file as **viewed** with the eye icon in the file header (or right-click → *Mark viewed*, or via the keyboard from the file row). The sidebar shows a checkmark next to it.
- A **counter** in the sidebar tells you `12 / 38 viewed` so you know how far you are. On a forty-file PR, that counter is the difference between confident progress and the foggy "I think I covered everything" feeling that makes engineers dismiss a PR as "looks good to me" when they really mean "I am tired."
- If the author later pushes a commit that changes a file you already marked viewed, branchdiff flips it to **stale** and shows an amber dot. You only need to re-read the parts that actually changed — the other 26 files stay marked.

Staleness is detected via an **FNV-1a hash of the file's diff signature**, so the flag is content-based, not timestamp-based. A rebase that does not change the file's content will not invalidate your work. A force-push that retouches one line in a file you already reviewed flips exactly that file to stale, leaving the rest of your viewed set intact. This is the GitHub "viewed" feature done properly: aware of what actually changed, not just whether the commit hash moved.

The status carries across sessions and machines too, because the underlying state is stored both in localStorage (for fast UI) and in a server-backed SQLite table keyed by a stable **repo fingerprint** (which scans your remotes — upstream, then origin, then any other — to converge on a canonical ID across forks and machines). Switch ports, export the bundle on one machine and import on another, or revisit the same PR a week later — your "viewed" markers come with you. The `branchdiff info` command prints the fingerprint and the state-table size so you can audit what is being tracked.

There is also a **commit detail page** (added in v1.5.0). Clicking any commit in the history sidebar opens `/commit/:hash` with the full SHA, parent links, file list with `+N / -N` counts, and the same diff view. Useful when you want to understand a single commit in isolation — for example, the one that reverted the previous reviewer's feedback. The back button preserves your position so you can dive into a commit and come back to the branch comparison without losing where you were.

---

## Step 3 — narrow the file list with sidebar filters

The sidebar has nine filter chips that stack with the search box. Each filter answers a specific question reviewers ask out loud:

| Filter         | Question it answers                                                  |
| -------------- | -------------------------------------------------------------------- |
| **Commented**  | "Which files already have review threads on them?"                  |
| **Uncommented**| "Which files have I not commented on yet?"                          |
| **Viewed**     | "Which files have I marked as reviewed?"                            |
| **Unviewed**   | "What's left for me to look at?"                                    |
| **Stale**      | "Which of my viewed files changed since I marked them?"             |
| **Collapsed**  | "Which diffs am I currently hiding?"                                |
| **Expanded**   | "Which diffs am I focusing on?"                                     |
| **Staged**     | "Which working-tree files have staged changes?" (working-tree only) |
| **Unstaged**   | "Which working-tree files have unstaged changes?" (working-tree)    |

Two collapse-helpers in the toolbar matter alongside the filters: **Collapse all** to fold every file at once when you want a high-level pass, and **Expand all** to open everything when you are doing a deep read. Files with open comments are force-expanded automatically so the threads are never hidden behind a collapsed diff.

The filters auto-hide when they are not applicable (no `Staged` chip when you are reviewing a branch comparison, no `Commented` chip when nothing is commented yet) so the chip strip is never cluttered with options that would not do anything. Filters stack with the search box — narrow by text *and* state simultaneously, e.g. *Filter → Stale + search "auth"* gives you exactly the auth files that changed since you last looked. That is the kind of query you would otherwise do mentally, badly, and slowly.

For working-tree reviews you also get a **staged / unstaged toggle** in the toolbar so you can flip between `git diff --staged` and `git diff` without re-running the command. File rows show inline status badges: **S** (accent-colored, staged), **U** (amber, unstaged), amber dot (stale), checkmark (viewed and current) — each one a single visual that would otherwise need a click to discover.

A typical second-pass workflow becomes: *Filter → Stale*, re-read those files, mark viewed; *Filter → Unviewed*, finish those; *Filter → Commented*, sanity-check the threads. The PR shrinks from "38 files" to a list of seven that need attention right now. That filter sequence is what turns a multi-session review into a closeable task.

---

## Step 4 — full-file view with the change minimap

Inline diffs are great for small changes. They are bad for changes that depend on context far above or below the hunk — and most non-trivial changes are exactly that kind. The toolbar's **Full-file view** opens a VS Code-style side-by-side rendering of the entire file with:

- All hunks expanded in place inside the full file. You see the whole function, not three lines of it ripped out of context.
- A **minimap on the right** marking added, removed, and modified regions so you can scan a 1,000-line file in a glance and click straight to a change. The minimap is the part most reviewers do not realise they were missing until they have it for a week — it makes the question "is there anywhere else this pattern appears?" answerable in two seconds.
- Inline review threads anchored to the same lines they live on in the diff view — comments do not disappear when you switch modes. The `endLine` of the thread is what the anchor uses (a fix landed in v1.5.0 to keep the diff view and the full-file view consistent, so a thread no longer shows in two places at once).

For markdown files, v1.5.0 added a **Preview** toggle in full-file view that renders both old and new sides as formatted markdown side-by-side. Documentation PRs become readable instead of being a maze of `**` and backtick noise. Comments are hidden in preview mode because line numbers do not align to rendered output — that is the right trade-off, but worth knowing if you are looking for a missing thread.

Together, full-file view and the minimap turn a "scrolling through hunks" review into a "reading the file with annotations" review. For complex changes that is a different activity entirely, and it is what makes branchdiff usable for refactor PRs that GitHub's UI cannot really render well.

---

## Step 5 — let an AI take the first pass

Reading a 40-file PR by hand is necessary work. Running an AI pass *on top of* that read is the part that is genuinely additive — the AI is bad at understanding intent but good at the mechanical sweep that humans skim past. branchdiff exposes a small `branchdiff agent` command surface (`diff`, `comment`, `general-comment`, `resolve`, `dismiss`, `reply`, plus tour commands) that any AI can drive — Claude Code via the `/branchdiff-review` skill, or any other model via the copy-paste prompt in the README, or a one-shot pipe:

```bash
branchdiff review context | claude -p "review for security and breaking changes"
branchdiff review run --exec "claude -p 'security audit'" --mode review
```

The README documents eight scoped workflows: general review, resolve, code tour, summary, security audit, test coverage gaps, breaking-change review, and dependency review. For somebody else's PR I usually run two:

- **Security audit** when the diff touches auth, input handling, or anything web-facing. The AI looks only for security issues — injection, secret leaks, weak crypto, broken authz, deserialisation traps, path traversal, SSRF, dependency risk — and skips style entirely. A 200-line auth diff produces five precise comments instead of fifty.
- **Test coverage gaps** for new logic. The AI walks every new function and branch, checks the test directory for coverage, and flags uncovered paths with a stub `it(...)` suggestion. Priority is error branches → new public API → edge cases → happy path. Private helpers exercised transitively are skipped, so the comment density is low and the signal is high.

For larger or riskier PRs I add **breaking-change review** (which classifies every change and drafts an UPGRADE.md snippet) or **dependency review** (which flags added or major-bumped packages with maintenance, license, bundle-size, and CVE notes).

Two recent improvements (v1.5.0) make these passes feel less like noise:

- **Constructive tone.** Comments lead with the problem ("This returns undefined when X is empty"), not a judgment ("This is wrong"). Collaborative language ("Consider using X" instead of "You should"). Acknowledge good code briefly when it deserves it.
- **Nth-time review awareness.** The skill reads `branchdiff agent list --status resolved` and `--status dismissed` before commenting. Resolved threads are not re-raised, dismissed ones are only re-flagged if there is new evidence. This is what makes follow-up reviews (2nd, 3rd, nth pass) practical — you can re-run the skill after every meaningful commit without paying the cost of re-litigating earlier feedback.

You read the AI's comments first, decide which are real, and either dismiss them with a reason (`branchdiff agent dismiss <id> --reason "..."`) or keep them. The dismissal reason is the part of the workflow that keeps the AI honest across passes.

---

## Step 6 — push comments back to the canonical PR

When you are happy with the threads, click the PR badge in the toolbar (it shows the PR number and a state dot — green open, purple merged, red closed) and choose **Push to PR**. Each single-comment thread is posted as an inline review comment on GitHub or Bitbucket. Duplicates are skipped (same file, line, body). Threads with replies stay local because the platform review-comment APIs do not map cleanly to multi-reply threads — those conversations belong on the PR itself.

The same dropdown carries the PR lifecycle actions, so you do not have to switch tabs to act on the review:

- **Approve**, **Request Changes**, **Comment** (Comment uses `gh pr comment` so it posts a regular PR comment, not a review object — fixed in v1.5.1; the previous version mistakenly created a review).
- **Merge** (with strategy picker — squash / merge / rebase on GitHub, squash / merge / fast-forward on Bitbucket since v1.5.1; previously Bitbucket merges always used the repository default).
- **Close**, **Reopen** (only when valid; `SUPERSEDED` Bitbucket PRs do not show Reopen because the API does not support that operation).
- **Mark as Draft / Ready for Review**, **Edit title and description**.

Each action is proxied to `gh` or the Bitbucket REST API, so the audit trail on the PR looks identical to clicking on the website. **Reviewer pills** in the dropdown header show every reviewer's latest state — approved, changes requested, commented, pending, or dismissed (the last one was added in v1.5.1; earlier versions fell back to "pending" and you would lose track of who had been dismissed by an admin) — at a glance.

Sync requires your local HEAD to match the PR head and your working tree to be clean — the same constraints any review tool would impose to keep line numbers honest. Errors stay inline in the confirm dialog (v1.5.1) so a typed comment is not lost when the network blips, which removed about 80% of the "the dialog vanished and ate my carefully-typed merge message" frustration earlier versions had.

---

## A reasonable cadence

For a typical 30-file PR my flow looks like this:

1. `branchdiff <pr-url>` — open locally, take a quick scroll through. Pull existing comments if other reviewers have been here first.
2. *Collapse all* → expand the 5–6 files I care about most → read and mark viewed as I go. Use the search box to find the entry point of the change and start there.
3. Run security audit and test coverage gap workflows in Claude Code on the side. They post comments while I keep reading.
4. Triage AI comments — fix-suggest some by leaving the AI's comment as-is, dismiss some with reasons, escalate a few to `[must-fix]` if I agree.
5. *Filter → Stale* on the next sit-down if the author force-pushed. Re-read those few files. Update threads.
6. Push surviving comments back to the PR, approve or request changes from the toolbar, optionally merge with the right strategy.

The total wall-clock time on a careful review goes down enough that I can afford to be more thorough on the parts that matter — flow control, contracts, edge cases, the "is this the right abstraction?" question — instead of burning attention on plumbing.

---

## Where it stops

A few things branchdiff deliberately does not do, so the picture is not over-claimed:

- It does not run your CI. The platform's checks are still the gate — branchdiff just shows you the PR state, not the green/red of every check.
- It does not push multi-reply threads. If a back-and-forth needs to happen before merge, that conversation belongs on the PR.
- It does not store comments in the cloud. Wipe `~/.branchdiff/` and you lose local drafts that have not been pushed.
- It does not bypass branch protection. Merge actions still respect required reviews, status checks, and protected branches on the platform.
- It does not replace the PR page. The PR description, the CI status block, the linked issues — all of that still lives on the platform, with a one-click *Open in browser* in the dropdown to get you there when you need it.

The tool is intentionally small. It does the part that benefits from being local, and gets out of the way of the part that benefits from being on the platform.

---

## Quick start

```bash
npm install -g @encryptioner/branchdiff
# or:  pip install branchdiff
# or:  brew tap encryptioner/branchdiff https://github.com/encryptioner/branchdiff-releases && brew install branchdiff
branchdiff https://github.com/your-org/your-repo/pull/123
```

That is the whole setup. Add `branchdiff skill add` if you want the Claude Code slash commands. Everything else is in the toolbar.

The next time a teammate posts a 40-file PR in your team chat, try opening it locally instead of on the website. Mark a few files viewed. Run a security audit pass. Push the comments back. See whether the review felt different.

---

## Let's Connect

I'm always excited to hear about what you're building! If you found this guide helpful, have questions, or just want to share your code review and AI workflow setup:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
- **Support**: [SupportKori](https://www.supportkori.com/mirmursalinankur)

*branchdiff source, changelog, and releases: [github.com/Encryptioner/branchdiff-releases](https://github.com/Encryptioner/branchdiff-releases).*
