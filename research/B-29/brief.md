# B-29 Brief: The War on JavaScript Runtimes — Can Bun Replace Node in a Large Production Monorepo?

## Thesis

Bun is easy to adopt as a package manager and script runner, harder as a server runtime, and not a bundler replacement for a webpack-based Vue app. A large monorepo should migrate in tiers, each with its own rollback, not in one switch.

## Audience

Backend and full-stack developers running Express/Mongoose/Vue monorepos on Node + pnpm, and tech leads weighing a Bun migration.

## Angle

An honest field report from probing two sibling pnpm monorepos (an Express API plus two Vue clients of one product family) for Bun feasibility. What worked, what broke, what the evidence says, with measurements and references. Failures are findings, not embarrassments.

News hook: Deno joined Cloudflare on 2026-10-09 — runtime on a ~1-year maintenance clock, Deploy winding down — so the independent-runtime field is down to Node and Bun. Framing is the three-way runtime war and why Bun's compat-first bet outlived Deno's clean slate (Deno 1.0 no npm → Deno 2 npm compat → still consolidated); the blog's "The War So Far" section and deck slide 04 carry it. The post also opens with a "what is a JavaScript runtime" deep-dive (four layers, engine to packages; refs 15–18) — "Node compatibility" is a layer-4 property, which is the lens for every Bun verdict.

## Scope

In: package install, script/test running, server runtime, client build, CI/Docker/PM2 impact, a phased migration path with rollback.
Out: Bun as a bundler for new projects, benchmarks of toy apps, framework comparisons.

## Sanitization

The case study is "a large Express + Vue monorepo". See `guides/post-architecture.md` for the checklist. Source of truth for findings is the sanitized section of `research.md`.

## Deliverables

- `topics/Development/Bun/<Title>.md` (English, B-29)
- `assets/B-29/` cover and diagrams (tier ladder, migration path, runtime anatomy)
- `research.md`, `references.md`
- `social/{en,bn}-{linkedin,facebook}.md`
- `deck-brief.md` later, for the presentation

## Lead (not a source)

The idea came from an AI-assistant answer about Bun vs Node. It is not cited; claims are re-verified against official docs and our own measurements.
