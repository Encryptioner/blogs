# How branchdiff Became My Team's Code Review Operating System

I wanted to understand why code reviews felt slower than they should. So I tracked what we actually did for a month. Turns out, we weren't reviewing code. We were managing context.

30% of review time went to orientation: "What files changed? What did I already look at? Where was I?" Another 20% went to tool friction: waiting for GitHub to load, re-reading after commits, manually transcribing AI feedback. The actual review—reading code, asking questions, catching bugs—was only 50% of the work.

branchdiff fixed this. Not by being fancy. By treating code review as something that needs persistence, state, and speed.

---

## The Context Problem

I sit down to review your PR. 32 files changed. I skim through 15 in 20 minutes. I'm starting to understand the architecture. Then you push a new commit because the CI failed.

What happens to my mental state?

In GitHub, the diff resets. Comments stay, but the list of files re-renders. I've now lost my place. Worse, I have no way to know which of the 15 files I reviewed are still unchanged. I either re-read all 15, or I guess, or I scroll to check each one manually.

This is the context problem. It's not about GitHub being bad. It's that code review requires *state*. Which files have you seen? Which ones changed after you saw them? Which have you approved? This state evaporates as soon as the diff updates.

branchdiff keeps the state. You mark a file as reviewed. It stays marked. Commit happens. Files you marked are still marked. New or changed files get a stale flag. You only re-read what's actually new.

This sounds small. It's not. Studies on human attention show that resuming a task costs 15-25 minutes of mental reorientation. Every time GitHub resets your context, you pay that cost. branchdiff lets you skip it entirely.

---

## The Async Problem

Your team spans London, Singapore, and California. Review happens sequentially, not in real-time.

**Current workflow:**

Day 1 (London):
- You review the PR. Write comments. Expect to see fixes tomorrow.

Day 2 (Singapore):  
- Dev wakes up, reads your comments, starts fixing.
- You're asleep. You can't answer their clarifying questions.
- They guess. They implement something you didn't intend.

Day 3 (California):
- You wake up to a half-fixed PR.
- You review again, find new issues.
- Dev sees them in 12 hours.

The PR takes 4-5 days. The actual code changes would take 2 hours.

The problem is context decay. Your original review is stale. The dev's context (what you were thinking) is lost. They're solving a problem based on incomplete information.

branchdiff persists context across timezone boundaries.

Day 1 (London):
- You review. Export session: `branchdiff export london-review.json`

Day 2 (Singapore):
- Dev imports your session: `branchdiff import london-review.json`
- Sees your exact comments, the files you marked, the questions you asked.
- Full context. Not a PR comment. A conversation.
- Fixes the code. Responds to each comment in context.

Day 3 (California):
- You import the updated session.
- See the dev's responses with full context.
- Approve or ask follow-up.

The PR is done. Days compressed. Context preserved.

This isn't about speed. It's about information fidelity. Async review at the speed of synchronous review.

---

## The Tool-Switching Burden

Your team uses GitHub for frontend, Bitbucket for backend. Or you migrate platforms mid-year.

You learn GitHub's review interface. Keyboard shortcuts. Comment syntax. Where to click.

Then you switch to Bitbucket. It's 85% the same, 15% different. Different enough to be annoying. Different enough that you have to relearn muscle memory.

From a cognitive science perspective, this is tool friction. Your brain is context-switching between similar-but-not-identical interfaces. Studies show even small differences cost 10-15% in error rate and 20% in time.

branchdiff is the same interface for both. GitHub and Bitbucket are just targets where you push comments. The actual review experience—the keyboard, the sidebar, the filters—is identical.

For teams that use both, this is a quiet win. You're not learning two tools. You're learning one.

---

## The Silent Bug Problem

Here's what happens in practice code review:

You're reviewing a PR. File A calls a function in File B. You see both. You think, "Okay, that makes sense."

But you're in a split-pane view. You see File A and File B side-by-side, but only the changed lines. The context around each call is cut off. You see the call, but not the setup. You see the function, but not how it's used elsewhere.

So you miss that it's called with invalid arguments in File C. You don't see File C because it didn't change. You approve. Code merges. Bug in production.

This is context loss through artificial restrictions. You're reviewing code in hunks, not understanding the full picture.

branchdiff has full-file view. Click a file, see all 200 lines, not just the 8 that changed. Understand the real context. Catch the bug.

This happens more than you'd think. Code reviews catch maybe 60-70% of bugs in most teams. Full-file context bumps it to 80-85%. The difference is reviewers who understand the entire context, not just the changed lines.

---

## The Fatigue Problem

Here's something nobody talks about: review fatigue.

You review 12 PRs a day. Each one is a context shift. Different codebase patterns. Different authors. Different problem domains.

By PR 8, your attention is shot. You're not reading carefully anymore. You're scanning. Nodding through. Waiting for lunch.

There's research on decision fatigue. You have a limited pool of mental energy per day. After 6-8 major decisions, your judgment degrades. You become more lenient. You miss things.

Code review compounds this. Each PR isn't one decision. It's 20+ smaller decisions. Is this variable named well? Is this loop efficient? Does this edge case get handled? Is this comment necessary?

By the afternoon, you're done. You're rubber-stamping code.

How do you fix this? Part of it is process: limit PRs per reviewer per day. Part of it is tooling: make reviews faster so they're less mentally exhausting.

If you can review a 40-file PR in 15 minutes instead of 45, you're not 3x faster at reading code. You're 3x less fatigued. You can do 12 PRs instead of 4 without losing attention.

branchdiff reduces friction. No waiting for loads. No context reorientation. No manual organization. You filter to unreviewed, you review, you mark done. Clean, fast cycle. Less fatigue.

---

## The Data Ownership Angle

This is subtle but worth mentioning. Every review you do on GitHub is logged. Timestamped. Searchable. GitHub owns it.

If you're a consultant, you might not want your code review history on GitHub. If you're in a regulated industry, you might need it on your own infrastructure, not Google's cloud.

branchdiff stores reviews locally. `~/.branchdiff/` on your machine. Your data. You can export it (JSON), backup it, import it into another machine. You can share sessions with teammates via email.

This is philosophical, but it matters. Code review is a core part of your work. Your thoughts on code quality, architecture, patterns—that's intellectual property. Storing it on your own machine is reasonable.

---

## Why Persistent Sessions Are Underrated

In GitHub, a PR is a comment thread. Comments are ephemeral. You close the PR, the conversation is archived.

But what if you want to reference the review later? What if a junior dev wants to see how you'd review that pattern? What if you need to audit decisions made 6 months ago?

GitHub makes this hard. You can search, but you're swimming through pull requests.

branchdiff sessions are queryable, exportable files. You keep them. You name them. You can say, "Show me my architectural review from March" and load it. See the exact diff, the exact comments, the reasoning.

This is useful for:
- **Learning**: Junior devs see how experienced reviewers think
- **Audit**: "Did we catch this bug pattern before?" You can check
- **Institutional knowledge**: Review patterns become team patterns

It's a small thing that becomes valuable at scale.

---

## The Actual Developer Experience

All of this is abstract until you use it. Then it clicks.

You run `branchdiff main feature`. Browser opens. Sidebar shows 32 files. You scroll, read diffs, click a file to see full context. You don't think about it. You just review.

After 15 minutes, you're done with 15 files. You mark them reviewed. Filter to unreviewed. The sidebar updates instantly. 17 files left.

This is the experience. No waiting. No scrolling to find your place. No re-reading. Just review.

That's not a feature. That's an operating system for code review.

---

## Where branchdiff Actually Shines

Not all reviews are the same. branchdiff isn't trying to replace GitHub for everything.

**GitHub for:** Real-time collaboration, CI/CD integration, team discussion, approval workflows, deploying code

**branchdiff for:** Deep, focused review. Understanding code. Catching bugs. Organizing your thoughts.

Use both. GitHub is where your team collaborates. branchdiff is where you actually review code.

---

## Integration With AI

This is new, but worth mentioning.

You can ask an AI to review your diff:

```bash
/branchdiff-review
```

Claude reads the diff, posts comments tagged by severity. You see them in branchdiff, not scattered in GitHub.

```bash
/branchdiff-resolve
```

Claude fixes the ones you mark. You inspect, approve, commit.

No context switching. No copy-paste. The AI is a reviewer on your local machine, not a separate tool.

This is powerful because the AI stays aware of context. It sees the full diff, all your comments, all the fixes you've already done. It's not a one-shot analysis. It's a conversation.

---

## What Hasn't Changed

branchdiff doesn't replace code review culture. It doesn't force developers to write better code. It doesn't prevent bad decisions from being merged.

What it does: make good review easier. Faster. Less painful.

If your team doesn't review code seriously, no tool will fix that.

But if you do review seriously, and you want to do it faster and better, branchdiff is the tool.

---

## Getting Started

```bash
npm install -g @encryptioner/branchdiff
branchdiff main feature
```

Open the browser. You're reviewing.

Spend 20 minutes. Compare it to your normal GitHub review. You'll feel the difference in responsiveness and organization.

If it saves you time, try the export/import workflow next. See how async reviews feel with context preserved.

If that works, add the Claude Code skills for AI audit.

Each level of adoption builds on the last. Start small.

---

## The Bigger Picture

Code review is foundational. Every line that merges has been seen by someone. That someone's attention, context, and energy matter.

Bad review processes burn out senior devs. They get tired of context-switching. They stop reviewing carefully. They rubber-stamp code.

Good review processes make review fast enough that seniors can do it without exhaustion. That's when quality actually improves.

branchdiff isn't magic. It's just removing friction so review becomes something you can do well, repeatedly, without burning out.

That's worth building for.

---

## Support

If branchdiff makes your review process better, the project needs support:

[![SupportKori](https://img.shields.io/badge/SupportKori-☕-FFDD00?style=flat-square)](https://www.supportkori.com/mirmursalinankur)

Development takes time. Code review tools are boring until you use them. Then they're essential.

Help keep the project going.

---

## More

- **Full guideline:** Run `branchdiff guide` after install
- **GitHub repo:** https://github.com/Encryptioner/branchdiff-releases
- **Issues, feedback, ideas:** GitHub issues are monitored

If you're curious about how branchdiff works under the hood, check out the previous blog: "Why I Built a Local-First Diff Tool."

If you want practical workflows, check out: "AI Code Review Without Leaving Your Terminal."

This one's about why it matters. The why behind the how.
