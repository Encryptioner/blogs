Manage the Whole PR Lifecycle Without Leaving the Terminal - branchdiff's pr, sync, and session Commands

Your Claude Code skill just finished a review pass. It read the diff, posted three `[must-fix]` comments and two `[suggestion]`s via `branchdiff agent comment`, and decided — based on your own gating rules — that the PR is clean enough to ship. Now what? Before v1.6.1, "now what" meant tabbing over to GitHub, finding the PR, clicking Approve, then clicking Merge. The agent that could read a 40-file diff and reason about severity tags could not press the one button that mattered.

That gap is not cosmetic. It is the difference between "an AI that helps me review" and "an AI that can actually run a review-to-merge pipeline unattended." A script wired to a Claude Code skill, a CI job that wants to auto-merge dependency bumps once checks pass, an agent working through a queue of PRs overnight — none of that works if the last step requires a human with a mouse. The diff viewer, the comment API, the whole `branchdiff agent` surface was genuinely useful, but it stopped exactly at the point where the loop needed to close.

branchdiff v1.6.1 closes it. Every mutation the browser UI can perform — approve, merge, close, reopen, mark ready, push comments to the remote, pull them back, manage sessions — now has a CLI command behind it. This post walks through the four command groups that make that possible: `pr`, `sync`, `session`, and four new `agent` subcommands for cleaning up comments an agent created earlier.

---

## Why this gap mattered

Before 1.6.1, `branchdiff agent` covered reading and commenting: `agent diff`, `agent comment`, `agent resolve`, `agent dismiss`, `agent reply`. Enough to run a full review pass headlessly. But the moment a review pass concluded "this is good, approve it" or "this is done, merge it," the pipeline hit a wall — those actions lived only in the browser. Same for comment sync: pushing local threads to the remote PR, or pulling remote comments into a local session, meant opening the sync dialog and clicking buttons.

For a human using branchdiff interactively, that was a minor inconvenience — you were probably in the browser anyway. For a script or an agent driving the whole thing, it was a hard stop. You could not write a shell script that reviews, decides, and merges. You could not point `branchdiff auto` (or a custom loop) at a queue of PRs and have it act on its own verdict. Every full-lifecycle workflow needed a human in the loop at the exact step that mattered most.

---

## `branchdiff pr` — the PR lifecycle from the terminal

`branchdiff pr` ships 11 subcommands: `info`, `create`, `merge`, `approve`, `request-changes`, `close`, `reopen`, `draft`, `ready`, `edit`, `comment`. Each one talks HTTP to a running branchdiff instance — the same server your browser tab is pointed at — and platform (GitHub or Bitbucket) is auto-detected from the repo's remote, overridable with `--platform` if you need to force it.

A realistic sequence, picking up right where the review pass left off:

```bash
$ branchdiff pr info
Title:      Add retry logic to webhook delivery
State:      open
Draft:      false
Head SHA:   a3f9c21
Reviewers:  none requested
URL:        https://github.com/acme/api/pull/482

$ branchdiff pr approve --body "Reviewed via branchdiff agent — no open must-fix threads."
✓ Approved PR #482

$ branchdiff pr merge --method squash
✓ Merged PR #482 (squash)
```

`pr info` also takes `--json`, which matters more than it sounds like — it's the form a script or an AI agent actually parses to decide whether approving or merging is safe (is it a draft? are there unresolved reviewers? what's the head SHA, and does it match what was reviewed?).

```bash
$ branchdiff pr info --json
{"title":"Add retry logic to webhook delivery","state":"open","draft":false,"headSha":"a3f9c21","reviewers":[],"url":"https://github.com/acme/api/pull/482"}
```

The other eight subcommands cover the rest of what the browser's PR panel can do — `close`/`reopen`, `draft`/`ready` for flipping draft status, `request-changes` as the negative counterpart to `approve`, `create` for opening a brand-new PR from the CLI, `edit` for title/description changes, and `comment` for posting a general (non-inline) PR comment without going through `agent comment`.

---

## `branchdiff sync` — comment sync from the terminal

`branchdiff sync` has two subcommands: `push` (local comment threads → remote PR) and `pull` (remote PR comments → local session). Both report exactly what happened — created, updated, or skipped — so a script can tell whether the sync actually did anything.

```bash
$ branchdiff sync push
Created: 3
Updated: 0
Skipped: 1 (already synced)

$ branchdiff sync pull
Created: 2  (new comments from a human reviewer)
Updated: 0
Skipped: 5 (already local)
```

This is the CLI equivalent of the browser's Sync All button — before 1.6.1 that button was the only way to push an agent's freshly-posted comments to the actual PR, or to pull in what a human reviewer added on GitHub since your last local pass. Now both directions are one command, scriptable.

---

## `branchdiff session` — session management

Four subcommands: `current`, `archive`, `history`, `delete`.

```bash
$ branchdiff session current
Session: main...feature/webhook-retry
Port:    5391
PID:     42117
PR:      #482 (open)

$ branchdiff session archive
✓ Archived session for main...feature/webhook-retry

$ branchdiff session history
main...feature/webhook-retry     archived  12 threads   2026-07-28
main...feature/webhook-retry     archived   4 threads   2026-06-14
```

`session archive` is what `--new` does interactively when you start a fresh review pass over an old branch pair — it puts the old session's comment history somewhere queryable (`session history`, or `branchdiff review threads --session <id>`) instead of deleting it. `session delete` is the destructive version, for when you actually want a session gone.

---

## Agent thread/comment CRUD

Four more `agent` subcommands landed alongside `pr`/`sync`/`session`: `delete-thread`, `clear-threads`, `edit-comment`, `delete-comment`. Before this, an agent could create comments and resolve or dismiss them, but it could not clean up after itself — no way to delete a thread it posted in error, edit a comment's wording after the fact, or wipe a batch of stale threads before a fresh pass. Now it can fully manage the comments it created, not just add to them:

```bash
$ branchdiff agent edit-comment 91a2 --body "Missing signature verification before parsing body (updated: also applies to the retry path)"
✓ Updated comment 91a2

$ branchdiff agent delete-thread t-204
✓ Deleted thread t-204

$ branchdiff agent clear-threads --status dismissed
✓ Cleared 6 dismissed threads
```

---

## Multi-instance targeting

If you run branchdiff on more than one repo, or more than one ref-pair in the same repo, `pr`, `sync`, and `session` commands all need to know which running instance to talk to. Each accepts `--port` or `--pid` to target one directly; without either, they default to the current repo's running instance. If more than one matches, branchdiff lists them instead of guessing:

```bash
$ branchdiff pr approve
Multiple instances found for this repo:
  PORT 5391  PID 42117  main...feature/webhook-retry
  PORT 5392  PID 42210  main...feature/rate-limit-fix
Pass --port or --pid to choose one.
```

This matters most in exactly the multi-agent scenario this post is about — several branchdiff sessions running concurrently for different PRs, each driven by its own script instance, none of them stepping on each other by accident.

---

## `branchdiff agent guide` — one reference for the whole surface

`branchdiff agent guide` prints a comprehensive CLI reference for AI agents, grouped by workflow: comments, PR lifecycle, sync, sessions, review pipeline. An agent can `cat` this once at the start of a session and learn the entire command surface — every subcommand, its flags, and what it does — instead of guessing at flag names or trial-and-erroring its way through `--help` output for a dozen subcommands.

```bash
$ branchdiff agent guide | head -20
branchdiff Agent CLI Reference
===============================

## Comments
  agent comment --file <path> --line <n> --body "..."
  agent reply <thread-id> --body "..."
  agent resolve <thread-id> [--summary "..."] [--sync]
  ...

## PR Lifecycle
  pr info [--json] [--platform github|bitbucket]
  pr approve [--body "..."]
  pr merge [--method squash|merge|rebase]
  ...
```

Worth noting this is a different command from `review guide`, which covers only the review/resolve workflow (the skill-driven comment pass). `agent guide` is the full map — comments plus lifecycle plus sync plus sessions.

---

## End-to-end: an agent that reviews, syncs, approves, and merges

Here's the scenario this whole release is aimed at: a shell script wired to a Claude Code skill (or any AI CLI) that reviews a PR, decides it's good, and closes the loop entirely from the terminal.

```bash
# 1. Open the PR as a session and run the review skill
branchdiff https://github.com/acme/api/pull/482 --no-open
# in Claude Code: /branchdiff-review
# → posts inline comments via branchdiff agent comment, tags severity

# 2. Check what's still open
branchdiff agent list --status open
# [suggestion] src/webhook/retry.ts:88   Consider capping backoff at 5 attempts
# (no must-fix threads — script's gate gets to proceed)

# 3. Push any pending local comments to the remote PR
branchdiff sync push
# Created: 1  Updated: 0  Skipped: 0

# 4. Approve
branchdiff pr approve --body "Automated review: no must-fix findings."
# ✓ Approved PR #482

# 5. Merge
branchdiff pr merge --method squash
# ✓ Merged PR #482 (squash)
```

Nothing here happens by default. `branchdiff agent`, `pr`, and `sync` are commands the operator's script explicitly calls, in an order the operator wrote — an installed skill does not decide on its own to approve or merge anything. The severity gate in step 2 ("only proceed if no `[must-fix]` threads") is logic the script author owns. This is opt-in scripting power: branchdiff exposes the primitives, you decide the policy that chains them together, the same way `branchdiff auto --approve`/`--request-changes` (a built-in version of a similar gate) only touches the remote PR state when you additionally pass `--push`.

---

## Where to stay skeptical

**Auto-merge is a policy decision, not a branchdiff opinion.** These commands make full automation *possible*. Whether "no open must-fix threads" is actually a safe bar for auto-merging is a call your team makes, not something the tool enforces for you. A script that merges on a shallow gate will merge shallow reviews.

**Platform auto-detection can be wrong in edge cases.** If a repo has multiple remotes, or a remote URL that doesn't match GitHub/Bitbucket's usual patterns, `--platform` should be passed explicitly rather than trusted blind, especially in a script running unattended.

**Sync is not automatic conflict resolution.** `sync pull` brings in what changed remotely, but if a human reviewer commented on a line your local session already resolved differently, that's a real disagreement for a person to look at — not something `sync` reconciles for you.

**Multi-instance targeting depends on you being specific.** In a busy multi-repo, multi-agent setup, always pass `--port` or `--pid` in scripts rather than relying on the "only one instance" default — a second stray session on the same repo is enough to make a script exit on the ambiguity prompt instead of running unattended.

**These commands still require a running branchdiff instance.** `pr`, `sync`, and `session` all talk HTTP to a live server — they are not a standalone git/PR client. If the instance has exited, start one (`branchdiff <pr-url> --no-open`) before scripting against it.

---

## Quick start

Full install guide, changelog, and uninstall steps on the [branchdiff releases page](https://encryptioner.github.io/branchdiff-releases/).

```bash
npm install -g @encryptioner/branchdiff
# or: pip install branchdiff
# or: brew tap encryptioner/branchdiff https://github.com/encryptioner/branchdiff-releases \
#          && brew install branchdiff

branchdiff https://github.com/org/repo/pull/N --no-open   # open a PR session headlessly
branchdiff agent guide                                     # full CLI reference for agents
branchdiff agent list --status open                        # check what's still open
branchdiff sync push                                        # push local comments to the PR
branchdiff pr approve                                       # approve from the terminal
branchdiff pr merge --method squash                          # merge from the terminal
```

If your review workflow already lives in `branchdiff agent`, the missing half is one command group away. Try scripting the last step you were still doing by hand.

---

## Let's Connect

I am always excited to hear what you are building. If this guide helped, or if you have questions about building self-review habits into your workflow:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
- **Support**: [SupportKori](https://www.supportkori.com/mirmursalinankur)

*branchdiff releases, install guide, and changelog: [encryptioner.github.io/branchdiff-releases](https://encryptioner.github.io/branchdiff-releases/)*
