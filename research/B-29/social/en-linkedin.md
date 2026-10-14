# B-29 LinkedIn (English)

"Should we move to Bun?" is four questions, not one.

Why now: Deno just joined Cloudflare, with its runtime on a one-year maintenance clock and Deploy winding down. The independent-runtime field is down to Node and Bun.

I probed two sibling production monorepos (Express + Mongoose API, Vue client, pnpm, Node 24) for Bun feasibility, on throwaway copies, and measured each tier on its own. The post also opens with what a JavaScript runtime actually is — four layers, and the war is fought on the top ones, not the engine.

What I found:

- Package manager: works. `bun install` read the pnpm lockfile and resolved the exact same packages. It was not faster than a warm pnpm store, though. Default isolated linking broke the Vue build until I used the hoisted linker.
- Script runner: mostly works. Building shared packages dropped from 9.2s to 5.6s, and vue-tsc ran about 2x to 4x faster. Forcing Bun's runtime onto tsc made it slower.
- Server runtime: sharp, puppeteer, Mongoose, BullMQ and socket.io all loaded. But the app exited with code 1 about 30 seconds after the database connection failed, and Node did not. I could not explain it, so I would not ship it.
- Client bundler: Vue CLI under Bun failed or hung. Moving to Vite is worth doing with or without Bun.

My recommendation: adopt Bun as an optional package manager and script launcher, move the client to Vite, and earn the server runtime switch with a soak test.

Single runs, so read the timings as direction. Full write-up with measurements, caveats and references:
https://github.com/Encryptioner/blogs/blob/master/topics/Development/Bun/The%20War%20on%20JavaScript%20Runtimes%20-%20Can%20Bun%20Replace%20Node%20in%20a%20Large%20Production%20Monorepo.md

#Bun #NodeJS #TypeScript #WebDevelopment #SoftwareEngineering

Sources: Bun docs (Node compatibility, lifecycle scripts, isolated installs), Vue CLI, Deno's "Deno is joining Cloudflare" announcement. Full list in the post.
