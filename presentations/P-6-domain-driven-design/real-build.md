## Slide 1: Title Slide

# Domain-Driven Design — Real Build
## A Real Proposal, Real Issues, and What It Means for Agentic Teams

- **Presented by:** Mir Mursalin Ankur
- **Lead Software Engineer @Nerddevs Ltd**

*Northwind is gone. Bengal Lens is a real editorial platform built for a news media house client — modeled with the patterns from the [Intro](./intro.html) and [Deep Dive](./deep-dive.html) decks, and built by handing each bounded context to its own AI agent instead of typing every line by hand.*

---

## Slide 2: The Proposal

# I Got a Proposal. DDD Wasn't Part of It.

A news media house needed articles to move through a real newsroom workflow — drafted, reviewed, fact-checked, approved, published, sometimes corrected — alongside image handling, search, and a public site that renders it all to readers. The existing codebase was organized by technical concern: a folder for articles, a folder for auth, a folder for media.

*Nobody said "use Domain-Driven Design." That was my call to make.*

---

## Slide 3: Deciding the Domain

# Reading for Where Language and Lifecycle Diverge

Three questions did most of the work:
- Does deleting one thing imply deleting the other? (article ↔ its images: **no**)
- Is this read completely differently than it's written? (search ↔ the article itself: **yes**)
- Does this change on its own schedule, driven by different people? (a user account ↔ an article: **yes**)

| Context | Owns | Core model |
|---|---|---|
| **Identity** | Users, auth, 2FA, RBAC | `User`, `Credentials`, `Session` |
| **Editorial** (core) | draft→review→approve→publish→correct | `Article`, `WorkflowState`, `Version` |
| **Media** | Upload, processing, storage | `MediaAsset`, `ImageVariant` |
| **Content Discovery** | Search, sitemaps | `SearchIndex` (read model only) |
| **Public Delivery** | Rendering, locale, SEO | none — stateless consumer |

Rejected merges: Identity↛Editorial, Media↛Editorial, Discovery↛Editorial, Public Delivery↛Discovery — each one kept apart for a specific, stated reason, not by default.

---

## Slide 4: Deciding the Standard

# What Actually Earns Its Cost Here

1. **Aggregates + an aggregate root per context** — one place enforces the rules, not every caller.
2. **Clean, one-directional layering** — business rules never import the database, storage, or login system.
3. **A translation layer at every boundary** — Editorial only ever sees a small stand-in for a media file.
4. **Domain events for cross-context coupling** — in-process first, a shared queue later, a streaming platform only if scale demands it.

---

## Slide 5: Deciding How to Build It

# If the Domain Splits Cleanly, Can the Build Split Too?

Five independent contexts, modeled separately — the next question: are they independent enough to be **built** separately too, by different workers, without getting in each other's way?

Decision: hand each piece to an AI agent starting completely fresh, no memory of a previous piece's decisions. Eight pieces of work on one branch: foundation → Identity → Editorial → Media → Discovery → public site → admin tool → integration.

---

## Slide 6: How Agentic AI Can Work for DDD

# A Framework, Not Just an Anecdote

- Treat each bounded context as a self-contained unit of work — DDD already gives it its own model and interface.
- Write the architecture decision down before any agent starts; make reading it step one.
- Never let a single "all checks passed" report be the only gate — require an independent second look.
- Require attribution, not just detection, when a check fails — work out what's actually yours before fixing it.

*The rest of this deck is the evidence for why each rule earned its place.*

---

## Slide 7: How Many Issues Actually Came Up

# Six, Not Three

| # | Issue | Shape |
|---|---|---|
| 1 | A required setup file couldn't be created — a permission restriction | Environment gap |
| 2 | Editorial reported all checks passing; an independent look found real errors | False-green |
| 3 | The first fix for #2 fixed one tool and broke another | Fix introduced a new mismatch |
| 4 | A maintenance task ran into two pre-existing gaps from the still-in-progress build | Cross-task drift |
| 5 | A test still encoded an old design (fixed role list) after the schema moved to free-form roles | Design drift |
| 6 | Two pieces of work disagreed on where transition rules should live | Ownership drift |

---

## Slide 8: How Each Was Handled — And Should Be

# Actual vs. Standing Practice

| Issue | How it was handled | How it should always be handled |
|---|---|---|
| 1 — blocked file | Flagged, asked for it outside the restriction | Never bypass a deliberate permission boundary |
| 2 — false-green | Independent tool caught it before the next piece began | Never advance on a single "passed" report |
| 3 — fix broke a tool | Re-checked everything, found and fixed the new break | Re-run *every* check after any shared-config fix |
| 4 — cross-task drift | Checked history file-by-file before fixing anything | Attribute before fixing — always |
| 5 — stale test | Recognized the test, not the schema, was outdated | Ask "which side is actually stale?" first |
| 6 — ownership drift | Checked against the written architecture doc | Only works if the decision was written down |

---

## Slide 9: How I Applied This, End to End

# Proposal → Decision → Build → Verification

Read the proposal for where language and lifecycle diverged, not where old folders happened to be. Picked patterns for what they cost versus what they protect. Wrote the architecture decision down before any code existed. Split the build to match the contexts, handed each to a fresh AI agent. Never trusted a single "passed" report — every piece got an independent look before the next began. Resolved disagreements by checking who caused what, or what was actually written down — never by guessing.

---

## Slide 10: What Could Be Best

# Three Things I'd Make Standing Process, Not Ad Hoc Discipline

- A running issue log per context, from day one — not reconstructed afterward.
- The independent second look as a mandatory gate, not a judgment call.
- A scheduled, whole-project consistency sweep — not a maintenance task's lucky side effect.

*None of these three are DDD patterns. They're process discipline sitting on top of a structure that was already sound.*

---

## Slide 11: Checklist & Resources

# Take It Back to Your Own Workflow

- [ ] Write bounded-context decisions somewhere every piece of work reads first.
- [ ] One bounded context per piece of work by default; split further only across genuinely different technology stacks.
- [ ] Build the independent second look into the process as a standing gate.
- [ ] Attribute before fixing anything an unrelated task's checks turn up.
- [ ] When a test fails, ask whether the test or the design is the one that's outdated.
- [ ] Keep a running issue log per context; schedule whole-project consistency checks.

*Simple CRUD apps, short-lived projects, no sustained access to people who understand the domain — none of this, human or agentic, pays for itself there.*

Sources: Bengal Lens (built for a news media house client) · ByteByteGo · Nikki Siapno, Level Up Coding · [← Back to Deep Dive](./deep-dive.html) · [← Back to Intro](./intro.html)
