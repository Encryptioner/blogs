## Slide 1: Title Slide

# Many Accounts, Many Providers, One Harness
## Multi-account, multi-LLM, one shared context — from a single machine

- **Presented by:** Mir Mursalin Ankur
- **Lead Software Engineer @Nerddevs Ltd**

*Two CLI tools run this show: **Claude Code** first, then **OpenCode** as the open counterpart. One account and one provider are rarely enough anymore — subscription caps throttle you on busy days, and a single LLM vendor is one outage or price hike away from blocking you. The fix is not another browser tab — it is more identities and more providers, all running the same shared context, side by side.*

---

## Slide 2: The Moment One Account Stops Being Enough

# One Account, One Provider — Not Enough Anymore

- **Subscription limits throttle you.** Rate limits, 5-hour usage windows, and weekly caps bite on the days you code hardest.
- **Token and context caps.** One account's quota is one ceiling; when it hits the wall, work stalls until it resets.
- **One vendor is a single point of failure.** An outage, a price hike, a data-residency rule — and you're blocked. Multi-provider (Anthropic, GLM, Bedrock, local) keeps you moving.
- **The naive fix — log out, log in** — throws away session history, settings, and auth every time.

**The real shift:** stop treating "account" or "provider" as a login state. Treat each as a *directory*. Swap the directory, swap the identity — same harness, same shared context, without ever signing out.

---

## Slide 3: The Mental Model

# The Config Root IS the Identity

Claude Code stores everything — auth, settings, session history, projects, plugins — under one config root, normally `~/.claude`. Pointing `CLAUDE_CONFIG_DIR` at a different directory gives that invocation its **own complete, independent root**. Not an overlay on the default — a separate identity.

```bash
CLAUDE_CONFIG_DIR=~/.claude-ac1 claude   # account 1: own auth/session/settings
CLAUDE_CONFIG_DIR=~/.claude-ac2 claude   # account 2: own auth/session/settings
claude                                    # default ~/.claude, untouched by either
```

Same binary. Same machine. Same working directory. Three identities, decided at launch by one environment variable.

---

## Slide 4: What Travels With an Account, What Doesn't

# Isolation Is Total by Default

Each config dir starts blank. You opt **back in** to sharing by symlinking the stable, personal pieces — and leave the per-identity pieces real.

| Symlinked (shared across accounts) | Real / isolated (per account) |
|---|---|
| `CLAUDE.md` (global instructions) | `projects/` (chat history, session logs) |
| `agents/`, `commands/` (subagents, slash commands) | `settings.json`, `.credentials.json` |
| `docs/`, `skills/`, `rules/` | `plugins/` (marketplaces, installed plugins) |

**The principle:** share the *setup* (one set of rules everyone runs), isolate the *identity* (auth, history, plugin state never bleed between accounts).

---

## Slide 5: Provisioning a New Account

# Symlink the Setup, Isolate the Identity

```bash
# 1. create the new identity's root
mkdir ~/.claude-ac1

# 2. link the shared pieces back to the default setup
for s in CLAUDE.md agents commands docs skills rules; do
  ln -s "$HOME/.claude/$s" "$HOME/.claude-ac1/$s"
done
# 3. credentials/settings/projects/plugins stay real (absent) — created on first launch
```

**The con — and it bit me once:** shells differ. In **zsh**, `for s in $LIST` does *not* word-split a space-separated string (it makes one broken, space-named link); **bash** does. Iterate a literal list or a real array, and you are safe in both.

*Don't drop account-only files into a symlinked dir — they land in the shared target and leak to every account. Keep per-account extensions in an unlinked subfolder.*

---

## Slide 6: Where the Aliases Live

# Aliases Live Where Your Shell Lives

A launcher alias per account means you never type the env var. But aliases only load from your **interactive shell's rc file** — and which file that is depends on your shell.

| Shell | rc file | reload an open tab |
|---|---|---|
| **zsh** (macOS default) | `~/.zshrc` | `source ~/.zshrc` |
| **bash** (Linux; macOS legacy) | `~/.bashrc` — check `~/.bash_profile` too (login shells) | `source ~/.bashrc` |
| **fish** | `~/.config/fish/config.fish` | automatic |

```bash
# one block per account, in the rc file for YOUR shell
alias ac1claude='CLAUDE_CONFIG_DIR=~/.claude-ac1 claude'
alias ac1claude-d='CLAUDE_CONFIG_DIR=~/.claude-ac1 claude --dangerously-skip-permissions'
alias ac1claude-dr='CLAUDE_CONFIG_DIR=~/.claude-ac1 claude --dangerously-skip-permissions --resume'
```

**Find yours:** `echo $SHELL`, then edit the matching rc file. New terminal tabs pick aliases up automatically; already-open tabs need a `source` first.

---

## Slide 7: First Run and Verification

# Log In Once, Then Trust the Directory

```bash
ac1claude      # launch with the ac1 config dir
/login         # browser opens — sign in with that account
```

Repeat once per account. The auth token is saved **inside that config dir** and persists after — no repeated sign-ins.

**Verify the active identity mid-session:** `/status` shows which config dir and account are live. Essential when several tabs run different aliases.

**Where session logs land:** whichever `CLAUDE_CONFIG_DIR` was active at launch. Two accounts in the *same* project folder write to *different* history directories — same working dir, different past, by design.

---

## Slide 8: Wiring a Claude Code Account — Your Options

# Login, API Key, or Cloud — One Identity, Many Auth Paths

The credential lives **inside** the config dir, so each account authenticates differently:

| Method | How | Use when |
|---|---|---|
| **Subscription** (OAuth) | `claude /login` | your monthly plan |
| **API key** (PAYG) | `ANTHROPIC_API_KEY` in the dir's `settings.json` `env` | usage-based billing |
| **Bedrock** / **Vertex** | `CLAUDE_CODE_USE_BEDROCK=1` / `…_VERTEX=1` | AWS / GCP shop |
| **Anthropic-compatible LLM** (GLM…) | `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_DEFAULT_*_MODEL` | cheaper / residency / fallback |
| **`apiKeyHelper`** | script emitting a rotating key | short-lived / SSO keys |

**The `env` block is the lever** — auth travels with the identity, no secrets in your shell:

```jsonc
// ~/.claude-ac1/settings.json                   ~/.claude-ac2/settings.json
{ "env": { "ANTHROPIC_API_KEY": "sk-ant-…" } }   { "env": { "CLAUDE_CODE_USE_BEDROCK": "1" } }
```

**Precedence (high → low):** `managed` → CLI args → **local** `settings.local.json` (yours, gitignored) → **project** `settings.json` (team) → **user** global. Higher scope wins.

---

## Slide 9: Run Any Anthropic-Compatible LLM (Claude Code)

# Point the Harness at GLM

Claude Code speaks the Anthropic API — any provider that speaks it back drops in. These env vars redirect the harness, tiers remapped:

| Env var | Does | GLM (Z.ai) |
|---|---|---|
| `ANTHROPIC_BASE_URL` | provider's Anthropic-compatible endpoint | `https://api.z.ai/api/anthropic` |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer` (3rd-party) | your Z.ai / BigModel key |
| `ANTHROPIC_DEFAULT_{HAIKU,SONNET,OPUS}_MODEL` | tier → model | `glm-4.5-air` / `glm-5.1` / `glm-5.1` |

*Use `AUTH_TOKEN` (Bearer) for GLM — `API_KEY` (`x-api-key`) is direct-Anthropic only.*

---

## Slide 10: Switch Providers Without Editing

# The `X_` Prefix Toggle

Keep every provider's vars in global `settings.json`; prefix the inactive set with `X_` so Claude Code ignores them. Activate one per project in `.claude/settings.local.json` (gitignored, overrides global) — GLM here, Anthropic login next repo, Bedrock in a third.

```jsonc
// prefix = INERT (global) · drop X_ = LIVE (project-local, gitignored)
{ "env": { "X_ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic", "X_ANTHROPIC_AUTH_TOKEN": "…" } }
```

No re-login, no re-key. OpenCode does the same natively with a `provider` map → Slide 13.

---

## Slide 11: A Second Tool, Not a Second Vendor

# OpenCode Alongside Claude Code

Claude Code is one vendor — predictable, polished, capped on heavy days. **OpenCode** is the open-source counterpart: one UI over **75+ providers**, switchable mid-session.

| Tool | Access | The tradeoff |
|---|---|---|
| **Claude Code** | One vendor | Out-of-the-box quality; capped; locked-in |
| **OpenCode** | 75+ providers, switch mid-session | One UI, any vendor's pricing underneath; you wire the keys |
| **OpenRouter** | 300+ models, one key | Cross-vendor arbitrage; proxy hop |
| **Local** (Ollama / LM Studio) | Whatever your hardware holds | $0/token — but cost shifts to GPU/RAM, not removed |

Pick the tool for the constraint that binds: **data residency** → local · **flexibility** → OpenCode/OpenRouter · **out-of-the-box quality** → Claude Code.

---

## Slide 12: Same Identity Trick, for OpenCode

# `OPENCODE_CONFIG_DIR` — OpenCode's Multi-Account Lever

Claude has `CLAUDE_CONFIG_DIR`; OpenCode matches it — one env var for the **file**, one for the **dir**:

```bash
alias oc1='OPENCODE_CONFIG=~/.config/opencode-ac1/opencode.jsonc \
           OPENCODE_CONFIG_DIR=~/.config/opencode-ac1 opencode'
alias oc2='OPENCODE_CONFIG=~/.config/opencode-ac2/opencode.jsonc \
           OPENCODE_CONFIG_DIR=~/.config/opencode-ac2 opencode'
```

| Env var | Swaps |
|---|---|
| `OPENCODE_CONFIG` | the config **file** — model, provider, `instructions` |
| `OPENCODE_CONFIG_DIR` | the config **dir** — agents/commands/plugins (layered over global) |
| `{env:KEY}` | per-account API keys, set per alias |

**Difference from Claude:** OpenCode stores auth globally (`opencode auth login`), so these swap *config*, not *auth*. For per-account keys, reference `{env:AC1_…_API_KEY}` per alias — or move the whole global dir via `XDG_CONFIG_HOME` (auth included), at the cost of relocating every XDG-aware tool.

---

## Slide 13: One Config, Every Provider (OpenCode)

# Keep Zen *and* GLM — Switch by Flipping a Default

`provider` is a **map**, not a single choice — predefine Zen *and* GLM in one file, switch by changing `model` (or `/connect` / `/models`). No re-auth each time.

```jsonc
// opencode.json — Zen (built-in) + your GLM, one active
{
  "model": "zai/glm-4.6",                    // ← flip to "opencode/gpt-5.5" for Zen
  "provider": {
    "zai": {
      "npm": "@ai-sdk/openai-compatible",    // protocol adapter — built-ins (Zen) need only a key
      "options": { "baseURL": "https://open.bigmodel.cn/api/paas/v4/", "apiKey": "{env:ZAI_API_KEY}" },
      "models": { "glm-4.6": { "name": "GLM-4.6" } }
    }
    // "opencode" (Zen) is built-in — added by /connect, billed per request
  }
}
```

**Zen → GLM:** add the `zai` block, `export ZAI_API_KEY=…`, set `"model": "zai/glm-4.6"`.

---

## Slide 14: One Source of Truth Across Tools

# Share Context, Don't Duplicate It

You already wrote your standards once — in `CLAUDE.md` and `rules/`. OpenCode should read the same files, not a hand-maintained copy. Its config takes an `instructions` array of **paths and globs**, loaded at every session start:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "~/.claude/CLAUDE.md",
    "$HOME/.claude/rules/*.md"
  ]
}
```

Edit the rules once; both tools inherit. **Glob safety:** tools resolve paths themselves (no shell), so prefer `$HOME`-absolute globs over `~`+wildcard, which some loaders mishandle.

---

## Slide 15: What Actually Ports

# Skills Auto-Port. Agents Don't.

OpenCode reads Claude-compatible locations on purpose, so most of your setup crosses over **with zero config**:

| Claude source | How OpenCode gets it | Cost |
|---|---|---|
| `CLAUDE.md`, `rules/*.md` | `instructions[]` glob, always-on | ✅ parity |
| `skills/*/SKILL.md` | **auto-discovered** — `~/.claude/skills/` + `.claude/skills/`, loaded **on-demand** via the native `skill` tool | ✅ lazy, no tax |
| `agents/`, `commands/` | **not read** — OpenCode uses `~/.config/opencode/agents/`, `.opencode/agents/` | ❌ rewrite |

**Skills are the quiet win.** OpenCode walks `.claude/skills/*/SKILL.md` (project, up to the git root) and `~/.claude/skills/*/SKILL.md` (global), and exposes each through its `skill` tool — invoked lazily, exactly like Claude Code. Your whole skills folder works in both tools, unchanged. Keep each `SKILL.md`'s frontmatter valid (`name` matching its directory, a `description`), and nothing else is required.

**The only real porting work:** custom `agents/` and `commands/` live in different directories under a different schema. Recreate the few you depend on in OpenCode's `agents/` format — or skip them; the built-in agents cover most cases.

---

## Slide 16: Inside a Repo, Convention Wins

# Which Repo Rules Auto-Load — and Which Don't

Run inside a project and OpenCode auto-discovers a **fixed set of filenames**, traversing **up** from the working directory. Everything else is invisible without a glob.

| File | Auto-picked? | Note |
|---|---|---|
| Repo `AGENTS.md` (cwd + ancestors) | ✅ | **Primary.** First match wins |
| Repo `CLAUDE.md` | ⚠️ fallback only | Loaded **only if no `AGENTS.md`** — it shadows CLAUDE.md |
| Global `instructions[]` (your rules) | ✅ | every repo, always |
| Repo `.claude/rules/*.md`, `.cursor/rules` | ❌ | needs a per-repo glob |
| Nested subdir `AGENTS.md` | ❌ | only via `packages/*/AGENTS.md` glob, or when cwd is inside it |

**The gotcha:** `AGENTS.md` shadows repo `CLAUDE.md`. A repo with both will drop its CLAUDE.md from OpenCode's view. Repos carrying project rules in `.claude/rules/` or `.cursor/rules/` are blind to OpenCode until you add the glob.

---

## Slide 17: One Pattern, Three Scales

# A Directory, an Env Var, a Credential — At Every Scale

The same harness shape repeats. Change the directory, change the identity — whether that identity is an account or a provider:

| Scale | Env var | What each dir holds |
|---|---|---|
| **Multi Claude account** | `CLAUDE_CONFIG_DIR` | own `settings.json` (key/provider in `env`), `projects/`, `plugins/` |
| **Multi OpenCode account** | `OPENCODE_CONFIG` + `OPENCODE_CONFIG_DIR` | own `opencode.json`, `agents/`, `commands/` |
| **Multi provider (either tool)** | one dir, **a provider map** | Claude: `X_`-prefixed vars, one active per project · OpenCode: many `provider` entries, one `model` active |

**The unifying idea:** *identity is a directory; the credential lives inside it.* Run one account or twenty, one provider or seven — the pattern doesn't change, only the count does. That's what makes it scriptable: an alias is a directory pointer, a credential is a file inside, a provider is one line flipped.

*Both tools keep every option preconfigured and swap which is live — Claude via the `X_` prefix, OpenCode via the `provider` map. Different syntax, identical invariant.*

---

## Slide 18: Checklist

# Tune For Your Stack

**Claude Code:**
- [ ] One config dir per account (`CLAUDE_CONFIG_DIR`); symlink the shared six (`CLAUDE.md`, `agents`, `commands`, `docs`, `skills`, `rules`)
- [ ] Keep credentials/settings/projects/plugins **real** per account; aliases in your shell's rc file; `/login` once, verify with `/status`
- [ ] Auth per account in its `settings.json` `env` — API key, Bedrock, Vertex, or GLM endpoint; keep inactive providers `X_`-prefixed, activate per project in `settings.local.json`

**OpenCode:**
- [ ] `OPENCODE_CONFIG` / `OPENCODE_CONFIG_DIR` per account; point `instructions` at the same `CLAUDE.md` + `rules/*.md`
- [ ] Predefine providers in one `provider` map — Zen (`opencode/<model>`) *and* custom GLM; switch by flipping `model` or `/connect`; keys via `{env:…}`

**Cross-tool:**
- [ ] Skills auto-port (zero config); `agents/`/`commands/` need an OpenCode-format rewrite
- [ ] One source of truth, edited once, inherited everywhere
