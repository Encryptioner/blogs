# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal blog and presentation repository containing technical articles on various software engineering topics. Content is organized by topic and published to multiple platforms (DEV Community, Medium, Nerddevs).

## Repository Structure

```
blogs/
├── topics/                   # Blog posts organized by category
│   ├── Node.js/              # Node.js related content
│   ├── Productivity/         # Productivity tips and tools
│   └── Coding Challenges/    # Technical challenges and tutorials
├── presentations/            # Presentation materials
├── nerddevs/                 # Content for Nerddevs platform
├── assets/                   # Blog-specific assets organized by blog number
│   ├── B-6/                  # Assets for blog #6
│   └── B-7/                  # Assets for blog #7
├── INDEX.md                  # Numbered index of all content
└── README.md                 # Main repository overview with links by topic
```

## Content Management

### Blog Organization
- **INDEX.md**: Maintains a numbered list of all blogs and presentations in chronological order
- **README.md**: Groups content by topic with direct links to blog files
- Blog files use descriptive titles as filenames (e.g., `Publishing Your First NPM Package: A Real-World Guide That Actually Helps.md`)

### Asset Management
- Assets are stored in `assets/B-{number}/` directories
- Each blog gets its own folder (B-6, B-7, etc.) for associated images, diagrams, or supplementary files
- Asset folder numbers correspond to the blog number in INDEX.md

### Branch Naming Convention
Branches follow the pattern: `B-{number}/task/{topic}/{brief-description}`
- Example: `B-7/task/v1/publishing-npm-package`
- The number matches the blog number and its assets folder

## Common Workflows

### Listing files — update these for every new blog/deck
The most common slip is registering content in one index and forgetting the others. When adding or renaming content, update **every** applicable listing:

| File | What lives here |
|------|-----------------|
| `INDEX.md` | Master numbered list — `## Blogs` (every new blog gets the next `B-NN`) and `## Presentations` (every new deck gets the next `P-N`) |
| `README.md` | Topic-grouped blog links under `## Topics`, plus an entry under `## Presentations` |
| `presentations/index.html` | The deck gallery hub — add one `.card` per new deck in the right topic group, and bump the `· N decks` count in the topbar to match the card count |
| `presentations/docs/PUBLIC_LINKS.md` | Canonical public URL per deck (`## P-N — Title`) plus its companion blog line. HTML decks use the raw-content proxy URL; markdown decks/blogs use the GitHub blob URL. **This file is the one most often forgotten.** |

When in doubt, grep for the previous deck (e.g. `P-7`) — every file it appears in is a file the new deck must also touch.

### Adding a New Blog Post
1. Determine the next blog number from INDEX.md
2. Create a new branch: `B-{number}/task/{topic}/{slug}` (for presentation/doc work, stay on the current branch unless told otherwise)
3. Write the blog in the appropriate `topics/{category}/` directory
4. Create `assets/B-{number}/` folder for any images or supporting files
5. Register the blog in every applicable listing (see table above): at minimum `INDEX.md` (`## Blogs`) and `README.md` (topic section). If it has a companion deck, also add its line under that deck in `presentations/docs/PUBLIC_LINKS.md`.
6. Start with a cover image and end with the standard closing block (see "Every post: cover and closing block" below).
7. Commit and create a PR to master. After it is on `master`: publish to Substack (`guides/substack/README.md`) and rebuild the site (see "Publishing the site").

### Every post: cover and closing block
- **Cover**: the first image, right under the `# Title`, ~1200×630 (aspect 0.5–2.2), real alt text, **no title baked into its left edge**. It is the card/OG image on the site and the hero on Substack. Make it with `node scripts/substack/substack.mjs cover <B-N> <banner>`. If the post already shows that banner, **replace** it, never add a second copy.
- **Never repeat a picture** in a post (same file, or identical bytes under another name). `substack.mjs check` flags it.
- **Images must be pushed to `master` before publishing**: Substack posts load them from `cdn.jsdelivr.net/gh/Encryptioner/blogs@master/…` (a CDN that serves this repo). Renaming or deleting a pushed image breaks live Substack posts.
- **Closing block**: end with `## Let's Connect` (link list), then this callout exactly, so every platform shows the same text:

```
> **Stay in touch.** Get new posts in your inbox: [subscribe to my newsletter on Substack](https://ankurmursalin.substack.com/).
>
> **Support my work.** If this helped, you can [support me on SupportKori](https://www.supportkori.com/mirmursalinankur). Thank you.
```
- **Tone**: write like the author, plainly. No emoji decoration, badges or stock "AI" flourishes in post copy or callouts.
- **Show content changes to the owner before publishing** anywhere; publishing is a separate, confirmed step.

### Adding a New Presentation Deck
1. Determine the next deck number (`P-N`) from INDEX.md (`## Presentations`)
2. Stay on the current branch unless told otherwise
3. Create the deck under `presentations/P-N-{slug}/` — HTML deck → `index.html`, markdown deck → `index.md`. HTML decks MUST: load `deck.js`/CSS from jsDelivr (never `raw.githubusercontent.com` — MIME/nosniff blocks it), include a favicon, and let `deck.js` wire the `.fig img` lightbox via event delegation (never add inline `onclick="openLightbox(this)"` — it throws, the function is closure-local).
4. Create `assets/B-{number}/` if the deck or its companion blog needs images.
5. Register the deck in **every** listing (see table above): `INDEX.md` (`## Presentations`), `README.md` (`## Presentations`), `presentations/index.html` (a `.card` + bump the deck count), and `presentations/docs/PUBLIC_LINKS.md` (a `## P-N — Title` section with the deck URL + companion blog line).
6. Commit and create a PR to master
7. To preview an HTML deck locally: see `presentations/docs/CHECKLIST.md` §7 (Local testing workflow)

### Updating Existing Content
- Blog posts may have multiple versions (v1, v2) as indicated in filenames
- When creating revised versions, keep previous versions for reference
- If a title changes, update **every** listing that names it — `INDEX.md`, `README.md`, `presentations/docs/PUBLIC_LINKS.md`, and any deck card text in `presentations/index.html`
- A version claim (e.g. the P-5 hub "through vX" badge) is a *coverage* signal, not a "latest tag" counter — bump it only when a new version's features actually land in a deck

### Publishing Platforms & Requirements
Content from this repository is published to:
- DEV Community (https://dev.to/mir_mursalin_ankur)
- Medium (https://mir-mursalin-ankur.medium.com/)
- Nerddevs (https://nerddevs.com/author/ankur/)
- Substack (https://ankurmursalin.substack.com/) — all blogs B-1..B-28; workflow, scripts and brand kit in `guides/substack/README.md`. Markdown is the single source: no Substack-only edits in the converter. Check with `node scripts/substack/substack.mjs check <B-N|all>`, push with `push <B-N>`; a live post only changes after re-publishing (the CLI does it); never email subscribers unless asked (`--send-email`). Tables become list rows (Substack has none).

### Publishing the site
The public site (https://encryptioner.github.io/blogs/, served from `docs/`) is generated; never edit `docs/` by hand. After blog content (`topics/`, `presentations/`, `assets/`) is merged to `master`:
```bash
cd ../various-projects/blogs-and-presentations
pnpm site:publish --dry-run   # sync, verify, build, nothing written
pnpm site:publish             # replaces docs/, commits "chore(site): rebuild", pushes the current branch
```
It refuses to run on a dirty blogs tree. Docs-only changes (`guides/`, `scripts/`, `CLAUDE.md`) need no rebuild.

### Accessibility Rules (enforce on every post)
- **No `#` (h1) in post body** — the title is already h1. Start sections at `##` (h2), nest with `###`/`####`. Never skip levels.
- **First image = post cover** (right under the title): ~1200×630, aspect 0.5–2.2, no title baked in at the left edge — it drives the site card, social/OG image and the Substack hero. Details: `guides/substack/README.md`
- **Every image needs meaningful alt text** — `![Description of content](path)` not `![](path)`. Screen readers read this aloud.
- Full reference: `guides/editor-guide.md`

### Diagrams (blogs and decks)
- Prefer a mermaid diagram over prose for a non-trivial flow, state machine, or sequence — one per genuinely distinct concept, not one per sentence.
- Pipeline: write mermaid source as `.mmd` → `scripts/render-mermaid.sh <input.mmd> assets/B-NN/<name>` → embed the resulting `.png` (not `.svg`) in both the blog and its companion deck, same file, same path.
- **Default theme is light** — blog markdown renders on GitHub/dev.to/Medium, none of them under this repo's control, and a dark diagram is invisible on a page you don't control. Only use `--dark` for an asset that will never appear in a blog post.
- A hand-designed (non-mermaid) SVG still gets a PNG via `scripts/svg-to-png.sh` instead.
- Full reference: `guides/diagrams-guide.md`

## File Naming Conventions
- Use descriptive, human-readable filenames for blog posts
- Preserve exact titles including special characters (emojis, punctuation)
- Spaces in filenames are acceptable and used throughout the repository
- Version indicators (v1, v2) are appended to distinguish iterations

## Development Notes
- This is a content-only repository — no build process, tests, or package.json to manage. `scripts/` holds a couple of small, dependency-free helper scripts (diagram rendering) invoked via `npx`, not a build pipeline.
- All content is in Markdown format
- Before publishing, verify heading hierarchy and alt text per `guides/editor-guide.md`

