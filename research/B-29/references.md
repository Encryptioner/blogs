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

## Own measurements

Bun 1.3.10 on Node 24 / pnpm 10, Apple-silicon laptop class, single runs, cold and warm cache as noted in `research.md`. Commands used: `bun install`, `bun install --linker hoisted`, `bun run --filter`, `bun --bun x vitest`, `bun --bun x vue-tsc`, `bun dist/bin/www.js`.

## Dropped

A community-forum thread returned by the search was about an unrelated product and is not used.

## Lead, not a source

The idea originated from an AI-assistant answer about Bun vs Node. It is not cited.
