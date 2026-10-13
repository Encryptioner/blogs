# B-29 Brief: Can Bun Replace Node in a Large Production Monorepo?

## Thesis

Bun is easy to adopt as a package manager and script runner, harder as a server runtime, and not a bundler replacement for a webpack-based Vue app. A large monorepo should migrate in tiers, each with its own rollback, not in one switch.

## Audience

Backend and full-stack developers running Express/Mongoose/Vue monorepos on Node + pnpm, and tech leads weighing a Bun migration.

## Angle

An honest field report from probing two sibling pnpm monorepos (an Express API plus a Vue admin client, and its student-facing twin) for Bun feasibility. What worked, what broke, what the evidence says, with measurements and references. Failures are findings, not embarrassments.

## Scope

In: package install, script/test running, server runtime, client build, CI/Docker/PM2 impact, a phased migration path with rollback.
Out: Bun as a bundler for new projects, benchmarks of toy apps, framework comparisons.

## Sanitization

The case study is "a large Express + Vue LMS monorepo". See `guides/post-architecture.md` for the checklist. Source of truth for findings is the sanitized section of `research.md`.

## Deliverables

- `topics/Development/Bun/<Title>.md` (English, B-29)
- `assets/B-29/` cover and diagrams (tier ladder, migration path)
- `research.md`, `references.md`
- `social/{en,bn}-{linkedin,facebook}.md`
- `deck-brief.md` later, for the presentation

## Lead (not a source)

The idea came from an AI-assistant answer about Bun vs Node. It is not cited; claims are re-verified against official docs and our own measurements.
