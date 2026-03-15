# Claude Code Permissions Management: The Ninja Guide

> How to configure Claude Code permissions for maximum safety without being overwhelmed by prompts. Prevent out-of-scope changes, use custom providers like z.ai, configure model mappings, and become a Claude Code productivity ninja.

---

## The Problem: Permission Overwhelm vs. Safety DANGER

You've experienced the nightmare: `--dangerously-skip-permissions` seemed convenient, then Claude deleted your Chrome cache during Playwright testing. Without proper permission guards, Claude can:
- Delete files outside your project
- Install software you didn't approve
- Run scripts with destructive side effects
- Modify system configuration
- Access secrets and credentials

But the opposite extreme is equally painful: being prompted for **every single action** makes Claude unusable.

`★ Insight ─────────────────────────────────────`
**The sweet spot is broad allow-lists for safe operations + strict deny-lists for dangerous ones.** Claude Code's permission system is designed for this: you pre-approve the 95% of operations you do every day (test, lint, git status, file reads), while protecting the 5% that could cause harm (deletes outside project, system installs, secrets access).
`─────────────────────────────────────────────────`

---

## The Permission Hierarchy (What Overrides What)

Settings are evaluated in this order (highest to lowest priority):

| Priority | Source | Scope | Use Case |
|----------|--------|-------|----------|
| 1 | `managed-settings.json` | System | Enterprise IT policies (cannot be overridden) |
| 2 | CLI flags | Session | Temporary: `--allowedTools`, `--dangerously-skip-permissions` |
| 3 | `.claude/settings.local.json` | Project personal | Your personal overrides (gitignored) |
| 4 | `.claude/settings.json` | Project shared | Team settings (in git) |
| 5 | `~/.claude/settings.json` | User global | Your personal defaults |

**Key insight:** Project shared settings (4) override user global settings (5). So your project can enforce stricter rules than your personal defaults.

---

## The Three Rule Types: Deny → Ask → Allow

Rules are evaluated in THIS ORDER:

1. **Deny** - Always blocks, even if also in allow
2. **Ask** - Prompts for confirmation
3. **Allow** - Proceeds without prompts

**Deny always wins.** If a command matches both `allow` and `deny`, it's blocked.

### Pattern Syntax (Crucial Knowledge)

#### Bash Commands

| Pattern | Matches | Example |
|---------|---------|---------|
| `Bash` | ALL bash commands | Dangerous as allow |
| `Bash(npm run test)` | Exact match only | Safe |
| `Bash(npm run test *)` | Commands starting with "npm run test " | Safe-ish |
| `Bash(npm run *)` | All `npm run` commands | Good middle ground |
| `Bash(pnpm test)` | Exact match | Safe |
| `Bash(pnpm test:*)` | All test scripts starting with `pnpm test:` | Safe |
| `Bash(git status)` | Exact match | Safe |
| `Bash(git diff *)` | `git diff` with any args | Safe |
| `Bash(git push *)` | Any `git push` command | Ask or deny |
| `Bash(rm -rf *)` | Any command starting with `rm -rf ` | **DENY** |
| `Bash(curl *)` | Any curl command | **DENY** (code execution risk) |
| `Bash(* --version)` | Commands ending with `--version` | Safe |
| `Bash(* --help *)` | Commands with `--help` | Safe |

**Critical:** Space before `*` matters!
- `Bash(ls *)` matches `ls -la` but NOT `lsof`
- `Bash(ls*)` matches both (prefix match)

#### Read/Edit Rules (gitignore-style patterns)

| Pattern | Meaning | Example |
|---------|---------|---------|
| `./src/**` | Relative to current directory | Reads `<cwd>/src/**` |
| `/src/**` | Relative to settings file location | Reads `<settings-file-parent>/src/**` |
| `~/Documents/**` | Home directory | Reads `~/Documents/**` |
| `//tmp/**` | Absolute path from filesystem root | Reads `/tmp/**` |
| `*.env` | Any `.env` file in current directory | Block these |
| `./.env*` | Files starting with `.env` in current directory | Block these |
| `~/.ssh/**` | SSH keys directory | **DENY** |

#### WebFetch Rules

| Pattern | Meaning |
|---------|---------|
| `WebFetch(domain:github.com)` | Only that domain |
| `WebFetch(domain:*.anthropic.com)` | Subdomain wildcard |
| `WebFetch` | ALL web fetches (dangerous as allow) |

---

## The Ninja Configuration: Safe But Not Overwhelming

Here's a production-ready `.claude/settings.json` that prevents the Chrome cache disaster while remaining productive:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Read(src/**)",
      "Read(tests/**)",
      "Read(lib/**)",
      "Read(docs/**)",
      "Read(*.md)",
      "Read(*.json)",
      "Read(*.ts)",
      "Read(*.tsx)",
      "Read(*.js)",
      "Read(*.jsx)",

      "Bash(pnpm test *)",
      "Bash(pnpm test)",
      "Bash(pnpm test:*)",
      "Bash(pnpm test:e2e *)",
      "Bash(pnpm lint)",
      "Bash(pnpm type-check)",
      "Bash(pnpm build)",
      "Bash(pnpm validate)",
      "Bash(pnpm dev *)",

      "Bash(npm test *)",
      "Bash(npm run test *)",
      "Bash(npm run lint)",
      "Bash(npm run build)",

      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git branch *)",
      "Bash(git show *)",
      "Bash(git blame *)",
      "Bash(git add *)",
      "Bash(git reset *)",
      "Bash(git restore *)",
      "Bash(git checkout *)",

      "Bash(* --version)",
      "Bash(* --help *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(echo *)",
      "Bash(pwd)",
      "Bash(which *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(grep *)",
      "Bash(find *)",
      "Bash(Glob *)",
      "Bash(rg *)",

      "Glob",
      "Grep"
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(git pull *)",
      "Bash(git merge *)",
      "Bash(git rebase *)",
      "Bash(git commit *)",
      "Bash(npm install *)",
      "Bash(pnpm install *)",
      "Bash(npm publish)",
      "Bash(pnpm publish)",
      "Bash(npm rebuild)",
      "Bash(pnpm rebuild)",
      "Write(./package.json)",
      "Write(./pnpm-lock.yaml)",
      "Write(./package-lock.json)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(rmdir *)",
      "Bash(del *)",
      "Bash(delete *)",
      "Bash(shred *)",
      "Bash(dd *)",
      "Bash(mkfs *)",
      "Bash(fdisk *)",
      "Bash(format *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(nc *)",
      "Bash(netcat *)",
      "Bash(telnet *)",
      "Bash(ssh *)",
      "Bash(scp *)",
      "Bash(rsync *)",
      "Bash(chmod +x *)",
      "Bash(sudo *)",
      "Bash(doas *)",
      "Bash(su *)",
      "Bash(pip install *)",
      "Bash(pip3 install *)",
      "Bash(brew install *)",
      "Bash(brew upgrade *)",
      "Bash(apt install *)",
      "Bash(apt-get install *)",
      "Bash(yum install *)",
      "Bash(dnf install *)",
      "Bash(gem install *)",
      "Bash(go install *)",
      "Bash(cargo install *)",

      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./config/secrets/**)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Read(~/.config/gcloud/**)",
      "Read(~/Library/Application Support/Google/Chrome/**)",
      "Read(~/Library/Caches/Google/Chrome/**)",
      "Read(~/.cache/google-chrome/**)",
      "Read(//tmp/.X11-unix/**)",
      "Read(/var/run/**)",
      "Read(/etc/shadow)",
      "Read(/etc/passwd"),

      "Edit(./.env)",
      "Edit(./.env.*)",
      "Edit(./secrets/**)",
      "Edit(~/.ssh/**)",
      "Edit(~/.aws/**)",
      "Edit(~/.config/gcloud/**)",
      "Edit(~/Library/Application Support/Google/Chrome/**)",
      "Edit(~/Library/Caches/Google/Chrome/**)",
      "Edit(~/.cache/google-chrome/**)",
      "Edit(//tmp/.X11-unix/**)",
      "Edit(/var/run/**)",
      "Edit(/etc/**)",
      "Edit(~/Library/Application Support/**)",
      "Edit(~/Library/Caches/**)",
      "Edit(~/.config/**)"
    ],
    "additionalDirectories": []
  }
}
```

### What This Does

| Category | Protection |
|----------|------------|
| **Package operations** | Install/publish require confirmation |
| **Git destructive ops** | Push/pull/merge require confirmation |
| **System-level installs** | pip/npm/brew/apt installs BLOCKED |
| **File deletion** | rm/rmdir/dd/shred/format BLOCKED |
| **Network commands** | curl/wget/nc/ssh BLOCKED |
| **Privilege escalation** | sudo/su BLOCKED |
| **Secret files** | .env, secrets, SSH keys, AWS creds BLOCKED |
| **Browser cache** | Chrome cache directories BLOCKED |
| **System directories** | /etc, /var/run, X11 sockets BLOCKED |

### defaultMode: acceptEdits

This mode:
- Auto-approves all file edits and writes within allowed directories
- Still prompts for Bash commands
- Still prompts for tools not in allow-list

**Result:** You get permission-free coding (edits just work) while keeping guards around dangerous operations.

---

## Standard Permissions Allow-List (Copy-Paste Ready)

### For TypeScript/JavaScript Projects

```json
{
  "allow": [
    "Read(src/**)",
    "Read(tests/**)",
    "Read(lib/**)",
    "Read(*.{ts,tsx,js,jsx,json,md})",
    "Bash(pnpm test *)",
    "Bash(pnpm test:e2e *)",
    "Bash(pnpm lint)",
    "Bash(pnpm type-check)",
    "Bash(pnpm build)",
    "Bash(pnpm dev *)",
    "Bash(git status)",
    "Bash(git diff *)",
    "Bash(git log *)",
    "Bash(git add *)",
    "Bash(* --version)",
    "Bash(* --help *)",
    "Glob",
    "Grep"
  ]
}
```

### For Python Projects

```json
{
  "allow": [
    "Read(src/**)",
    "Read(tests/**)",
    "Read(*.{py,md,json,txt,toml})",
    "Bash(python -m pytest *)",
    "Bash(pytest *)",
    "Bash(python -m black *)",
    "Bash(python -m mypy *)",
    "Bash(python -m ruff check *)",
    "Bash(pip list)",
    "Bash(pip show *)",
    "Bash(git status)",
    "Bash(git diff *)",
    "Bash(* --version)",
    "Glob",
    "Grep"
  ],
  "ask": [
    "Bash(pip install *)",
    "Bash(pip uninstall *)",
    "Bash(python setup.py)"
  ],
  "deny": [
    "Bash(pip install *)",
    "Bash(python -m pip install * --user)",
    "Read(./.env)",
    "Read(./secrets/**)"
  ]
}
```

### For Rust Projects

```json
{
  "allow": [
    "Read(src/**)",
    "Read(tests/**)",
    "Read(*.{rs,toml,md})",
    "Bash(cargo test *)",
    "Bash(cargo build *)",
    "Bash(cargo check *)",
    "Bash(cargo clippy *)",
    "Bash(cargo fmt *)",
    "Bash(git status)",
    "Bash(git diff *)",
    "Glob",
    "Grep"
  ],
  "ask": [
    "Bash(cargo publish *)",
    "Bash(cargo install *)"
  ]
}
```

### For Go Projects

```json
{
  "allow": [
    "Read(**/*.go)",
    "Read(go.mod)",
    "Read(*.md)",
    "Bash(go test *)",
    "Bash(go build *)",
    "Bash(go run *)",
    "Bash(go fmt *)",
    "Bash(git status)",
    "Bash(go vet *)",
    "Glob",
    "Grep"
  ],
  "ask": [
    "Bash(go get *)",
    "Bash(go install *)"
  ]
}
```

### For Ruby Projects

```json
{
  "allow": [
    "Read(lib/**)",
    "Read(spec/**)",
    "Read(*.{rb,md,gemfile})",
    "Bash(bundle exec rspec *)",
    "Bash(bundle exec rubocop *)",
    "Bash(ruby *)",
    "Bash(git status)",
    "Glob",
    "Grep"
  ],
  "ask": [
    "Bash(bundle install *)",
    "Bash(gem install *)"
  ]
}
```

---

## Handling Bash Scripts: The Danger Zone

Bash scripts are the most dangerous permission surface because a single script can do anything.

### Rule 1: Never Allow Arbitrary Script Execution

```json
{
  "deny": [
    "Bash(sh *)",
    "Bash(bash *)",
    "Bash(zsh *)",
    "Bash(*.sh)",
    "Bash(*.bash)",
    "Bash(source *)",
    "Bash(. *)",
    "Bash(eval *)",
    "Bash(exec *)"
  ]
}
```

### Rule 2: If You Must Allow Scripts, Use Specific Paths

```json
{
  "allow": [
    "Bash(./scripts/format.sh)",
    "Bash(./scripts/test.sh)",
    "Bash(./scripts/build.sh)",
    "Bash(node ./scripts/*.js)"
  ],
  "deny": [
    "Bash(sh *)",
    "Bash(bash *)",
    "Bash(*.sh)"
  ]
}
```

### Rule 3: Use Hooks to Validate Script Content

Create a script at `.claude/hooks/validate-script.sh`:

```bash
#!/bin/bash
SCRIPT_PATH=$(cat | jq -r '.tool_input.command // empty' | awk '{print $NF}')

if [ -z "$SCRIPT_PATH" ]; then
  exit 0
fi

# Check if script is in allowed directory
if [[ "$SCRIPT_PATH" != ./scripts/* ]]; then
  echo "Only scripts in ./scripts/ are allowed" >&2
  exit 2
fi

# Check script content for dangerous patterns
if grep -qE '(rm -rf|dd if=|mkfs|fdisk|format|:>|>.*\/)' "$SCRIPT_PATH" 2>/dev/null; then
  echo "Script contains dangerous patterns" >&2
  exit 2
fi

exit 0
```

Add to settings.json:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash(sh *.sh|bash *.sh|*.sh)",
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/validate-script.sh"
      }]
    }]
  }
}
```

---

## Sandbox Mode: OS-Level Protection

Enable sandboxing for additional protection (macOS, Linux, WSL2 only):

```json
{
  "sandbox": {
    "enabled": true,
    "excludedCommands": ["playwright", "docker"],
    "allowUnsandboxedCommands": false,
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org", "*.anthropic.com"],
      "allowAllUnixSockets": false
    }
  }
}
```

**What sandbox does:**
- Restricts filesystem access to project directory
- Limits network access to allowed domains
- Blocks access to Unix sockets
- Requires explicit exclusion for tools that need broader access (like Playwright)

---

## Environment Variables: The Complete Reference

### Authentication & API

| Variable | Purpose | Example |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Standard API key | `sk-ant-xxx...` |
| `ANTHROPIC_AUTH_TOKEN` | Custom Authorization header | `Bearer token123` |
| `ANTHROPIC_CUSTOM_HEADERS` | Custom headers (newline-separated) | `X-Custom: value\nX-Another: value` |

### Provider Selection (Cloud Platforms)

| Variable | Purpose | Value |
|----------|---------|-------|
| `CLAUDE_CODE_USE_BEDROCK` | Use AWS Bedrock | `1` |
| `CLAUDE_CODE_USE_FOUNDRY` | Use Microsoft Foundry | `1` |
| `CLAUDE_CODE_USE_VERTEX` | Use Google Vertex AI | `1` |

### Model Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `ANTHROPIC_MODEL` | Override default model | `claude-opus-4-6` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Haiku class model | `claude-haiku-4-5-20250101` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Sonnet class model | `claude-sonnet-4-6` |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Opus class model | `claude-opus-4-6` |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Subagent model override | `claude-haiku-4-5-20250101` |

### Custom Providers (z.ai, GLM, etc.)

To use a custom provider like z.ai instead of Anthropic:

```bash
# Set the base URL to point to z.ai
export ANTHROPIC_BASE_URL="https://api.z.ai/v1"

# Set your z.ai API key
export ANTHROPIC_API_KEY="your-zai-api-key"

# Map model names to z.ai's models
export ANTHROPIC_MODEL="glm-5"
# or for specific model classes:
export ANTHROPIC_DEFAULT_OPUS_MODEL="glm-5-opus"
export ANTHROPIC_DEFAULT_SONNET_MODEL="glm-5-sonnet"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="glm-5-mini"
```

**How model mapping works:**
- When you request `opus`, Claude Code uses `ANTHROPIC_DEFAULT_OPUS_MODEL`
- When you request `sonnet`, it uses `ANTHROPIC_DEFAULT_SONNET_MODEL`
- When you request `haiku`, it uses `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- The provider (z.ai) must be API-compatible with Anthropic's API

**Project vs User Scope:**

| Location | Scope | Example |
|----------|-------|---------|
| `.claude/settings.json` env | Project only | Project-specific overrides |
| `~/.claude/settings.json` env | All projects | Your personal defaults |
| Shell environment (`.zshrc`) | All apps | Global, affects everything |

**Example: Project-specific override**

`.claude/settings.json`:
```json
{
  "env": {
    "ANTHROPIC_MODEL": "glm-5",
    "ANTHROPIC_BASE_URL": "https://api.z.ai/v1"
  }
}
```

**Example: User defaults**

`~/.claude/settings.json`:
```json
{
  "env": {
    "ANTHROPIC_MODEL": "claude-opus-4-6"
  }
}
```

Project settings (4) override user defaults (5), so the project gets `glm-5` while your other projects use `claude-opus-4-6`.

### Token Limits & Performance

| Variable | Purpose | Default | Max |
|----------|---------|---------|-----|
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output tokens | 32,000 | 64,000 |
| `MAX_THINKING_TOKENS` | Extended thinking budget | 31,999 | 31,999 |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | File read override | - | 64,000 |
| `MAX_MCP_OUTPUT_TOKENS` | MCP response limit | 25,000 | - |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Compaction trigger | ~95% | 1-100 |

### MCP Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `MCP_TIMEOUT` | Server startup timeout (ms) | 5000 |
| `MCP_TOOL_TIMEOUT` | Tool execution timeout (ms) | 30000 |

### Bash Tool Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| `BASH_DEFAULT_TIMEOUT_MS` | Default timeout | 120000 (2 min) |
| `BASH_MAX_OUTPUT_LENGTH` | Output truncation | - |
| `BASH_MAX_TIMEOUT_MS` | Max timeout model can set | - |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Reset to project dir | - |
| `CLAUDE_CODE_SHELL` | Override shell detection | `bash` |
| `CLAUDE_CODE_SHELL_PREFIX` | Wrap all commands | - |

### Proxy Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `HTTP_PROXY` | HTTP proxy | `http://proxy.example.com:8080` |
| `HTTPS_PROXY` | HTTPS proxy | `https://proxy.example.com:8080` |
| `NO_PROXY` | Bypass list | `localhost,127.0.0.1,.local` |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | Proxy DNS | `1` |

### Experimental Features

| Variable | Purpose | Value |
|----------|---------|-------|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams | `1` |
| `CLAUDE_CODE_SPAWN_BACKEND` | Agent spawn mode | `tmux`, `iterm2`, `in-process` |
| `ENABLE_TOOL_SEARCH` | MCP tool search | `auto`, `true`, `false` |
| `CLAUDE_CODE_EFFORT_LEVEL` | Effort level | `low`, `medium`, `high` |

### Disable Features

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Disable auto memory |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Disable background tasks |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | Disable quality surveys |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | Disable title updates |
| `DISABLE_AUTOUPDATER` | Disable auto updates |
| `DISABLE_BUG_COMMAND` | Disable `/bug` |
| `DISABLE_COST_WARNINGS` | Disable cost warnings |
| `DISABLE_ERROR_REPORTING` | Disable Sentry |
| `DISABLE_TELEMETRY` | Disable Statsig telemetry |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disable all non-essential |

---

## Permission Modes: Cycle with Shift+Tab

| Mode | How It Works | When to Use |
|------|---------------|-------------|
| `default` | Prompts on first use per session | Standard development |
| `acceptEdits` | Auto-approves file edits, prompts for bash | **Recommended for daily coding** |
| `plan` | Read-only exploration, no modifications | Planning mode |
| `bypassPermissions` | Skips ALL prompts | **NEVER in production** |

---

## File Scope Restrictions: Keep AI in Bounds

### Restrict to Project Directory Only

```json
{
  "permissions": {
    "additionalDirectories": []
  }
}
```

Empty `additionalDirectories` means Claude can ONLY access the project directory.

### Allow Specific Additional Directories

```json
{
  "permissions": {
    "additionalDirectories": [
      "../shared-libs",
      "../docs",
      "~/Templates"
    ]
  }
}
```

Claude can now access these, but your deny rules still apply (so it can't delete `~/Templates` if you have `Edit(~/Templates/**)` in deny).

### Block System Directories Explicitly

```json
{
  "permissions": {
    "deny": [
      "Read(~/Library/**)",
      "Read(~/Library/Caches/**)",
      "Read(~/Library/Application Support/**)",
      "Read(~/.cache/**)",
      "Read(~/Library/Preferences/**)",
      "Read(/tmp/**)",
      "Read(/var/**)",
      "Read(/etc/**)",
      "Edit(~/Library/**)",
      "Edit(~/.cache/**)",
      "Edit(/tmp/**)",
      "Edit(/var/**)",
      "Edit(/etc/**)"
    ]
  }
}
```

This prevents the Chrome cache deletion incident by explicitly blocking cache directories.

---

## Managed Settings: Enterprise Lockdown

For teams that want to enforce policies:

`/etc/claude-code/managed-settings.json` (Linux) or `/Library/Application Support/ClaudeCode/managed-settings.json` (macOS):

```json
{
  "disableBypassPermissionsMode": "disable",
  "allowManagedPermissionRulesOnly": true,
  "strictKnownMarketplaces": [
    {
      "source": "github",
      "repo": "your-company/approved-plugins"
    }
  ]
}
```

**What this does:**
- `disableBypassPermissionsMode: "disable"` - Users cannot use `--dangerously-skip-permissions`
- `allowManagedPermissionRulesOnly: true` - Only managed permission rules apply
- `strictKnownMarketplaces` - Only approved plugin marketplaces can be added

---

## The "Set and Forget" Ninja Setup

Create these files once, and you're protected across all projects:

### 1. User-Level Defaults

`~/.claude/settings.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "acceptEdits",
    "deny": [
      "Bash(rm -rf *)",
      "Bash(rmdir *)",
      "Bash(del *)",
      "Bash(delete *)",
      "Bash(shred *)",
      "Bash(dd *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(sudo *)",
      "Bash(su *)",
      "Bash(pip install *)",
      "Bash(brew install *)",
      "Bash(apt install *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Edit(./.env)",
      "Edit(./.env.*)",
      "Edit(~/Library/**)",
      "Edit(~/.cache/**)",
      "Edit(~/.config/**)",
      "Edit(/tmp/**)",
      "Edit(/var/**)"
    ]
  }
}
```

### 2. Add This to Your `.zshrc` (Optional Custom Provider)

```bash
# Uncomment to use z.ai instead of Anthropic
# export ANTHROPIC_BASE_URL="https://api.z.ai/v1"
# export ANTHROPIC_API_KEY="your-zai-api-key-here"
# export ANTHROPIC_MODEL="glm-5"
```

### 3. Project-Level Template (Copy to New Projects)

`.claude/settings.json.template`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Read(src/**)",
      "Read(tests/**)",
      "Read(*.{ts,tsx,js,jsx,json,md})",
      "Bash(pnpm test *)",
      "Bash(pnpm lint)",
      "Bash(pnpm type-check)",
      "Bash(pnpm build)",
      "Bash(pnpm validate)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(* --version)",
      "Bash(* --help *)",
      "Glob",
      "Grep"
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(pnpm install *)",
      "Write(./package.json)",
      "Write(./pnpm-lock.yaml)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Bash(sudo *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Edit(./.env)",
      "Edit(./.env.*)"
    ]
  },
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\" 2>/dev/null || true"
      }]
    }],
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "bash -c 'FILE=$(cat | jq -r \".tool_input.file_path // empty\"); [[ \"$FILE\" == *.env* ]] && echo \"Protected file\" >&2 && exit 2 || exit 0'"
      }]
    }]
  }
}
```

---

## Troubleshooting Common Permission Issues

### "I'm getting prompted for every file edit"

**Fix:** Set `"defaultMode": "acceptEdits"` in your settings.

### "Claude can't run tests"

**Fix:** Add test commands to allow-list:
```json
{
  "allow": ["Bash(pnpm test *)", "Bash(pnpm test:*)"]
}
```

### "Claude deleted files outside my project"

**Fix:** Add strict deny rules for system directories (see above template).

### "I need to approve every npm install"

**Fix:** Add `"Bash(pnpm install *)"` to ask-list instead of deny:
```json
{
  "ask": ["Bash(pnpm install *)"],
  "deny": ["Bash(pnpm install * --force)"]
}
```

### "Playwright MCP is deleting my browser cache"

**Fix:** Add browser cache directories to deny:
```json
{
  "deny": [
    "Read(~/Library/Caches/**)",
    "Read(~/.cache/**)",
    "Edit(~/Library/Caches/**)",
    "Edit(~/.cache/**)"
  ]
}
```

And/or use sandbox to restrict filesystem access.

---

## The Ninja Checklist

Before using `--dangerously-skip-permissions`, ask yourself:

- [ ] Have I configured `acceptEdits` mode?
- [ ] Have I added common commands to allow-list?
- [ ] Have I added dangerous commands to deny-list?
- [ ] Have I protected .env and secrets files?
- [ ] Have I protected system directories?
- [ ] Have I enabled sandbox mode?
- [ ] Have I added PreToolUse hooks for validation?
- [ ] Am I running this in an isolated environment (Docker, VM)?

**If you can answer YES to most of these, you don't need `--dangerously-skip-permissions`.**

---

## Sources

- [Configure permissions - Claude Code Docs](https://code.claude.com/docs/en/permissions)
- [Claude Code Settings - Claude Code Docs](https://code.claude.com/docs/en/settings)
- [Claude Code Permissions Guide (eesel.ai)](https://www.eesel.ai/blog/claude-code-permissions)
- [Claude Code Sandbox Configuration (code.claude.com)](https://code.claude.com/docs/en/sandboxing)
