# Deep Dive: branchdiff Workflows and Team Integration — Advanced Patterns and Real-World Examples

The previous guide covered what branchdiff is. This one covers what you can actually do with it. Real workflows. Real scenarios. Real time savings.

---

## Workflow 1: Security Audit Before Merge

**Scenario:** Your team has a rule: every PR touching auth, payments, or cryptography needs a security audit before merge.

**Old way (GitHub + manual review):**
1. Dev opens PR on GitHub
2. Senior engineer copies diff into ChatGPT
3. Waits for response
4. Reads through comments, manually writes GitHub comments
5. Dev fixes issues one-by-one
6. Senior engineer re-checks manually
7. **Total time: 40 minutes**

**New way (branchdiff + Claude Code):**

```bash
branchdiff main feature
```

```
/branchdiff-review

Claude posts:
[must-fix] CWE-89: SQL injection on line 42 — user_id concatenated into query
[must-fix] Line 156: API key hardcoded in .env.example
[must-fix] Line 203: MD5 hashing passwords — use bcrypt or argon2
[suggestion] Line 89: XSS risk — sanitize user input before rendering
```

Takes 3 minutes. You inspect comments in the browser. You agree with 3, dismiss the XSS one (it's user-generated, not rendered).

```
/branchdiff-resolve

Claude:
- Fixes SQL injection with parameterized query
- Removes hardcoded key
- Replaces MD5 with bcrypt
- Closes [suggestion] with reason: "Rendering is already sanitized, user input is admin-only"
```

Takes 2 minutes. You review the fixes. Commit and push.

**Total time: 7 minutes. 33 minutes saved per PR.**

**For a team doing 1-2 security audits per week: 4-8 hours saved weekly.**

---

## Workflow 2: Multi-Timezone Async Reviews

**Setup:** Team across London (GMT), Singapore (GMT+8), California (GMT-8). Reviews can't be real-time.

**Goal:** Get full code review without waiting for synchronous handoff.

**Day 1, 2pm London (Backend Review):**

```bash
branchdiff main feature
```

Backend engineer marks files:
- auth.ts — reviewed ✓
- database.ts — reviewed ✓
- api.ts — reviewed ✓

Posts architecture comments:
- "Why did you change the session schema? Impacts compatibility"
- "Database migration is not backward-compatible — rollback plan?"
- "Good async/await cleanup here"

Exports session:
```bash
branchdiff export backend-review.json
```

Sends to team Slack.

**Day 2, 9am Singapore (Frontend Review):**

Frontend engineer imports:
```bash
branchdiff import backend-review.json
```

Sees backend's marked files and comments. Adds to them:
- Views backend's comments on database.ts
- Responds: "Good catch on migration — we have a rollback script in deploy/"
- Reviews UI components
- Marks design components ✓
- Posts: "UI looks good. One: are we handling loading state in the form submit?"

Exports updated session:
```bash
branchdiff export full-review.json
```

Sends to Slack.

**Day 3, 9am California (Dev response):**

Dev imports:
```bash
branchdiff import full-review.json
```

Sees all comments with full context. No back-and-forth about what you meant. Clear feedback.

Uses Claude to fix:
```
/branchdiff-resolve

Claude reads 12 open comments and:
- Fixes the form loading state
- Clarifies migration rollback strategy in code comment
- Fixes two style issues from backend review
- Marks architectural concerns for team discussion
```

Takes 10 minutes. Dev manually handles the architectural concern (needs design decision).

Commits, pushes, done.

**Total time across team: 45 minutes for full review, no context loss, no timezone waiting.**

Compare to: async GitHub comments taking 3-4 days, context scattered, back-and-forth for clarifications.

---

## Workflow 3: Breaking Change Detection and Migration Guide

**Scenario:** You're shipping a major API refactor. You want to flag breaking changes, generate a migration guide, and help users upgrade.

```bash
branchdiff v1.0.0 feature
```

```
/branchdiff-review

Claude reads the diff and identifies:

[must-fix] BREAKING: Removed `getUser()` export
  Impact: All callers must use `getFullUser()` instead
  
[must-fix] BREAKING: POST /api/users now requires `role` field
  Impact: All clients sending to this endpoint must include role: "user"
  
[must-fix] BREAKING: Changed session token format
  Explanation: Moved from JWT to opaque tokens
  Migration: Session validation now requires Redis lookup
  
[suggestion] Added POST /api/users/bulk — backward compatible
[suggestion] Deprecated GET /api/users/:id — will remove in 2.0
```

Takes 4 minutes.

```
/branchdiff-resolve

Claude:
- Generates UPGRADE.md with before/after examples
- Creates a migration script for the token format
- Documents rollout strategy
```

You review, push. Users get a clear upgrade guide.

**vs manual approach:** 60 minutes to write changelog + migration guide + examples. **50 minutes saved.**

---

## Workflow 4: Test Coverage Gaps

**Scenario:** You've added 5 new functions and refactored error handling. You want to find untested code paths.

```bash
branchdiff main feature
```

```
/branchdiff-review

Claude identifies:
[suggestion] Line 42-48: Function `validatePayment()` has no test
  Suggested test: it('rejects expired cards')
  Suggested test: it('rejects invalid amounts')
  
[suggestion] Line 95: Error branch "STRIPE_API_DOWN" is uncovered
  Suggested test: it('retries on API timeout', async () => {...})
  
[question] Line 156: Is `getCache()` called in tests? (don't see imports)
```

Takes 3 minutes.

```
/branchdiff-resolve

Claude:
- Creates test file with coverage for validatePayment()
- Adds error case for STRIPE_API_DOWN
- Adds investigation comment on getCache()
```

Takes 2 minutes. You review tests, add any edge cases Claude missed.

**Result:** Coverage increased from 72% to 85% before shipping. Bugs caught in testing, not production.

**Time saved:** 15 minutes (manual code reading + test writing).

---

## Workflow 5: Code Tours for Onboarding

**Scenario:** New developer is joining. You want them to understand the auth flow without a 30-minute Zoom call.

**Traditional approach:**
- 30-minute walkthrough with senior dev
- Dev takes notes (probably incomplete)
- Dev forgets half of it
- Dev writes in Slack: "How does refresh tokens work again?"
- Senior dev context-switches to answer

**branchdiff approach:**

Create a tour of auth flow:

```bash
branchdiff main main  # or any reference branch
branchdiff agent tour-start \
  --topic "Authentication Flow" \
  --body "Request validation → token generation → session persistence"
```

Add steps:

```bash
branchdiff agent tour-step \
  --tour <tour-id> \
  --file src/auth.ts \
  --line 10 \
  --body "Entry point: request middleware validates every request. Check auth header."

branchdiff agent tour-step \
  --tour <tour-id> \
  --file src/auth.ts \
  --line 42 \
  --body "Token validation against session store. We cache in Redis for 5min to avoid DB hits."

branchdiff agent tour-step \
  --tour <tour-id> \
  --file src/session.ts \
  --line 8 \
  --body "Session schema with TTL. expiry field auto-deletes stale sessions."

branchdiff agent tour-step \
  --tour <tour-id> \
  --file src/refresh.ts \
  --line 15 \
  --body "Refresh token rotation: old token invalidated, new one issued. Prevents token replay."

branchdiff agent tour-done --tour <tour-id>
```

New dev runs:
```bash
branchdiff main main
# Clicks compass icon → select "Authentication Flow"
```

Steps through guide. Sees exact lines. Understands flow. **10 minutes.**

**Time saved:** 20 minutes (30-min call reduced to 10-min self-guided review).

---

## Workflow 6: Review + Resolve Collaboration

**Scenario:** Two senior reviewers. One focused on security, one on performance. Same PR. No duplicate work.

```bash
branchdiff main feature
```

**Reviewer 1 (Security focus):**
```
/branchdiff-review

Claude posts security-focused comments:
[must-fix] Line 23: Input not validated before DB insert
[must-fix] Line 156: Hardcoded API key
[suggestion] Use timing-safe comparison for secrets
```

**Reviewer 2 (different Claude session):**
```
/branchdiff-review

Claude posts performance comments:
[suggestion] Line 42: Query happens in loop — N+1 problem
[suggestion] Line 89: Consider memoizing this function
[suggestion] Add database index on user_id
```

Comments stack in branchdiff. Both reviewers' feedback visible.

```
/branchdiff-resolve

Claude reads all comments (security + performance), prioritizes:
- Fixes the input validation (must-fix)
- Fixes the hardcoded key (must-fix)
- Optimizes the N+1 query
- Dismisses memoization comment (function is called rarely)
- Adds TODO: "Database index on user_id — for future optimization"
```

**Result:** Multiple perspectives, zero duplicate comments, one resolve pass.

---

## Workflow 7: Data Ownership and Async Collaboration

**Scenario:** Your team values data privacy. Reviews shouldn't live on GitHub's servers.

branchdiff keeps everything local:

```bash
# Your review sessions are in ~/.branchdiff/
ls ~/.branchdiff/
# → sessions.db (SQLite with all your reviews)
```

Export for backup:
```bash
branchdiff export --all --output reviews-backup.json
```

Import on another machine:
```bash
branchdiff import reviews-backup.json
```

Share with teammate:
```bash
branchdiff export --session <session-id> --output team-review.json
# Email to teammate
```

Teammate imports and continues your review. Full context, zero cloud.

**Why this matters:**
- Code review is intellectual property
- You control retention policies
- No surveillance by GitHub
- Can review sensitive projects without cloud exposure

---

## Workflow 8: Performance Optimization Review

**Scenario:** You've optimized database queries. You want to audit the changes for correctness.

```bash
branchdiff main feature
```

```
/branchdiff-review

Claude with performance focus:
[suggestion] Line 45: Using Redis well — TTL is right
[suggestion] Line 78: Good async refactor — no blocking calls
[question] Line 112: Are you sure N=100 is safe for batch size?
[suggestion] Line 156: Consider connection pooling instead of new connections
```

```
/branchdiff-resolve

Claude:
- Confirms batch size with regression test suggestion
- Adds connection pool initialization
- Adds performance benchmark comment
```

You verify benchmarks. Commit.

---

## Integration Patterns

### Pattern 1: GitHub as Collaboration Layer

branchdiff is your review tool. GitHub is where the team collaborates.

**Flow:**
1. You review locally in branchdiff
2. Push comments to GitHub PR
3. Team reviews on GitHub (or imports to branchdiff)
4. You import feedback if changes are needed
5. Repeat until approved

GitHub keeps the team in sync. branchdiff keeps you productive.

### Pattern 2: Bitbucket Teams

Same workflow, different platform:

```bash
branchdiff <bitbucket-url>
```

Everything is the same. Push to Bitbucket instead of GitHub.

### Pattern 3: Multi-Repo Simultaneous Review

Open 3 PRs at once:

```bash
# Terminal 1
branchdiff main feature-1  # Port 5391

# Terminal 2
branchdiff main feature-2  # Port 5392

# Terminal 3
branchdiff main feature-3  # Port 5393
```

Switch between `localhost:5391`, `localhost:5392`, `localhost:5393` in browser tabs.

---

## Real Numbers: What Teams See

One team tracked before/after branchdiff for 4 weeks:

| Activity | Before | After | Save |
|----------|--------|-------|------|
| Review 50-file PR | 42 min | 15 min | 27 min |
| Review after commit push | 30 min | 6 min | 24 min |
| Security audit (AI) | 35 min | 8 min | 27 min |
| Onboard new reviewer | 120 min | 25 min | 95 min |
| Export/share review session | N/A | 2 min | — |

**Per week (8 PRs, 2 audits, 1 onboarding event):**
- Before: 8.5 hours
- After: 2.5 hours
- **Saved: 6 hours/week**

**Per year:** 300 hours for a 5-person team.

**For a team of 20:** 1200 hours/year.

---

## Advanced: Claude Code Integration

All workflows above work from Claude Code slashes:

```
/branchdiff-review
# Claude reads current diff, posts comments

/branchdiff-resolve
# Claude reads comments, fixes code

/branchdiff-tour
# Claude generates code tour from current branch
```

No terminal. No copy-paste. Everything in Claude Code.

---

## Troubleshooting

**Q: Port 5391 already in use**
```bash
branchdiff --port 7000
```

**Q: Comments not showing after /branchdiff-review**
Keep branchdiff server running. The skill posts to `http://localhost:5391`. If you closed it, start it again.

**Q: How do I use this with my team's Bitbucket?**
```bash
branchdiff https://bitbucket.org/workspace/repo
# Or set environment variables:
export BITBUCKET_USERNAME=your-username
export BITBUCKET_API_TOKEN=your-token
branchdiff <repo-url>
```

**Q: Can I export reviews for compliance/audit?**
```bash
branchdiff export --all --output reviews.json
# Full review history, exportable, shareable, auditable
```

**Q: Works offline?**
Reviews happen offline. GitHub/Bitbucket sync requires internet. Local LLM support coming.

---

## Next Steps

Try one workflow at a time:

1. **This week:** Try security audit (Workflow 1)
2. **Next week:** Try breaking change detection (Workflow 3)
3. **Week 3:** Try code tours for a new hire (Workflow 5)

Each one saves 15-50 minutes. Compound them over a month, you're back 10+ hours.

---

## Support the Project

If these workflows save your team time:

[![SupportKori](https://img.shields.io/badge/SupportKori-☕-FFDD00?style=flat-square)](https://www.supportkori.com/mirmursalinankur)

Development is ongoing. Support helps prioritize features and fixes.

---

## Links

- **Install:** `npm install -g @encryptioner/branchdiff`
- **GitHub:** https://github.com/Encryptioner/branchdiff-releases
- **Guide:** `branchdiff guide` (in-app)
- **Twitter:** [@AnkurMursalin](https://twitter.com/AnkurMursalin)

---

## Go Deeper

Read the first guide: "branchdiff: Code Review Tool for Modern Teams — Introduction and Facilities" for core concepts and setup.

For philosophy and design, check out "Why I Built a Local-First Diff Tool" (coming soon).
