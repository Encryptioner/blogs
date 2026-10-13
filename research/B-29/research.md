# B-29 Research: Bun Feasibility on a Large Express + Vue Monorepo

Sanitized. Case study = two sibling pnpm monorepos (an admin portal and a student portal) from one product family: Express 4 API, Mongoose 6 + mongodb 4 driver, BullMQ, ioredis, socket.io, sharp, puppeteer, module-alias, vitest, Vue CLI (webpack 5) clients. Baseline: Node 24, pnpm 10, `tsc` build then `node dist/...` under PM2, CI and Docker on a `node:24` image. Tool under test: Bun 1.3.10.

## Method and caveats

- Probes ran on throwaway copies, never on the real repos. Config files were dummies built from the example files; no secrets were read.
- No reachable database or Redis. "Boots" means it reached the connect stage.
- Each number is a **single run** on a laptop with other load. The pnpm store was warm; the Bun cache was cold only for the first install. Install times are not apples to apples.
- The Node vitest baseline in the admin copy already had 28 failing tests in 4 files (dummy configs). "Same" below means the same failing set.
- Findings came from a research subagent that returned them as text. Source URLs were re-checked for existence (HTTP 200, one 403 from a bot block) but not re-read.

## Tier 1: package manager

| Result | Admin | Student |
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
- vitest, admin: Node 193 s, `bun --bun x vitest` 204 s, same failing set.
- vitest, student: Node 34/34 pass; `bun x vitest` (Node runtime) pass; `bun --bun x vitest` failed all 4 files with `NotImplementedError: node:v8 isBuildingSnapshot is not yet implemented in Bun`, traced to `bson@7.3.3` via mongodb-memory-server. Admin resolved `bson@7.2.0` and passed. Same Bun gap is described in a community write-up and a hosting-forum thread (see references).
- `bun test` hung over 10 minutes on the full admin suite (killed). A single pure unit file passed.

## Tier 3: server runtime (DB and Redis at a dead port)

- `bun dist/bin/www.js` and `bun src/bin/www.ts` both boot through queue and Redis connect; the `module-alias` path alias works.
- Probes passed: sharp, puppeteer (headless launch, PDF), mongoose 6, mongodb 4, bullmq, ioredis, socket.io (polling and websocket), module-alias.
- **Open issue:** the full app exits with code 1 about 30 to 40 s after the Mongo connection fails, in both repos. Node stays alive and logs the error. Small mongoose and winston-mongodb probes behave the same in both runtimes, so the cause is unknown. Not tested against a reachable database.
- `bun --watch` is not a nodemon replacement: no ignore glob, and the PID stayed the same across a restart.
- `emitDecoratorMetadata` is not enabled in any tsconfig, so decorator metadata under Bun was not tested.

## Tier 4: client build

- Admin `vue-cli-service build` on Node: 3:36.
- Bun isolated install: fails at once with `Cannot find module '@babel/plugin-transform-runtime'`.
- Hoisted install on Node: works, 3:45.
- Hoisted install with `bun --bun`: fails after 5:21 with two css-loader errors on `url(data:...)` inside third-party CSS.
- Student `bun --bun` build hung at 0% CPU for 28 minutes in fork-ts-checker child processes (killed). Node baseline: 1:43.
- `vue-tsc` under `bun --bun`: admin 36.8 s vs 81.5 s Node, student 5.2 s vs 20.9 s (student runs likely warm). 0 errors.
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
