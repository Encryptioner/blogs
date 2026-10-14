# B-29 References

All accessed 2026-10-13. "Primary" = official docs. "Secondary" = community write-up or forum thread, used only to corroborate a symptom seen in our own measurements.

| # | Title | URL | Type | Supports |
|---|-------|-----|------|----------|
| 1 | Bun: Node.js compatibility | https://bun.com/docs/runtime/nodejs-compat | Primary | Which Node APIs and modules Bun implements |
| 2 | Bun: Watch mode | https://bun.com/docs/runtime/watch-mode | Primary | `--watch` and `--hot` behaviour vs nodemon |
| 3 | Bun: Run Bun as a daemon with PM2 | https://bun.com/docs/guides/ecosystem/pm2 | Primary | PM2 `interpreter: bun` |
| 4 | Bun: Containerize with Docker | https://bun.com/docs/guides/ecosystem/docker | Primary | Basic `oven/bun` image (no native-module guidance) |
| 5 | Bun: Lifecycle scripts | https://bun.com/docs/install/lifecycle | Primary | `trustedDependencies` and default trusted list |
| 6 | Bun: Lockfile | https://bun.com/docs/install/lockfile | Primary | Migrating from `pnpm-lock.yaml` |
| 7 | Bun: Isolated installs | https://bun.com/docs/install/isolated | Primary | Default linker, and the hoisted alternative |
| 8 | Bun: TypeScript | https://bun.com/docs/runtime/typescript | Primary | Running `.ts` directly, tsconfig handling |
| 9 | Vue CLI | https://cli.vuejs.org/ | Primary | Maintenance-mode notice, Vite as the recommended path |
| 10 | Why Mongoose crashes in Bun and how to fix the v8 startupSnapshot bug (Medium) | https://medium.com/@zehan9211/why-mongoose-crashes-in-bun-and-how-to-fix-the-v8-startupsnapshot-bug-d8eb5e5ef385 | Secondary | Same `node:v8` snapshot gap we hit. Site blocks bots (HTTP 403), not re-read |
| 11 | Functions throwing NotImplementedError (Railway Station) | https://station.railway.com/questions/functions-throwing-not-implemented-error-eefb43c4 | Secondary | Same `NotImplementedError` reported by another user |
| 12 | Deno is joining Cloudflare (Deno blog) | https://deno.com/blog/cloudflare | Primary | News hook: Deno joins Cloudflare, ~1 year of runtime maintenance releases, Deploy winds down. Accessed 2026-10-14 (others 2026-10-13) |
| 13 | Deno 1.0 (Deno blog) | https://deno.com/blog/v1 | Primary | 2020 launch, clean-slate rethink from Node's original author, no npm. Accessed 2026-10-14 |
| 14 | Announcing Deno 2 (Deno blog) | https://deno.com/blog/v2.0 | Primary | 2024-10-09, full Node/npm backwards compatibility — the founding bet reversed. Accessed 2026-10-14 |
| 15 | About Node.js (nodejs.org) | https://nodejs.org/en/about | Primary | Node embeds V8; non-blocking event-driven I/O. Runtime anatomy layer 1/3. Accessed 2026-10-14 |
| 16 | libuv | https://libuv.org | Primary | The cross-platform async I/O library powering Node's event loop (layer 3). Accessed 2026-10-14 |
| 17 | Bun 1.0 (Bun blog) | https://bun.com/blog/bun-v1.0 | Primary | Zig + JavaScriptCore instead of Rust/V8; Node-compatible from day one (layers 1, 2, 4). Accessed 2026-10-14 |
| 18 | Announcing Stable V8 Bindings for Rust (Deno blog) | https://deno.com/blog/rusty-v8-stabilized | Primary | Deno written in Rust on Rusty V8 bindings (layers 1, 2). Accessed 2026-10-14 |
| 19 | Rewriting Bun in Rust (Bun blog) | https://bun.com/blog/bun-in-rust | Primary | Bun v1.4.0 (2026-05): ~535K lines Zig → Rust; last Zig = 1.3.14; JavaScriptCore and other C/C++ libs stay; release channels stable + canary, no LTS. Layers 2, 3. Accessed 2026-10-14 |
| 20 | Stability and releases (Deno docs) | https://docs.deno.com/runtime/fundamentals/stability_and_releases | Primary | Deno channels: stable minor every 12 weeks, LTS since 2.1 (~6 months of backported fixes, ended 2026-04-30), canary per commit. Accessed 2026-10-14 |
| 21 | Previous releases (nodejs.org) | https://nodejs.org/en/about/previous-releases | Primary | Node: major every 6 months; even-numbered October lines become LTS with 30 months total support; odd lines ~6 months, never LTS. Accessed 2026-10-14 |

## Own measurements

Bun 1.3.10 on Node 24 / pnpm 10, single runs, cold and warm cache as noted in `research.md`. Commands used: `bun install`, `bun install --linker hoisted`, `bun run --filter`, `bun --bun x vitest`, `bun --bun x vue-tsc`, `bun dist/bin/www.js`.

## Dropped

A community-forum thread returned by the search was about an unrelated product and is not used.

## Lead, not a source

The idea originated from an AI-assistant answer about Bun vs Node. It is not cited.
