# AI Code Review Without Leaving Your Terminal — Practical branchdiff Workflows

**TL;DR:** Use `branchdiff` with Claude Code (`/branchdiff-review`, `/branchdiff-resolve`) or any AI to review code, post tagged comments, and auto-fix issues — all locally. This guide shows 5 real workflows that save hours every week.

---

## The Problem: AI Review + GitHub = Context Hell

Today's typical workflow:
1. Write a feature branch
2. Push to GitHub → PR opens
3. Copy-paste the diff into ChatGPT/Claude
4. Get comments back (security issues, test gaps, naming)
5. Manually transcribe them into GitHub comments
6. Implement fixes one-by-one
7. Update GitHub manually

This is inefficient. The AI doesn't see line numbers. You're copy-pasting. There's no session state. You lose context between review and fix.

**branchdiff solves this** by making the AI a first-class reviewer in your local workflow.

---

## Setup (2 minutes)

### Install branchdiff

```bash
npm install -g @encryptioner/branchdiff
# or
brew install branchdiff  # macOS/Linux
# or
pip install branchdiff   # any OS
```

### Install Claude Code skills (optional but recommended)

```bash
branchdiff skill add
# → creates .claude/skills/branchdiff-review/SKILL.md
# → creates .claude/skills/branchdiff-resolve/SKILL.md
```

Restart Claude Code. You now have two slash commands:
- `/branchdiff-review` — AI reads diff, posts comments
- `/branchdiff-resolve` — AI reads comments, fixes code

---

## Workflow 1: Security Audit (5 mins)

**Scenario:** You're about to merge a feature that touches auth. You want to catch injection, secrets, crypto mistakes before merging.

### Step 1: Start branchdiff
```bash
branchdiff main feature
```
Browser opens at `http://localhost:5391` with your diff.

### Step 2: Run security review

In Claude Code:
```
/branchdiff-review

# Claude reads the diff, posts comments tagged [must-fix]:
# - [must-fix] CWE-89 SQL injection on line 42: query concatenates user input
# - [must-fix] Hardcoded API key in .env.example line 15
# - [suggestion] Use bcrypt instead of MD5 for password hashing (line 108)
```

### Step 3: Inspect in browser

Click the file sidebar to jump to each comment. See the exact line, the context, the reasoning.

### Step 4: Fix or dismiss

```
/branchdiff-resolve

# Claude reads open comments and:
# - Fixes the SQL injection (uses parameterized query)
# - Removes hardcoded key
# - Dismisses the bcrypt comment with reason "We use argon2, which is stronger"
```

### Result
- ✅ 3 security issues fixed
- ✅ 1 decision documented (why bcrypt wasn't needed)
- ✅ Zero manual transcription
- ✅ Comments in browser for team reference
- ✅ Push to GitHub with one click

**Time saved vs. manual review:** 30 minutes → 5 minutes

---

## Workflow 2: Test Coverage Gaps (8 mins)

**Scenario:** You've added 3 new functions and refactored error handling. You want to find untested code paths.

### Step 1: Start branchdiff
```bash
branchdiff main feature
```

### Step 2: Run test-coverage review

In Claude Code:
```
/branchdiff-review

# Claude reads the diff and identifies uncovered paths:
# - [suggestion] Line 42-48: new function `validatePayment()` has no test
#   Suggested test: describe('validatePayment', () => { it('rejects expired cards') })
# - [suggestion] Line 95: error branch "STRIPE_API_DOWN" is uncovered
#   Suggested test: it('retries on API timeout', async () => { ... })
# - [question] Line 156: is `getCache()` called in tests? (don't see imports)
```

### Step 3: Inspect and triage

Look at each test suggestion in the browser. Which ones are critical for release?

### Step 4: Add tests or dismiss

```
/branchdiff-resolve

# Claude can:
# - Create new test files for [suggestion] comments
# - Add test cases to existing suites
# - Mark [nit] test suggestions as dismissed
```

### Result
- ✅ Found 3 untested paths
- ✅ Generated 5 test cases (you review + merge)
- ✅ 1 architectural question documented
- ✅ Coverage improved before shipping

**Coverage improvement:** +12% on critical paths

---

## Workflow 3: Breaking Change Detection (6 mins)

**Scenario:** You've refactored the API. You want to flag breaking changes and document migration steps.

### Step 1: Start branchdiff
```bash
branchdiff v1.0.0 feature
```

### Step 2: Run breaking-change review

In Claude Code:
```
/branchdiff-review

# Claude classifies every change:
# - [must-fix] BREAKING: Removed export `getUser()` (line 15)
#   Impact: all callers must use `getFullUser()` instead
#   Migration: find . -name "*.ts" -exec grep -l "getUser(" {} \;
#
# - [must-fix] BREAKING: Changed `POST /api/users` to require `role` field
#   Migration: update all clients to send `role: "user"` by default
#
# - [suggestion] Added `POST /api/users/bulk` (non-breaking, backward-compat)
```

### Step 3: Create UPGRADE.md

Ask Claude to draft an `UPGRADE.md` with before/after examples:

```markdown
## v2.0.0 Migration Guide

### Removed: getUser()
**Before:** `const user = await getUser(id)`
**After:** `const user = await getFullUser(id)`

### New required field: role
All POST /api/users calls must include role:
**Before:** `POST /api/users { name: "Alice" }`
**After:** `POST /api/users { name: "Alice", role: "user" }`
```

### Result
- ✅ All breaking changes identified
- ✅ Migration guide auto-generated
- ✅ Rollback strategy documented
- ✅ No surprises for users

---

## Workflow 4: Multi-Reviewer AI (9 mins)

**Scenario:** You want multiple AI perspectives on the same diff (e.g., security + performance + testing).

### Step 1: Start branchdiff
```bash
branchdiff main feature
```

### Step 2: Run first review (security focus)

In Claude Code:
```
/branchdiff-review

# Claude posts security-focused comments
```

### Step 3: Run second review (test coverage focus)

Open a new Claude session (or new window):
```
/branchdiff-review

# Claude posts test-coverage comments in the same session
```

Comments stack in branchdiff. Both sets visible in the browser.

### Step 4: Multi-resolve

```
/branchdiff-resolve
```

Claude reads all open comments (security + test) and prioritizes fixes.

### Result
- ✅ Multiple perspectives on one diff
- ✅ No duplicate work
- ✅ Comprehensive review in one session
- ✅ All fixes tracked in one place

---

## Workflow 5: Documentation + Code Tour (12 mins)

**Scenario:** You're shipping a big refactor. You want to document HOW the auth flow works so the team understands it.

### Step 1: Start branchdiff
```bash
branchdiff main feature
```

### Step 2: Create a code tour with AI

In Claude Code:
```
branchdiff agent tour-start --topic "How does the new auth flow work?" --body "Full auth request→validate→session lifecycle" --json

# Claude then:
branchdiff agent tour-step --tour <id> --file src/auth.ts --line 10 \
  --body "Entry point: every request hits this middleware first"
  
branchdiff agent tour-step --tour <id> --file src/auth.ts --line 42 \
  --body "Token is validated against the session store here. Key insight: we cache tokens in Redis for 5 min to avoid DB hits"

branchdiff agent tour-step --tour <id> --file src/session.ts --line 8 \
  --body "Session schema with TTL. Note the expiry field — this auto-deletes stale sessions"

# ... more steps ...

branchdiff agent tour-done --tour <id>
```

### Step 3: Share the tour

Team members run:
```bash
branchdiff main feature
# → click compass icon → select "How does the new auth flow work?" → step through
```

Each step highlights the exact lines, explains the "why", links to related code.

### Result
- ✅ Onboarding reduced from 1 hour call → 10 min self-guided tour
- ✅ Architecture documented in code
- ✅ New team members self-serve
- ✅ Fewer questions in code review

---

## Workflow 6: GitHub PR Sync (1 minute)

After any review (security, tests, breaking changes), push comments to GitHub:

```bash
# In branchdiff browser:
# 1. Click the PR number button (#42)
# 2. Click "Push to PR"
```

All your local comments (AI-generated or manual) sync to the GitHub PR as review comments. Your team reviews on GitHub. You can also pull GitHub comments back into branchdiff if the team added feedback.

---

## Quick Reference: AI Review Commands

### Review the current diff
```bash
/branchdiff-review
```

### Review a specific branch comparison (no session needed)
```bash
/branchdiff-review main feature
```

### Review with a focus (security, tests, performance)
```
/branchdiff-review

# Claude reads the prompt in context and focuses on security
```

### Resolve open comments
```bash
/branchdiff-resolve
```

### Resolve a single comment
```bash
/branchdiff-resolve abc123de
```

### One-shot (no session)
```bash
branchdiff review context | claude -p "review for SQL injection"
```

---

## Pro Tips

### Tip 1: Always use severity tags
When posting comments (manual or AI), use tags so the team knows priority:
- `[must-fix]` — bug, security, data loss
- `[suggestion]` — improvement, nice-to-have
- `[nit]` — style, naming, cosmetic
- `[question]` — unclear, needs clarification

### Tip 2: Keep branchdiff running
The AI hits `http://localhost:5391` to post comments. Kill it, and the skill fails. Keep a terminal tab open.

### Tip 3: Archive and restart
After merging, archive your session:
```bash
branchdiff main feature --new
```

Or click "New review" in the browser. This archives old comments and starts fresh for the next iteration.

### Tip 4: Multiple repos at once
Each repo gets its own port (5391, 5392, 5393...):
```bash
branchdiff main feature  # repo 1 on 5391
# in another terminal:
branchdiff main feat     # repo 2 on 5392
```

### Tip 5: Export and import sessions
Backup your review sessions for later reference:
```bash
branchdiff export --all --output my-review.json
branchdiff import my-review.json
```

Useful for archiving old reviews or sharing with a teammate.

---

## Productivity Gains

| Task | Old Way | branchdiff | Time Saved |
|------|---------|-----------|------------|
| Security audit | Manual + ChatGPT | `/branchdiff-review` | 25 mins |
| Test coverage | Read code + write tests | `/branchdiff-review` + Claude | 20 mins |
| Breaking changes | Doc + manual migrate | Generated UPGRADE.md | 15 mins |
| Code tour | 30 min zoom call | `agent tour-start` | 20 mins |
| Sync to PR | Copy-paste from notes | "Push to PR" button | 2 mins |

**Weekly savings:** ~80 minutes

If you do 2 code reviews per week, that's **7 hours/month** back.

---

## Integration with Claude Code

### Why Claude Code?

branchdiff skills are built for Claude Code's workflow:
- You're already in Claude for implementation
- No context switching (stay in one editor)
- Slash commands are natural (same UX as `/fix`, `/ask`)
- Session state persists (comments stay visible)

### Example workflow
```
# Implement the feature
/implement

# Review the diff with AI
/branchdiff-review

# Inspect comments in browser
# Decide what to fix

# Auto-fix
/branchdiff-resolve

# Check the code
/verify

# Ship it
/ship
```

All in one app. No tab juggling.

---

## For Teams

### Push comments to GitHub
After running `/branchdiff-review`:
```bash
# In browser: PR button → Push to PR
```

Comments appear on the GitHub PR. Team reviews async. You import GitHub feedback back into branchdiff if needed.

### Share tours
Generate a tour of your new architecture:
```bash
branchdiff agent tour-start --topic "Microservices refactor"
```

Team runs `branchdiff main feature` and clicks the compass icon to view it. Self-serve docs.

### Async review loop
1. You run `/branchdiff-review` locally
2. Push comments to GitHub
3. Team reviews on GitHub (or imports to branchdiff)
4. Feedback comes back (on GitHub or via pull)
5. You run `/branchdiff-resolve` locally
6. Commit fixes, push

---

## Beyond Claude Code: Any AI Tool

Not using Claude Code? You can still use branchdiff with any AI:

```bash
branchdiff review context | claude -p "review for security"
branchdiff review context --refs "main feature" | gpt-4 -p "find test gaps"
branchdiff review context | ollama run mistral -p "check performance"
```

Or just copy-paste the diff and paste the AI's JSON response back:
```bash
branchdiff review import response.json
```

---

## Troubleshooting

**Q: "GitHub CLI is not installed"**
A: Install from https://cli.github.com, then `gh auth login`

**Q: "Port already in use"**
A: Use `branchdiff --port 7000`

**Q: "Comments not showing up after /branchdiff-review"**
A: Keep the branchdiff window open. The skill posts to `http://localhost:5391`. If you closed it, start a new instance: `branchdiff main feature`

**Q: "How do I use this with Bitbucket?"**
A: Set `BITBUCKET_USERNAME` and `BITBUCKET_API_TOKEN`, then `branchdiff https://bitbucket.org/workspace/repo/pull-requests/123`

**Q: "Can I use this offline?"**
A: Yes. AI review works with local LLMs (Ollama, llama.cpp). GitHub/Bitbucket sync requires internet.

---

## What's Next

- **Local LLM support** — Ollama integration for fully offline review
- **Team workflows** — shared SQLite sessions for pair-reviewing
- **IDE integrations** — VS Code extension for inline reviews
- **More AI workflows** — API contract testing, database migration review, documentation generation

---

## Get Started

```bash
npm install -g @encryptioner/branchdiff
branchdiff main feat
```

Add skills to Claude Code:
```bash
branchdiff skill add
```

Run a review:
```
/branchdiff-review
```

See the [complete guideline](https://encryptioner.github.io/branchdiff-releases/guideline.html) for all workflows (security audit, test coverage, breaking changes, dependency review, code tours).

---

## Questions?

- **In-app guide:** `branchdiff guide`
- **GitHub repo:** https://github.com/Encryptioner/branchdiff-releases
- **Twitter:** [@AnkurMursalin](https://twitter.com/AnkurMursalin)

If branchdiff saves you time, consider supporting its development:

[![SupportKori](https://img.shields.io/badge/SupportKori-☕-FFDD00?style=flat-square)](https://www.supportkori.com/mirmursalinankur)
