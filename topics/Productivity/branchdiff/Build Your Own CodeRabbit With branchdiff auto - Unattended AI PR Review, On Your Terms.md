# Build Your Own CodeRabbit With branchdiff auto - Unattended AI PR Review, On Your Terms

You are three weeks into a CodeRabbit trial. It is fine. It leaves comments on every PR within a couple of minutes of opening, mostly reasonable, occasionally wrong in a way that is hard to argue with because you cannot see what prompt it used or what model produced the verdict. Someone on the team already muted it in Slack. The bill for next quarter is sitting in your inbox, scaled by seat count, and nobody can tell you which model is actually doing the reviewing or whether it changed last month.

Meanwhile a genuinely useful part of the pitch is real: PRs get looked at the moment they have something new to look at, without a human remembering to kick off a review. That part is worth keeping. The black box, the per-seat pricing, and the "trust us, it's calibrated correctly" auto-approve behavior are not.

`branchdiff auto` is the same outcome — reviews land on your open PRs automatically, day or night — built from parts you already control: your own AI CLI, your own machine, your own rules for what "approved" means. This post walks through what it actually does, mechanically, so "self-hosted CodeRabbit" is not a marketing line but something you can point at in a terminal.

---

## What `auto` actually watches

`branchdiff auto` lists your open pull requests across GitHub and Bitbucket, works out which ones have new commits since branchdiff last reviewed them, and runs your AI reviewer against just those. Not every open PR every time — only the ones that moved.

```bash
cd ~/work/api
branchdiff auto
```

```
Scanning 1 repo for open pull requests...

api  (github.com/org/api)
  #142  fix: refund path double-charges on partial amount     3 files   +48 -12   new commits since last review
  #139  feat: webhook retry queue                              9 files  +310 -40   never reviewed
  #137  chore: bump eslint to 9                                 1 file    +6  -4   already reviewed at HEAD, skipping

Select PRs to review (comma-separated, ranges like 1-2, "a" for all, "q" to quit): a
```

Two filters keep the candidate list relevant instead of running against everything in the repo: `--source <branch>` and `--dest <branch>` narrow by branch name, so a nightly job for release PRs only can target `--dest main` and ignore feature-branch noise. `--watch <minutes>` turns the one-shot scan into a loop — check every N minutes, review whatever changed, sleep, repeat — which is the difference between "a script I remember to run" and "a bot that is just running."

```bash
branchdiff auto --dest main --watch 30
```

---

## Bring your own model

This is the part a SaaS bot cannot offer you: `--tool claude|opencode|codex|gemini|cursor|llm` picks a known CLI to drive the review, and `--exec "<command>"` runs anything at all that reads a prompt on stdin and prints review JSON. If your team standardizes on Codex this quarter and switches to something else next quarter, that is a flag change, not a vendor renegotiation.

```bash
branchdiff auto --tool claude
branchdiff auto --tool gemini --watch 60
branchdiff auto --exec "my-internal-review-wrapper --model=finetuned-v3"
```

What the AI is told to do is equally yours to shape. The default is a context-plus-JSON pipe — branchdiff hands the diff over and parses structured comments back. `--skill` switches to driving an actual review skill instead, where the AI follows instructions directly and posts its own comments through `branchdiff agent` commands — the built-in skill needs nothing installed. `--skill-name <name>` points at a custom skill you already installed with `branchdiff skill add`, and `--additional-skill <name>` (repeatable) folds a specialized skill's guidance — a security-focused one, say — into the same pass. `--prompt "<text>"` adds one-off instructions on top of either mode.

| Flag | What it changes |
| --- | --- |
| `--tool claude` / `opencode` / `codex` / `gemini` / `cursor` / `llm` | Which known CLI drives the review |
| `--exec "<command>"` | Any command that reads a prompt on stdin, prints review JSON |
| `--skill` | Built-in skill, AI posts comments itself, nothing to install |
| `--skill-name <name>` | A custom skill you installed via `branchdiff skill add` |
| `--additional-skill <name>` | Layer a second skill's guidance onto the same pass (repeatable) |
| `--prompt "<text>"` | One-off extra instructions, either mode |

Since `--tool` just shells out to your normal CLI, the usual per-account tricks still apply — prefixing the command with an env var like `CLAUDE_CONFIG_DIR=~/.claude-work` when you run multiple accounts on one machine works exactly as it would running that CLI by hand.

---

## The control surface that makes it safe to leave running

The default posture is read-only and local. `auto` runs the review, writes comments into your local session database, and stops there — nothing reaches the actual PR unless you pass `--push`. You can let it run against every open PR in a repo all week and the worst case is a pile of local drafts you never look at.

The second guard is about *unattended* specifically. Run `auto` from a cron job or a CI shell with no TTY, and it refuses outright unless `--review` was explicitly passed to skip the interactive PR-selection prompt. There is no code path where a headless process silently starts reviewing PRs because nobody was watching — you have to opt in on purpose, every time.

```bash
# fails on purpose in a non-interactive shell:
branchdiff auto --dest main

# explicit opt-in required for unattended runs:
branchdiff auto --dest main --review --push
```

`--notify` closes the loop without you tailing a log file — a desktop toast on start, on finish, on a comment push, on failure, each one carrying a link straight to the PR or the local session view. If nothing pops up, `branchdiff doctor --notify` names your OS's notification backend and tells you what to check.

---

## The verdict gate: a rule the AI can't talk itself around

Here is the part that actually matters if you are going to trust this thing enough to let it approve or block work. A SaaS reviewer that decides "looks good, approving" based on its own confidence is a liability the moment it is wrong and nobody can see why. `auto`'s verdict is not the AI's opinion — it is a deterministic rule evaluated after the review pass, over the state of open threads.

`--approve [level]` and `--request-changes [level]` each take an optional strictness level, 1 through 5, default 1. Level 1 blocks approval on any open `[must-fix]` thread. Each step up widens what blocks it — level 2 also blocks on open `[suggestion]`s, up through level 5, which blocks on *any* open thread at all, tagged or not. And regardless of level: any thread a human started, tagged or not, blocks approval too — the tool never overrides a person's open concern to hit a clean number.

| Level | Blocks approval on |
| --- | --- |
| 1 (default) | Any open `[must-fix]`, or any human-started thread |
| 2 | Level 1 + open `[suggestion]` |
| 3 | Level 2 + open `[nit]` |
| 4 | Level 3 + open `[question]` |
| 5 | Any open thread at all, tagged or not |

```bash
branchdiff auto --dest main --review --approve 1 --request-changes 3 --push
```

Both flags always write a verdict comment explaining the decision, but *actually* setting GitHub's or Bitbucket's review state additionally requires `--push` — without it, the reasoning stays local commentary and nothing on the remote PR changes. If you pass both `--approve` and `--request-changes` with different levels, `auto` refuses rather than guessing which one you meant. Before deciding, it reconciles threads from any earlier pass against the new diff — resolving its own prior findings, but only ever suggesting (never resolving) a human's, since closing someone else's discussion for them is never the AI's call to make.

---

## It tells you what it's about to do before it does it

Every `auto` run prints a summary up front — two lists, `Using:` for every flag you actually passed, `Defaults in effect:` for everything you didn't — before a single PR is touched.

```
Using:
  --tool claude
  --dest main
  --approve 1
  --push
Defaults in effect:
  --watch: off (single pass)
  --max-files: none
  --worktree: off
  --resolve: off

Run "branchdiff guide" for the full flag reference.
```

That is a small thing on paper and a large thing at 2am — when a command has two dozen possible flags, this is the difference between trusting what's about to run and hoping you remembered every switch correctly.

---

## Skip the noise: size gating

Not every diff deserves an AI pass. `--max-files`, `--min-files`, `--max-lines`, `--min-lines` compose together, are inclusive, and measure the whole PR against its base — so a 900-file dependency bump gets routed to a human instead of eating a review pass, and a one-line typo fix doesn't either.

```bash
branchdiff auto --dest main --review --push --max-files 200 --max-lines 4000 --min-lines 5
```

Every skip names exactly which bound rejected it and by how much, and it costs nothing — the size comes from the PR listing your forge already provided, or one local `git diff` when it doesn't. A PR whose size can't be determined is reviewed rather than silently dropped.

---

## Running it unattended, for real

This is the actual "always-on bot" capability — the part that makes it fair to compare against a hosted service at all.

`--detach` forks `auto` into the background: the terminal returns immediately, output streams to a session-scoped log file, and the process survives closing your terminal or SSH session. It requires `--review`, for the same reason as before — a backgrounded process can never answer an interactive prompt.

```bash
branchdiff auto --dest main --review --push --tool claude --detach
```

```
branchdiff auto started in background
  session: a3f9c2
  log: ~/.branchdiff/auto-sessions/a3f9c2.log
```

`branchdiff auto list` shows every live detached session — id, repo(s), pid, mode, watch interval, log path (`--json` for scripts). `branchdiff auto attach <id>` read-only tails the log (Ctrl-C stops watching, never the session itself). `branchdiff auto stop <id>` sends it the same signal a foreground Ctrl-C would.

For real scheduling — "review PRs between 10am and 8pm on weekdays," not "review PRs whenever I remember to leave a terminal open" — `branchdiff auto cron add` writes actual crontab entries, tagged so branchdiff only ever touches its own lines:

```bash
branchdiff auto cron add \
  --dest main --tool claude --approve 1 --push \
  --start "0 10 * * 1-5" --stop "0 20 * * 1-5"

branchdiff auto cron list
```

```
id: weekday-daytime
  start: 0 10 * * 1-5   (detached --watch loop)
  stop:  0 20 * * 1-5
  repo:  ~/work/api
  status: active
```

The start entry runs a `--detach --watch` loop under the hood; the stop entry sends the stop signal, silently doing nothing if the loop already ended on its own. `branchdiff auto stop --cron-id <id>` stops a schedule's live session on demand. This is Unix-only and needs no daemon beyond cron itself.

---

## Isolation and cleanup

`--worktree` checks each PR out into its own `.worktrees/` directory instead of switching your actual branch — your working tree never moves while `auto` reviews something else. Combined with `--parallel <n>` (which requires `--worktree`), several selected PRs review concurrently instead of one at a time, each in its own isolated checkout.

```bash
branchdiff auto --dest main --review --push --worktree --parallel 3
```

`--resolve` adds an optional fix pass after the review pass: the AI reads whatever threads are still open in the session and fixes the code — local only, no commit, no push. You still inspect and commit the result yourself before it goes anywhere. And running `auto` twice in the same repo at once is refused by default rather than silently duplicating work; `--force-session` overrides that if you actually mean it.

---

## Where to stay skeptical

**A deterministic gate is only as good as your tags.** `--approve`/`--request-changes` trust `[must-fix]` and the rest of the tag taxonomy to be applied correctly by whatever `--tool` you chose. A model that consistently under-tags real bugs as `[nit]` will happily approve things it shouldn't — watch the first few weeks of output before raising the level or turning on `--push` unattended.

**`--detach` and `cron` mean it runs while you're not looking.** That is the whole point, but it also means a bad prompt or a misconfigured `--exec` command runs unattended too. Start with `--notify` on and check `branchdiff auto attach <id>` regularly until you trust the setup.

**Size gating is a proxy, not judgment.** A 400-line PR that touches billing logic is riskier than a 4,000-line PR that's entirely generated fixtures. `--max-lines` catches the obvious cases, not the subtle ones.

**`--resolve` still needs a human pass.** No commit, no push, by design — but read the diff it produces before you commit it. An AI that "fixes" a flagged issue by deleting the code around it is a known failure mode, not a hypothetical one.

**This does not replace a human reviewer.** It replaces the wait for one to notice the PR exists, and the ambient dread of not knowing what a black-box SaaS bot might do to your review state. The judgment calls — is this the right architecture, does this edge case matter in production — are still yours.

---

## Quick start

Full install guide, changelog, and uninstall steps on the [branchdiff releases page](https://encryptioner.github.io/branchdiff-releases/).

```bash
npm install -g @encryptioner/branchdiff
# or: pip install branchdiff
# or: brew tap encryptioner/branchdiff https://github.com/encryptioner/branchdiff-releases \
#          && brew install branchdiff

cd ~/work/your-repo
branchdiff auto --dest main                       # one-shot, interactive pick
branchdiff auto --dest main --review --push \
  --tool claude --approve 1 --detach              # unattended, backgrounded
branchdiff auto list                               # see what's running
branchdiff auto cron add --dest main --tool claude \
  --approve 1 --push --start "0 10 * * 1-5" --stop "0 20 * * 1-5"
```

You already pay for the trust problem a hosted bot creates. `branchdiff auto` moves the "reviews land automatically" outcome onto infrastructure you can read, a model you picked, and a verdict rule you can actually explain to your team.

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
