# B-29 Deck Brief: P-12 — The War on JavaScript Runtimes

Source: the blog (B-29), not the raw research. Engine: standard HTML deck (`deck.js` + chrome CSS from jsDelivr, P-9 pattern). Accent: amber (Bun) vs mint (Node baseline / verified), violet for Deno/news/mechanism. Figures reuse `assets/B-29/tier-ladder.png`, `assets/B-29/migration-path.png`, and `assets/B-29/runtime-anatomy.png` (LR strip) by relative path. Folder: `presentations/P-12-runtime-war/`.

Framing (references 12–14): slides 02–03 open with the runtime-anatomy deep-dive — four layers, "Node compatibility" is a layer-4 property (refs 15–18) — then slide 04 covers the three-way war: Node the incumbent, Deno the 2020 clean slate that reversed into npm compat (Deno 2, 2024) and then joined Cloudflare on 2026-10-09, Bun compat-first since 2022 — and why compatibility beat the clean slate. The blog's "What Is a JavaScript Runtime, Exactly?" and "The War So Far" sections are the long form. The field report then measures the two left standing.

## Slide order

| # | Slide | Content | Notes |
|---|-------|---------|-------|
| 01 | Hero | Title, verdict subtitle, pills (Bun 1.3.10 / Node 24 / pnpm 10 / 2 monorepos / 4 tiers), link to post | Hook: "Bun is not one decision. It is four." |
| 02 | What a runtime is | `runtime-anatomy.png` (LR strip) + callout: engine is a solved problem; compatibility is a layer-4 property | The technical deep-dive before the war; refs 15–18 land on slide 03 |
| 03 | Same anatomy, three builds | Layer × runtime table: engine V8/V8/JavaScriptCore, bindings C++/Rust/Zig, loop libuv/own/own, modules npm/URL-first→npm/npm-compat | Rows 3–4 are where the runtimes actually differ |
| 04 | The war so far | Three-col Node (2009) / Deno (2020, exited 2026) / Bun (2022), refs 12–14 + violet callout: compatibility beat the clean slate | Deno gets real presence before the matchup is measured |
| 05 | One question, four decisions | Why one-word answers fail; verdict strip per tier (yes / yes, with caveats / not yet / no) | Set the frame before any data |
| 06 | The case study | Two sibling pnpm monorepos, 5 packages each, stack table, baseline | Name the honesty caveats up front: throwaway copies, dummy config, no reachable DB/Redis, single runs = direction |
| 07 | The four tiers | `tier-ladder.png` | Each tier adopted or rejected on its own |
| 08 | Tier 1 — install timings | pnpm vs bun table (warm/cold/hoisted) | Punchline: on a warm pnpm store, Bun was not faster |
| 09 | Tier 1 — beyond speed | `trustedDependencies` vs `onlyBuiltDependencies`; isolated linker vs `shamefully-hoist`; the Babel-plugin failure | Two config truths matter more than the timings |
| 10 | Tier 2 — launch vs force | Wins (shared builds 9.2→5.6 s, vue-tsc 2–4×) vs losses (tsc 46.7→86.8 s, vitest bson fail, `bun test` hang) | Pattern: launching tools is safe; forcing the runtime is where surprises start |
| 11 | The `node:v8` gap | `NotImplementedError: isBuildingSnapshot`; bson 7.3.3 vs 7.2.0; a dependency bump can flip it | Pin `bson`; community reports corroborate. Code block wraps on phones, scrolls on desktop |
| 12 | Tier 3 — what worked | Boots to connect stage; probe grid: sharp, puppeteer, Mongoose, mongodb, BullMQ, ioredis, socket.io, module-alias | |
| 13 | Tier 3 — the red flag | Exit code 1, 30–40 s after DB connection fails; Node stays alive; unexplained; plus watch/PM2 caveats | "Cheap to find in a probe, expensive to production" |
| 14 | Tier 4 — client build falls over | Result table: Node 3:36 OK; isolated: instant Babel fail; hoisted + `--bun`: 5:21 CSS fail; Repo B: 28-min hang vs 1:43 | |
| 15 | The real client fix is Vite | Vue CLI is maintenance mode; 3–6 days per client (estimate) | Do it for its own reasons, then ask what Bun adds |
| 16 | What would bite you | Checklist: native modules, hidden hoisting, Node API gaps, `.env` autoload (`NODE_ENV=production` in CI), memory flags, docs gaps | |
| 17 | The phased path | `migration-path.png` + 4 steps, each with rollback | Rollback is the design, not an afterthought |
| 18 | When (not) to migrate | Stay-vs-go boxes | Migrate on a concrete payoff, not the hype |
| 19 | Verify next + verdict | Follow-ups checklist; "I would not switch the production runtime today" | |
| 20 | References | Condensed mirror of the blog's 18 references | |
| 21 | End | Links: full post, Bun docs, Vite, back to all decks | |

## Sanitization

Same rule as the blog: repos are "Repo A (larger)" / "Repo B (smaller)", no product, project, company, device, or personal names anywhere in the deck.
