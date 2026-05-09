# Self-Review With AI Before You Open the PR — A Practical Workflow with branchdiff

The honest truth about most pull requests is that the first reviewer should have been the author. Half of the comments a reviewer writes — missing null check, untested error branch, accidental log of a token, that one TODO that shipped, the import that is now unused, the function that grew to 80 lines and could not see its own size — are things you would have caught yourself if you had read your own diff carefully one more time.

Reading your own diff carefully is hard. You have been staring at the code for a day. Your brain pattern-matches what you *meant* to write, not what is actually on the page. The cognitive cost of going through every changed file again, line by line, is exactly the cost the next reviewer will have to pay, and you usually skip it because you already know what you wrote. That is the bug.

This post is about closing that gap with an AI-assisted self-review pass on your own branch, run locally with **branchdiff**, *before* the PR ever goes up. The goal is not to skip the human reviewer. It is to walk into the PR with the embarrassing stuff already fixed, the obvious questions already answered, and the test gaps already filled — so the reviewer's attention can land on the parts of the change that genuinely need a second pair of eyes.

---

## Why "before the PR" matters more than you think

If you push first and review later, every AI comment becomes noise on the PR. Every dismissal becomes another notification. Every fix becomes a force-push that your reviewer has to re-read. The audit trail fills up with churn that has nothing to do with the actual change. Worse, by the time you start the AI pass, a teammate may already be reading the diff — they catch the obvious bug, you fix it, the AI flags the same bug five minutes later, and now you look careless.

If you self-review *before* opening the PR, the AI's output is a private workspace. You decide what to act on, you commit the fixes into your own history (often as `fixup!` commits that you squash before pushing), and the PR you eventually open is cleaner from the first push. Reviewers see your real work, not your stream-of-consciousness fixes.

There is a second, subtler benefit: you learn from the dismissals. Every time you push back on an AI comment with a real reason ("the wrapper handles null upstream", "this is intentionally synchronous because of contention"), you are teaching yourself the rationale you would otherwise leave implicit. That reason, written down, is exactly what your next reviewer needs in the PR description.

branchdiff is built around this idea: the review session is local, comments live in `~/.branchdiff/`, nothing leaves your machine until you click *Push to PR*, and the AI surface is a small, explicit set of `branchdiff agent` commands that the AI is forced to use. That last constraint is what makes systematic self-review possible — the AI cannot wander off, edit files behind your back, or post directly to the PR. It posts comments, you read them, you decide.

---

## The 4-step workflow

Assume you have been working on a `feature/payments` branch off `main`. The change is non-trivial — say twelve files, three hundred lines added — and you want to clean it up before requesting review.

### Step 1 — open your own diff locally

```bash
branchdiff main feature/payments
```

A browser tab opens at `http://localhost:5391` with the diff. Because you are comparing two named refs, this is a **persistent session** — the comments you (or the AI) post here will survive new commits to either branch, so you can iterate on fixes across multiple commits without losing the review trail. If you later run `branchdiff main feature/payments --new`, the current session is archived (still queryable via `branchdiff review threads --session <id>`) and a fresh one starts.

The diff renders with split or unified view, syntax highlighting for 150+ languages, a sidebar of changed files, and the usual `j`/`k` next/previous-file keyboard shortcuts. You will use those a lot.

### Step 2 — run an AI review pass

If you use Claude Code, install the skills once:

```bash
branchdiff skill add        # adds .claude/skills/branchdiff-{review,resolve}
```

Then in your Claude Code session:

```
/branchdiff-review main feature/payments
```

The skill knows to call `branchdiff agent diff` to read the full diff, `branchdiff agent comment --file <p> --line <n> --body "[tag] ..."` to post inline comments, and `branchdiff agent general-comment` for diff-wide notes. Each comment carries a severity tag — `[must-fix]`, `[suggestion]`, `[nit]`, or `[question]` — so you can triage at a glance without reading every comment in detail.

If you use a different AI, the README ships a copy-paste prompt that drives the same `branchdiff agent` commands. Or pipe the context out for a one-shot review with no session needed:

```bash
branchdiff review context | claude -p "review for security and breaking changes"
branchdiff review run --exec "claude" --mode review
```

The point is that the AI talks to branchdiff through a small, explicit command surface — `diff`, `comment`, `general-comment`, `resolve`, `dismiss`, `reply`, plus the tour commands. It cannot wander off and edit files behind your back. The boundary is the API.

Two recent improvements (v1.5.0) make this pass noticeably better:

- **Constructive tone.** The skill now leads with the problem rather than a judgment, uses collaborative language ("Consider using X" instead of "You should"), and acknowledges good code. Comments read like a careful peer, not a lint rule shouting at you. The change matters more than it sounds — when AI comments read as accusations, engineers ignore them or argue with them; when they read as observations, engineers actually fix the bug.
- **Nth-time review awareness.** Before re-reviewing, the skill reads `branchdiff agent list --status resolved` and `--status dismissed`. Resolved threads are not re-raised, dismissed ones are only re-flagged if there is new evidence. This is the difference between an AI that reviews and one that nags. It also means you can run `/branchdiff-review` after every meaningful commit without paying the cost of re-litigating earlier feedback.

### Step 3 — read, triage, resolve

Open the browser. Each AI comment is anchored to a line, with the tag visible in the gutter and the body inline. You have four options per thread:

- **Fix it** — make the change in your editor, then resolve the thread (`branchdiff agent resolve <id> --summary "..."` or click *Resolve* in the UI). The summary is optional but worth writing — a future you (or `/branchdiff-review` on the next pass) gets to see what was done.
- **Auto-fix it** — if you are using Claude Code, `/branchdiff-resolve` reads open comments, applies the fixes, and resolves threads with a summary of what changed. Useful for batches of mechanical fixes (rename, extract function, add null check). Read the diff before committing — the AI occasionally takes a `[suggestion]` more literally than you intended.
- **Dismiss it** — the AI was wrong, out of scope, or already handled elsewhere. `branchdiff agent dismiss <id> --reason "..."` records why, and the reason is what nth-time review awareness keys off so future passes do not re-raise the same point.
- **Ask back** — for `[question]` tags, `branchdiff agent reply <id> --body "..."` lets you answer in-thread. Useful when the AI flagged unclear behaviour and you want the rationale on record.

The dismissal reason is the single most important habit to build. It is the part of the workflow that keeps the AI honest across multiple passes, and it leaves a paper trail you can point a teammate to if they ask "why is this line like that?" — which is often exactly the question they would have asked anyway.

### Step 3.5 — use the review-management features the same way you would on someone else's PR

The features that make somebody else's 40-file PR readable also pay off on your own branch when the diff is non-trivial:

- **Mark viewed** as you walk through your own files — eye icon or right-click → *Mark viewed*. The sidebar shows a `12 / 24 viewed` counter so you actually know how far you are. On a 30-file branch this is the difference between confident progress and the foggy "I think I covered everything" feeling.
- **Stale detection.** Any file you marked viewed but later changed gets flipped to *stale* with an amber dot in the sidebar — useful when a self-review pass spans across a few commits of fixes. Detection uses an FNV-1a hash on the file's diff signature, so it is content-based, not timestamp-based: a rebase that does not change the file does not invalidate your viewed marker.
- **Sidebar filters.** Nine filter chips — *Commented*, *Uncommented*, *Viewed*, *Unviewed*, *Stale*, *Collapsed*, *Expanded*, *Staged*, *Unstaged* — stack with the search box so you can narrow a long branch to the bits that need attention. *Filter → Stale* on the second pass is the killer combination.
- **Collapse all / Expand all** in the toolbar for a quick high-level pass before you dive in. Files with open comments are force-expanded automatically so the threads are never hidden behind a collapsed diff.
- **Staged / unstaged toggle** when you are reviewing your working tree before the first commit — flip between `git diff --staged` and `git diff` from the toolbar without re-running the command. File rows show inline status badges: **S** (staged), **U** (unstaged), so you can tell which lane each change is on at a glance.
- **Full-file view** with a **minimap on the right** marking added, removed, and modified regions, so you can scan a 1,000-line file at a glance and click straight to a change. Inline review comments stay anchored when you switch from hunk view to full-file view. Markdown files get a **Preview** toggle in v1.5.0 so docs render side-by-side instead of showing as raw markdown — useful when half your PR is a `README.md` rewrite.
- **Commit detail page** (also v1.5.0). Clicking any commit in the history sidebar opens a dedicated `/commit/:hash` page with the full SHA, parent links, file list with `+N / -N` counts, and the same diff view. The back button preserves your position so you can audit a single commit and come back to the branch comparison without losing where you were.

None of these need configuration — they are just there in the toolbar and sidebar. They turn self-review from "scroll through the whole diff again" into a structured pass with visible progress and a clear endpoint.

### Step 4 — focused passes for risky changes

The README documents eight pre-built workflows. They are short, scoped prompts that catch a different class of issue than a generalist pass. The four that matter most for self-review:

- **Security audit** — the AI looks only for injection (SQL, command, XSS, template, NoSQL, prompt), secret leaks, weak crypto (MD5/SHA1 for passwords, hand-rolled crypto, weak RNG), broken authz, deserialisation traps, path traversal, SSRF, and dependency risk. It deliberately skips style and naming, so a 200-line auth diff produces five precise comments instead of fifty.
- **Test coverage gaps** — for every new function, branch, or error path, the AI checks `**/*.test.ts` (or your equivalent test directory) and flags uncovered paths with a stub `it(...)` suggestion. Priority is error branches → new public API → edge cases → happy path. Private helpers exercised transitively are skipped.
- **Breaking-change review** — classifies every change as breaking or non-breaking and drafts an UPGRADE.md snippet for the breaking ones. Schema migrations without a rollback path are flagged as `[must-fix]`. Runs against any base ref pair, so it works on internal libraries the same way it works on public APIs.
- **Dependency review** — flags added or major-bumped packages with maintenance status (last publish, owner reputation), license compatibility, bundle-size delta, first-party alternatives, and known CVEs. `[must-fix]` for abandoned packages or critical CVEs; `[suggestion]` for large bundle additions or first-party alternatives that already exist in the repo.

Run one or more of these on top of the general review depending on what the diff touches. They are short prompts, scoped tightly, and the comment density is much lower than a generalist pass — exactly what you want when you only have ten minutes to do a focused sweep.

---

## A small, real example

A typical self-review session on a 12-file payments branch might produce something like this in `branchdiff agent list --status open`:

```
[must-fix]   src/billing/charge.ts:84      Refund path returns undefined when amount === 0
[must-fix]   src/api/webhooks.ts:42        Missing signature verification before parsing body
[suggestion] src/utils/format.ts:12        Replace toFixed(2) with Intl.NumberFormat for i18n
[suggestion] src/billing/charge.ts:140     No test covers partial-refund branch
[suggestion] src/billing/charge.ts:156     Extract retry logic — duplicated three times
[nit]        src/types.ts:7                Inconsistent enum casing
[question]   src/api/webhooks.ts:55        Should we 200 on duplicate webhook IDs or 409?
```

Two `[must-fix]`es, three improvements, one nit, one question. Twenty minutes of cleanup, and the PR you push is materially better than the one you would have pushed before lunch. The PR description can also pull from the AI's general comment, which often summarises the change set in two or three sentences ready to paste — that alone saves five minutes of "what's the right way to describe this PR?" agonising.

The dismissal trail matters too. If you dismiss the `[nit]` with reason "team style is mixed casing for legacy enums — see ADR-014", that reason is on record. The next person who reads `src/types.ts` and wonders why the casing is inconsistent has an answer one git-blame and one branchdiff session away.

---

## Where to be skeptical

A few honest caveats so the workflow does not get oversold:

- **AI is fallible.** It will sometimes flag a non-issue or miss a real bug. Treat tags as suggestions; the merge button is still yours. The single most common failure mode is confident-sounding wrong advice on async code — read those comments twice.
- **Local context only.** The AI sees the diff and the files in your repo. It does not see runtime behaviour, production logs, or an upstream service contract. For those, you still need a human reviewer or an integration test.
- **Token budget.** Larger diffs cost more, both in money and in attention. For a 200-file refactor, point the AI at the riskiest 10 files first rather than the whole thing — you can always run a second pass with a different focus.
- **Don't auto-resolve everything.** `/branchdiff-resolve` is convenient, but read the patches before committing. The AI will occasionally take a `[suggestion]` more literally than you intended, or "fix" something by deleting code instead of correcting it.
- **The AI is not a substitute for understanding your own change.** If you do not understand a chunk of code well enough to review it, the AI does not magically fill in that gap. It can flag bugs you would have caught; it cannot fix the deeper problem of shipping code you do not understand.

---

## Then ship the PR

When the local session is clean — open count at zero, the threads you cared about resolved, the dismissed ones with reasons attached — commit your fixes (squash them if you used `fixup!` commits), push the branch, and either open the PR on the platform or create it from the branchdiff toolbar (the *Open a Pull Request* button shows up automatically when no PR exists for the branch). The local comment history stays in `~/.branchdiff/` for your own reference; nothing of the AI pass needs to leak onto the PR unless you explicitly push it with the *Push to PR* button.

The reviewer who picks up the PR a few minutes later sees a tighter diff, fewer obvious bugs, a clearer description, and — if you wrote the PR body from the AI's general comment — a summary that already groups the change into reasonable chunks. Most of the comments they would have written, you have already written and resolved. Their attention can land on the parts that need a real second pair of eyes: the architectural decision, the unclear contract, the edge case that matters in production but not in tests.

---

## Quick start

```bash
npm install -g @encryptioner/branchdiff
# or:  pip install branchdiff
# or:  brew tap encryptioner/branchdiff https://github.com/encryptioner/branchdiff-releases && brew install branchdiff
branchdiff skill add                                # one-time, for Claude Code
branchdiff main feature/your-branch                 # opens local UI
# in Claude Code:  /branchdiff-review
# read, fix, resolve
# then push the branch and open the PR as usual
```

Self-review is the part of the workflow you can change without changing your team's process. Try it on the next branch you were about to push.

---

## Let's Connect

I'm always excited to hear about what you're building! If you found this guide helpful, have questions, or just want to share your code review and AI workflow setup:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
- **Support**: [SupportKori](https://www.supportkori.com/mirmursalinankur)

*branchdiff source and releases: [github.com/Encryptioner/branchdiff-releases](https://github.com/Encryptioner/branchdiff-releases).*
