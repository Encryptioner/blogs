# B-29 Research: Bun Feasibility on a Large Express + Vue Monorepo

Sanitized. Case study = two sibling pnpm monorepos (one back-office app, one customer-facing) from one product family: Express 4 API, Mongoose 6 + mongodb 4 driver, BullMQ, ioredis, socket.io, sharp, puppeteer, module-alias, vitest, Vue CLI (webpack 5) clients. Baseline: Node 24, pnpm 10, `tsc` build then `node dist/...` under PM2, CI and Docker on a `node:24` image. Tool under test: Bun 1.3.10.

## Method and caveats

- Probes ran on throwaway copies, never on the real repos. Config files were dummies built from the example files; no secrets were read.
- No reachable database or Redis. "Boots" means it reached the connect stage.
- Each number is a **single run** on one machine under other load. The pnpm store was warm; the Bun cache was cold only for the first install. Install times are not apples to apples.
- The Node vitest baseline in the Repo A copy already had 28 failing tests in 4 files (dummy configs). "Same" below means the same failing set.
- Findings came from a research subagent that returned them as text. Source URLs were re-checked for existence (HTTP 200, one 403 from a bot block) but not re-read.

## Tier 1: package manager

| Result | Repo A (larger) | Repo B (smaller) |
|--------|-------|---------|
| `bun install` from `pnpm-lock.yaml` | 2181 packages, identical resolution | 1963 packages, identical resolution |
| pnpm install (warm store) | 17.2 s | 17.0 s |
| bun install (cold cache) | 45.7 s | n/a |
| bun install (warm cache) | 22.8 s | 23.2 s |
| bun install `--linker hoisted` | 18.8 s | not run |
| `node_modules` size | about 1.0 GB (1.3 GB hoisted) | similar |

- `workspace:*` resolves; sharp and puppeteer postinstall work.
- Bun ignores `pnpm.onlyBuiltDependencies` and uses its own trusted-dependency list.
- Bun's default isolated linker does not replicate pnpm's `shamefully-hoist` behaviour; the Vue CLI build then fails (Tier 4). `--linker hoisted` fixes it.
- Takeaway: on a warm pnpm store, Bun was not faster at installing here.

## Tier 2: scripts and tests

- Shared-package builds (three `tsc` packages): pnpm 9.2 s, `bun run --filter` 5.6 s, `bun --bun` 8.9 s. Output byte-identical.
- Server `tsc` with the repo's 1536 MB heap flag ran out of memory in the copy. Node at 4 GB: 46.7 s. `bun x tsc` (Node runtime): 48.6 s. `bun --bun tsc`: 86.8 s. Output identical, 0 errors.
- vitest, Repo A: Node 193 s, `bun --bun x vitest` 204 s, same failing set.
- vitest, Repo B: Node 34/34 pass; `bun x vitest` (Node runtime) pass; `bun --bun x vitest` failed all 4 files with `NotImplementedError: node:v8 isBuildingSnapshot is not yet implemented in Bun`, traced to `bson@7.3.3` via mongodb-memory-server. Repo A resolved `bson@7.2.0` and passed. Same Bun gap is described in a community write-up and a hosting-forum thread (see references).
- `bun test` hung over 10 minutes on the full Repo A suite (killed). A single pure unit file passed.

## Tier 3: server runtime (DB and Redis at a dead port)

- `bun dist/bin/www.js` and `bun src/bin/www.ts` both boot through queue and Redis connect; the `module-alias` path alias works.
- Probes passed: sharp, puppeteer (headless launch, PDF), mongoose 6, mongodb 4, bullmq, ioredis, socket.io (polling and websocket), module-alias.
- **Open issue:** the full app exits with code 1 about 30 to 40 s after the Mongo connection fails, in both repos. Node stays alive and logs the error. Small mongoose and winston-mongodb probes behave the same in both runtimes, so the cause is unknown. Not tested against a reachable database.
- `bun --watch` is not a nodemon replacement: no ignore glob, and the PID stayed the same across a restart.
- `emitDecoratorMetadata` is not enabled in any tsconfig, so decorator metadata under Bun was not tested.

## Tier 4: client build

- Repo A `vue-cli-service build` on Node: 3:36.
- Bun isolated install: fails at once with `Cannot find module '@babel/plugin-transform-runtime'`.
- Hoisted install on Node: works, 3:45.
- Hoisted install with `bun --bun`: fails after 5:21 with two css-loader errors on `url(data:...)` inside third-party CSS.
- Repo B `bun --bun` build hung at 0% CPU for 28 minutes in fork-ts-checker child processes (killed). Node baseline: 1:43.
- `vue-tsc` under `bun --bun`: Repo A 36.8 s vs 81.5 s Node, Repo B 5.2 s vs 20.9 s (Repo B runs likely warm). 0 errors.
- Vite migration (assessed, not done): Vue CLI is in maintenance mode. Work: replace the webpack config (ProvidePlugin, polyfill fallbacks, an html asset rule, the PWA plugin) and move two `process.env` uses to `import.meta.env`. Estimate 3 to 6 days per client. This is an estimate, not a measurement.

## Repo differences that matter

- nodemon ^2 in one repo, ^3 in the other.
- One server build script calls `pnpm run` and `pnpm exec`; the other calls `npm run`.
- `build:assets` globs differ (separate patterns vs one brace glob).
- Only one repo has sharp and puppeteer; BullMQ majors differ (5 vs 3).
- Bun auto-loads `.env`, and both CI pipelines write `NODE_ENV=production` into it.

## Risk matrix

| Area | Likelihood | Impact |
|------|-----------|--------|
| Package manager (hoisted linker) | Low | Low |
| Scripts via Bun, Node as runtime | Low | Low |
| vitest on Bun | Medium | Low |
| tsc / vue-tsc on Bun | Low | Low |
| Server production runtime on Bun | High | High |
| Client webpack on Bun | High | Medium |
| Docker / CI switch to a Bun image | Medium | Medium |
| Native modules | Medium | Medium |

## Not found

Searches for official Bun guidance on Mongoose/MongoDB, puppeteer, sharp and Bitbucket Pipelines returned nothing; those conclusions rest only on the local probes above. The official Docker guide covers a basic Bun image only, with no native-module guidance.

## Recommended path

1. Bun as package manager only, optional, with `linker = "hoisted"`, explicit `trustedDependencies`, and the pnpm lockfile kept. Rollback: delete `bun.lock`, run `pnpm i`.
2. Run scripts via `bun run --filter`, `tsc` on the Node runtime, `vue-tsc` via `--bun`. Pin `bson` to 7.2 where the v8 gap bites.
3. Move the client to Vite. Worth doing with or without Bun.
4. Server on Bun only after the exit-on-DB-failure is explained against a real database and Redis, followed by a soak test, PM2 `interpreter: bun`, and no `node_args` heap flags.

No production runtime switch is recommended.

## Follow-ups before publishing claims

- Re-run the server-runtime probe against a reachable MongoDB and Redis to explain the exit code 1.
- Repeat install timings with several runs and a cold pnpm store.
- Re-check Bun's latest release notes for the `node:v8` snapshot gap.

## Runtime anatomy framing (added with the deep-dive)

The blog and deck open with a four-layer model of a JavaScript runtime — 1) JS engine, 2) native bindings, 3) platform APIs + event loop, 4) modules/packages. Node and Deno embed V8; Bun embeds JavaScriptCore. Bindings: C++ (Node), Rust via Rusty V8 (Deno), Rust in Bun since the v1.4.0 rewrite (Zig through 1.3.x; probes here ran on 1.3.10, the last Zig line) [19]. Node's loop is libuv; Deno and Bun wrote their own. The point of the model: "Node compatibility" is a layer-4 property plus a slice of layer 3 — every Bun verdict in the report is a verdict on layer 4, and Deno's arc (rewrite layer 4, then walk it back) is the cautionary tale. Sources: references 15–18 in `references.md`. Diagram: `assets/B-29/runtime-anatomy.png` (rendered LR so one PNG serves both blog and deck).

## Release trains and LTS (added with the 2026-10-14 update)

How each runtime ships updates, now covered in the blog ("Release Trains and LTS") and deck slide 05:

- **Node** — major every 6 months; even-numbered October lines become LTS with 30 months of total support (Active, then Maintenance); odd lines are Current-only for ~6 months. Pin an even line, stay quiet ~2 years [21].
- **Deno** — stable minor every 12 weeks; LTS channel since 2.1 with ~6 months of backported critical fixes — that channel ended 2026-04-30, before the Cloudflare announcement; canary builds per commit [20].
- **Bun** — no LTS at all: one rolling stable channel plus canary (`bun upgrade --canary`). The 1.3 → 1.4 minor bump carried a full Zig → Rust rewrite of ~535K lines (merged 2026-05-14, 19 regressions, all fixed; binaries ~20% smaller, ~2–5% faster) [19]. Anthropic acquired Bun in December 2025.

Pricing per tier: at tiers 1–2 the moving release train is a cheap CI version bump; at tier 3 "no LTS" means the pinned version has no promised support window.
