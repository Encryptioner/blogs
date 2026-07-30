# Domain-Driven Design in Production: A Real Build, Real Drift, and What It Means for Agentic Teams

> The structure narrows where bugs can hide. It doesn't remove the need to go looking.

This is the third of three posts on Domain-Driven Design. The [first post](./Domain-Driven%20Design%20for%20Beginners%20-%20What%20It%20Is%20and%20Why%20It%20Matters.md) covered the foundations and the [second](./Domain-Driven%20Design%20Deep%20Dive%20-%20Aggregates%2C%20Events%2C%20and%20Context%20Maps%20in%20Practice.md) covered production patterns — both using Northwind, a fictional online retailer, because a clean teaching example needs to isolate the pattern from real-world noise.

This post drops the fiction and stays in first person, because that's actually how it went: I got a proposal, had to decide how DDD applied to it, decided to hand the building of it to AI agents instead of typing every line myself, watched real issues surface once it was actually being built, and had to decide — each time — whether they were mine to fix and how. What follows is that walkthrough: the proposal, the decisions, how many issues actually came up, how each was handled versus how I think it should be handled, what running this with AI agents actually requires, and what I'd change next time.

## 1. The Proposal

The project is **Bengal Lens**, a real editorial platform built for a news media house client. The ask, stripped to its plainest form: *articles need to move through a real newsroom workflow* — drafted, reviewed, fact-checked, approved, published, and occasionally corrected after the fact — alongside image handling, search, and a public-facing site that actually renders the thing to readers. The existing codebase organized itself by technical concern: a folder for articles, a folder for auth, a folder for media. Nobody in the proposal said "use Domain-Driven Design." That was my call to make, and it's worth walking through *why*, not just stating the conclusion.

## 2. Deciding the Domain — The DDD Perspective

The way I actually approached this: read the proposal for where the **language and the lifecycle genuinely diverge**, not just where the code happened to already have folders. Three questions did most of the work:

- **Does deleting one thing imply deleting the other?** An article and its images: no — a support image can outlive the article it was originally attached to, or get reused. That's a seam.
- **Is this read completely differently from how it's written?** Search results and the article itself: yes — search wants fast, denormalized, read-shaped copies; the article itself wants one consistent, write-shaped source of truth. Forcing those into one model means one of the two always loses.
- **Does this have its own reason to change, on its own schedule, driven by different people?** A user's account and an article: yes — account lifecycle (signup, roles, sessions) has nothing to do with an article's lifecycle. They just happen to reference each other.

Applying that gave five bounded contexts, plus one small shared kernel of the handful of things every context has to agree on regardless:

| Context | Owns | Core model |
|---|---|---|
| **Identity** | Users, auth, 2FA, RBAC | `User` (aggregate), `Credentials`, `Session`, `Role` |
| **Editorial** (core domain) | Article lifecycle — draft→review→approve→publish→correct | `Article` (aggregate), `ContentBlock`, `WorkflowState`, `Version`, `AuditEntry` |
| **Media** | Upload, image processing, storage | `MediaAsset` (aggregate), `ImageVariant` |
| **Content Discovery** | Search, sitemaps, reading stats | `SearchIndex`, `SitemapEntry` (read models only) |
| **Public Delivery** | Rendering pages, locale routing, SEO | none — stateless consumer |

Just as important as what got split apart is what I deliberately **didn't** merge, and why — this is the part a starter skips, because folding two things together always looks like less work in the moment:

- Identity → Editorial: no — an account's lifecycle doesn't depend on any article existing.
- Media → Editorial: no — an image has its own storage lifecycle; deleting an article shouldn't delete its images.
- Content Discovery → Editorial: no — read-optimized and write-optimized concerns fight each other the moment they share one model.
- Public Delivery → Content Discovery: no — different technology, different scaling needs, no shared lifecycle at all.

**Editorial is the core domain** — the one place where getting the model wrong costs the most, because the workflow itself (who can move an article from review to approved, what gets versioned, what gets audited) *is* the business logic, not plumbing wrapped around a database row.

## 3. Deciding the Standard to Apply

Once the domain was split, the next decision was which patterns actually earn their cost here, not just which ones sound impressive:

1. **Aggregates and an aggregate root per context** — so exactly one place enforces "you can't do that to an article that's already published," instead of every caller re-implementing (or forgetting) the same rule.
2. **A clean, one-directional layering** — business rules never import the database, the storage layer, or the login system directly; those plug into small interfaces the business rules define, never the other way round.
3. **A translation layer at every boundary** — Editorial never touches a raw media file; it only ever sees a small stand-in with just the fields it actually needs (an id, a URL, a caption, a credit).
4. **Domain events for anything crossing a context boundary**, with a growth path decided up front rather than argued about later: an in-process notification for the first version, a shared message queue if it ever splits into separate deployed services, a full event-streaming platform only if it needs to scale further than that.

## 4. Deciding How to Get It Built — Where Agentic AI Comes In

This is the decision the first two posts never had to make, because a made-up example doesn't need building. Once the domain was genuinely split into independent contexts, a second question followed naturally: **if these five pieces are independent enough to model separately, are they independent enough to build separately too — by different workers, in parallel, without them getting in each other's way?**

I decided yes, with one condition: each piece of work would be handed to an AI agent **starting completely fresh**, with no memory of how a previous piece had been built. That was deliberate — a shortcut taken while building one context shouldn't be able to quietly become an assumption baked into the next one. The build became eight pieces of work on one branch: the shared foundation first, then Identity, Editorial, Media, and Content Discovery each in turn, then Editorial's two different front-facing surfaces — the internal admin tool and the public website, genuinely two different pieces of software on two different technology stacks — and finally one pass to wire everything together.

**How an agentic approach can work for DDD, generalized beyond this one build:**

- **Treat each bounded context as a self-contained unit of work**, the same way you'd hand it to a different team. This only works because DDD already forces each context to define its own boundary, its own model, and its own interface to the outside — an agent building one context genuinely doesn't need to read another context's internals to do its job correctly.
- **Write the architecture decision down before any agent starts**, and make reading it the first step of every piece of work. Without a durable, written decision, two independently-working agents will settle ownership disputes differently, and neither will know it happened.
- **Never let a single "all checks passed" report be the only gate.** An agent's own summary of its work is necessary, not sufficient — build in an independent second look, from a different tool or a different pass, before treating anything as actually finished.
- **Require attribution, not just detection, when a check fails.** An agent that finds ten errors needs to work out which ones its own change actually caused before fixing any of them — otherwise routine work quietly turns into uncontrolled scope creep.

That's the framework. The rest of this post is the evidence for why every one of those four points earned its place — five real issues came up applying exactly this process, and each one is why a rule above exists.

## 5. How Many Issues Actually Came Up

Across the pieces of work I actually reviewed closely — the foundation, the Editorial context, and a separate maintenance task that touched the whole project mid-build — five real issues surfaced. Not a full audit of all eight pieces of work, but every one that did surface falls into one of two shapes: **a tooling or configuration mismatch**, or **two parts of the system quietly drifting apart on something they were supposed to agree on**.

| # | Issue | Shape |
|---|---|---|
| 1 | A required setup file couldn't be created because of a permission restriction | Tooling/environment gap |
| 2 | Editorial was reported as fully passing its checks; an independent look found real errors in the same code | Tooling mismatch (false-green) |
| 3 | The first attempted fix for #2 fixed one tool and broke another | Tooling mismatch (introduced by the fix) |
| 4 | An unrelated maintenance task ran into two pre-existing gaps left by the still-in-progress build | Cross-task drift |
| 5 | A test still encoded an old design assumption (a fixed list of roles) after the schema had deliberately moved to free-form roles | Design drift between test and model |
| 6 | An early piece of work placed workflow-transition rules in the shared kernel; the written architecture decision said they belonged to Editorial alone | Ownership drift between two pieces of work |

Six, not five, once counted properly — I nearly under-counted my own list, which is itself a small demonstration of why writing the tally down instead of trusting a mental count is worth doing.

## 6. How Each Was Handled — And How It Should Be Handled

**Issue 1 — the blocked setup file.** Handled by flagging it plainly and asking for it to be created outside the restricted process, rather than working around the restriction. **How it should be handled:** exactly that — a permission boundary that exists on purpose shouldn't be quietly bypassed just because it's inconvenient in the moment; surfacing it and waiting is the correct call, not a workaround.

**Issue 2 — the false-green report.** Editorial's build was reported finished, every check reportedly passing. An independent look at the same code — using a different tool than the one that produced the "all passing" report — found real errors sitting in the exact files just marked clean. **What was actually happening:** a project setting told the tool doing the official check to read a shared package's original source files, while every other tool followed the ordinary rule and read a separate, stale, pre-built copy of the same package instead. Both reports were individually true; they just weren't looking at the same version of the code. **How it should be handled:** exactly as it was here — never advance past a report of success without at least one independent check using a different tool, because a report can be entirely honest and still be describing a different reality than the one a second tool would see.

**Issue 3 — the fix that broke a different tool.** The first fix for issue 2 (pointing every tool at the same source files) cleared the independent check immediately, but broke the official one — a second, unrelated setting restricted the project to only its own files, and now rejected the shared files it needed. **How it was handled:** that restricting setting turned out to only matter for producing a build output, which this project never does — removing it let every tool agree for the first time. **How it should be handled:** the same way, but earlier — any fix that touches shared configuration should be followed by re-running *every* check, not just the one it was meant to fix, precisely because config changes have a habit of fixing one thing and quietly breaking a neighbor.

**Issue 4 — the maintenance task walking into someone else's unfinished work.** A routine update to bring the whole project's tooling up to date surfaced errors in four places; only one was actually caused by the update itself. **How it was handled:** checking, file by file, when each failing file had last changed and whether this task's own edits touched it — two of the four clusters clearly predated the task and had nothing to do with it. Only the one genuinely caused by the update got fixed; the rest got reported honestly as separate, pre-existing findings. **How it should be handled:** the same way, every time — fixing an error you happened to notice, without first checking whether it's actually yours to fix, is how a "routine update" quietly turns into an unrelated task claiming credit (or blame) for someone else's half-finished work.

**Issue 5 — the test asserting a design that no longer existed.** A test rejecting "unknown" roles started failing after an unrelated change. It looked, at first glance, like a regression. **What was actually true:** the role model had deliberately moved to free-form, admin-created role names governed by a permission matrix, not a fixed list — so a test built around "there's a fixed list of valid roles" was testing an assumption the design had already moved past. **How it was handled:** correctly identified as a stale test, not a stale schema, and the *test* was updated to match the schema's real, current constraints instead of the schema being bent back to satisfy an old test. **How it should be handled:** the same way, but this is worth calling out on its own — the instinct when a test fails is almost always "fix the code," and the harder, more valuable judgment call is recognizing when the test is actually the thing that's out of date.

**Issue 6 — two pieces of work disagreeing about where the transition rules live.** An early piece of work put workflow-transition logic in the shared kernel; the written architecture decision said transitions belong to Editorial alone. **How it was handled:** caught during review, checked against the written decision rather than against what the earlier piece of work happened to assume, and corrected. **How it should be handled:** exactly this — but it only works at all because a written decision existed to check against. A decision that only ever lived in someone's head, or in one piece of work's working notes, would have had nothing to be checked against once that work was finished.

## 7. How I Applied This, End to End

Concretely, start to finish: I read the proposal for where language and lifecycle actually diverged, not where the existing folders happened to be, and that produced five bounded contexts plus a small shared kernel. I picked patterns for what they'd actually cost versus what they'd actually protect, not for how sophisticated they'd look. I wrote the resulting architecture decision down before any code existed, specifically so it could act as a tiebreaker later. I split the build into pieces that matched the bounded contexts — one exception where a single context spanned two different technology stacks and genuinely needed two pieces of work — and handed each piece to an AI agent starting fresh. I didn't treat any single "all checks passed" report as final; every piece of work got an independent look before the next one started, which is exactly how issues 2 and 3 surfaced instead of shipping quietly. And when an unrelated task ran into someone else's unfinished work, or two pieces of work disagreed about ownership, I resolved it by checking who actually caused it or what was actually written down — not by guessing.

## 8. What Could Be Best

If I ran this again, three things would change from ad hoc discipline into a standing part of the process rather than something I happened to remember to do:

- **A running issue log, one per context, kept from the very first piece of work.** I reconstructed the tally in section 5 after the fact; it should exist as a living document from day one, updated the moment each issue surfaces, not recovered afterward.
- **The independent second look should be a mandatory gate, not a judgment call.** It caught the two biggest issues here. It should never depend on someone remembering to do it before moving on.
- **A scheduled, whole-project consistency sweep, not just a lucky one.** Issue 4 only surfaced because an unrelated task happened to touch the whole project mid-build. A build with several contexts in progress at once should have a deliberate checkpoint — not a maintenance task's side effect — for catching exactly this kind of drift between contexts before it's found by accident.

None of these three fixes are DDD patterns. They're process discipline sitting on top of a DDD structure that was already sound — which is really the whole point of this post: the structure decided in sections 2 and 3 never caused any of the six issues. It only ever limited *where* they could hide. Finding them still took looking.

## Checklist: Running DDD With Agentic or Parallel Teams

- [ ] Write the bounded-context decisions down somewhere every piece of work reads first — the tiebreaker, not something kept in someone's head.
- [ ] Default to one bounded context per piece of work; split further only when a context genuinely spans more than one technology stack.
- [ ] Never move forward on a single "all checks passed" report — build in an independent second look as a standing gate, not a judgment call.
- [ ] Before fixing anything an unrelated task's checks turn up, check who's actually responsible for it — fix only what's yours, report the rest honestly.
- [ ] When a test starts failing, ask whether the test or the design is the one that's actually out of date, before assuming it's a regression.
- [ ] Keep a running issue log per context from day one, and schedule whole-project consistency checks — don't wait for an unrelated task to stumble into the drift.

And the reminder that's closed both prior posts, still true here: simple CRUD apps, short-lived projects, and teams without sustained access to people who understand the domain are exactly where none of this — human or agentic — pays for itself. Reach for it where the domain, not the plumbing, is genuinely the hard part.

## Sources

- Bengal Lens — a real editorial platform built for a news media house client; the proposal, decisions, and issues above are real, described in plain terms rather than as a technical log
- ByteByteGo — [Domain-Driven Design (DDD) Demystified](https://blog.bytebytego.com/p/domain-driven-design-ddd-demystified)
- Nikki Siapno, Level Up Coding — [Domain-Driven Design, Broken Down](https://blog.levelupcoding.com/p/domain-driven-design-broken-down)
- Companion deck: [Real Build — Domain-Driven Design in Production](../../../presentations/P-6-domain-driven-design/real-build.html)
- Previously: [Intro](./Domain-Driven%20Design%20for%20Beginners%20-%20What%20It%20Is%20and%20Why%20It%20Matters.md) · [Deep Dive](./Domain-Driven%20Design%20Deep%20Dive%20-%20Aggregates%2C%20Events%2C%20and%20Context%20Maps%20in%20Practice.md)
