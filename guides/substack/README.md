# Substack publishing guide

Publication: https://ankurmursalin.substack.com/ · profile: https://substack.com/@ankurmursalin

Substack has no markdown import and no public write API. `scripts/substack/` converts this repo's markdown into
Substack's native editor format and saves it through the same session API the editor uses, so the post looks
native (real headings, lists, code blocks, images), not pasted.

| What | Where |
|---|---|
| **CLI: lint / create / update / publish** | `scripts/substack/substack.mjs` |
| Markdown → Substack converter (library) | `scripts/substack/md-to-substack.mjs` |
| Blog → Substack post id (machine-readable) | `scripts/substack/post-ids.json` |
| Blog → id + URL (human) | `guides/substack/published-posts.md` |
| Browser-console fallback + brand/About/bio scripts | `scripts/substack/publish.browser.js`, `brand.browser.js` |
| Brand assets | `assets/brand/` |
| Everything done on 2026-10-07, in order | `guides/substack/session-log.md` |

## 1. Write markdown that looks good on Substack

Follow `CLAUDE.md` (accessibility rules) plus these Substack-specific points. `check` (below) flags most of them.

| Do | Why |
|---|---|
| `# Title` once at the top, then `##` / `###` / `####` | The title becomes the Substack title; body headings are clamped to h2–h4. Never skip levels. |
| **First paragraph = a real hook, 40–170 chars+** | It is the subtitle and the email/preview text (cut at 170 chars on a word boundary). Don't open with an image or a badge line. |
| Every image has alt text and lives under `assets/B-NN/` **pushed to `master`** | Images are referenced as `cdn.jsdelivr.net/gh/Encryptioner/blogs@master/…`; unpushed = 404. The first image becomes the post thumbnail on the homepage and in cards, so make it the best one. |
| Prefer PNG diagrams (see `guides/diagrams-guide.md`), light theme | Substack's site is light by default; a dark diagram on white looks like a hole. Wide diagrams (≥1200px) are fine, they scale down. |
| Tag every code fence (`ts`, `bash`, `json`, `text` for ASCII diagrams) | Consistent monospace rendering. Keep lines ≤100 cols; Substack code blocks scroll sideways on phones. |
| Tables: keep cells short; first column = the row's name | Substack has **no table support** (its editor silently drops a table node). Default **list style**: 2-column tables → `• **term** — value`; 3+ columns → a bold row title with one sub-bullet per column (*Header:* value). Posts that also exist on DEV get a closing line linking to the DEV version, where tables render natively. Image style is an opt-in (see *Tables* below). |
| Plain inline formatting only: bold, italic, `code`, links, strikethrough | Bold/links inside `` `code` `` are dropped (the editor forbids mixing `code` with other marks). |
| End every post with the standard **Let's Connect** block: link list, then the *Stay in touch / Support my work* callout (blockquote, no emoji) | Same text on every platform, so Substack needs no special handling. The callout lives in the markdown of each blog; copy it from any recent post (e.g. B-16). |
| Keep titles ≤ 100 chars | Email subject lines get cut. |
| No raw HTML except `<img>` | Everything else is dropped (e.g. `<div align=center>`, `<details>`). |

What does **not** carry over: HTML embeds/iframes, footnotes, task-list checkboxes, mermaid fences (render to PNG first), front matter.

## 2. Setup (once per machine)

```bash
npm i --prefix /tmp/mdit markdown-it                 # converter dependency (repo stays dependency-free)
export MDIT=/tmp/mdit/node_modules/markdown-it
# auth, push only: value of the `substack.sid` cookie from a logged-in browser
#   DevTools → Application → Cookies → https://substack.com → substack.sid
export SUBSTACK_SID='…'                              # a password: shell env only, never commit/log it
```

## 3. Publish or update a blog

```bash
node scripts/substack/substack.mjs check 29                 # lint (also HEADs every image URL)
node scripts/substack/substack.mjs push  29 --dry-run       # what would happen, no changes
node scripts/substack/substack.mjs push  29                 # create draft (or update existing) — NOT live
# open the printed /publish/post/<id> link, look at it in Preview (desktop + phone), then:
node scripts/substack/substack.mjs push  29 --publish       # go live, no email
node scripts/substack/substack.mjs push  29 --publish --send-email   # only if you want subscribers emailed
node scripts/substack/substack.mjs status                   # which blogs are on Substack
```

- **New blog**: add it to `INDEX.md` first (that is the list the script reads), `push` it, then add the row to
  `guides/substack/published-posts.md`. `post-ids.json` is updated automatically.
- **Updating a live post**: edit the markdown, `push <N>`; a live post is updated in place (same URL).
  Substack re-renders immediately; visitors may see the old version for a few minutes (cache).
- **Everything**: `push all` re-syncs all 28 (≈1.5s each).
- Order matters for the homepage: publish oldest first so the newest ends on top.
- Series with a companion deck (`P-N`): Substack takes no slide decks; link the deck's public URL
  (`presentations/docs/PUBLIC_LINKS.md`) in the post body.

### Exit codes / safety
`push` refuses to run when `check` reports **errors** (unreachable image). It never publishes without `--publish`
and never emails without `--send-email`.

### No cookie handy? Browser fallback
Run the converter (`node scripts/substack/md-to-substack.mjs all /tmp/posts.json`), open the publish dashboard
logged in, and use `scripts/substack/publish.browser.js` (instructions in its header). With the chrome-devtools
MCP the JSON is handed to the page through an injected `<input type=file>` + `upload_file`
(path must be inside the workspace → copy to the repo root; `*.tmp.json` is git-ignored; delete after).

## 4. Verify after posting (do all four)

1. **Editor loads** — open `/publish/post/<id>`; "Something has gone wrong…" = invalid doc (see Pitfalls).
2. **Preview** (editor top-right; for a live post, check the public URL, not the editor) on desktop and a phone width: headings, code blocks, images, lists.
3. **As a visitor** — logged-out window, public URL with `?nocache=1`: <https://ankurmursalin.substack.com/p/<slug>>.
4. **Dark** — the Substack app/reader (substack.com) follows dark mode; the subdomain site stays light. Code blocks and
   diagrams with transparent backgrounds are the usual victims; use opaque light backgrounds on diagrams.

## 5. Pitfalls (all hit during the first publish)

- **"Something has gone wrong. Please refresh the page…" in the editor** = tiptap `Invalid JSON content` (see the
  browser console). The API saves it anyway; only the editor chokes. Valid set used by the converter:
  - nodes: `paragraph heading(level 2-4) bulletList orderedList listItem blockquote codeBlock horizontalRule hardBreak captionedImage>image2`
  - marks: `bold italic strikethrough code link`
  - rejected: `strong em code_block bullet_list list_item hard_break horizontal_rule`
  - `code` cannot be combined with any other mark.
- API 400 `draft_bylines Invalid value` → byline `[{id: <user id>, is_guest: false}]` is required (the script does it).
- API 403 / "Not authorized" → `SUBSTACK_SID` missing, expired (log in again) or for another publication.
- **Edits to a live post only show after re-publishing.** `PUT /api/v1/drafts/:id` changes the draft copy; the public page
  updates on `POST /api/v1/drafts/:id/publish` (`send:false`). The CLI does this automatically; the first table fix
  looked "not applied" for exactly this reason.
- Do not add Substack-only text in the converter; the markdown is the single source (an earlier CTA injection and a DEV-link footer were removed for that reason).
- Tables: a monospace block showed raw `**` markdown and overflowed phones, so it is not used. Default = list style.

### Tables (decision: list style now, image kept as an option)
| Flag | Result |
|---|---|
| `--tables=list` (**default**) | list rows (above) + closing "read it on DEV" link when the post exists on dev.to |
| `--tables=image` | every table rendered as a PNG (headless Chrome → ImageMagick trim), uploaded to Substack's image store, alt text = the table's text |
| `--tables=auto` | lists + DEV link where a DEV copy exists, images for the rest |

Image mode needs Chrome (or `CHROME=/path`) and `magick`; PNGs are cached in `.cache/substack/tables/` (git-ignored, safe
to delete) and re-used. Trade-offs: images look like a markdown-preview table but are not selectable/searchable, are white
boxes in the dark reader, and shrink on phones (wide tables get small; tap to zoom). Switching later = run
`push all --tables=image` (or per post `push 16 --tables=image`); nothing else changes.
- `send:false` on publish — otherwise every post emails all subscribers.
- `homepage_type` can't be changed via `PUT /api/v1/publication` (400); use the Website editor.
- Check the public site logged out (`?nocache=N`); visitor pages are cached for minutes.

## 6. Brand kit

Matches the blog site (`docs/favicon.svg`): "Ankur's Writing".

| Token | Value |
|---|---|
| Mint (primary) | `#00e3a8` → `#00996d` gradient |
| Ink | `#06231b` |
| Paper | `#fcfcfb` |
| Amber accent | `#f2b84b` |
| Substack accent (`theme_var_background_pop`) | `#008A63` (~4.3:1 on white **and** near-black; `#00996D`/`#00e3a8` fail one theme) |
| Type | Substack "SF Pro" (Website editor) |
| Tagline | AI-assisted dev workflows · architecture · tools I build |

Assets: `assets/brand/logo-square.{svg,png}` (1024², the only one in use). `cover.{svg,png}` is kept for reference but
**not applied**: Substack shows the cover as a wide strip on the visitor subscribe overlay and it read as an odd
long empty logo bar. Edit the SVG, then `bash scripts/svg-to-png.sh -f -w 1024 assets/brand/logo-square.svg` and re-run
`applyBrand()` (`scripts/substack/brand.browser.js`).

### Light and dark themes

Substack's public site (`*.substack.com`) is light and ignores the OS `prefers-color-scheme`; the Substack app/reader
(substack.com) follows dark mode. Rules that keep it good in both:
- Header = **square logo + publication name as live text** (Substack themes the text). No wide logo, no text baked into
  images: it can't follow the theme and gets cropped on phones. `logo_url_wide: null`.
- Square mark is a full-bleed mint tile with an ink letter: readable on white and on near-black.
- **No cover photo** (`cover_photo_url: null`); a mostly-empty banner looked wrong on the visitor overlay. If wanted
  later: full-bleed, text-free, checked as a visitor.
- One accent with ~4.3:1 contrast on both backgrounds.

Applied (see `session-log.md`): Website editor Theme **Custom** (header Standard, hero Feature, white background,
accent `#008A63`), nav Home / Notes / Archive / About, rewritten About page, shortened profile bio.

### Manual steps (not available through the API)
- Website editor: fonts (currently SF Pro), extra nav items (GitHub, dev.to). Hero styles Newspaper/Highlight/Magazine
  are image-heavy and crop the wide diagrams — Feature is the least bad; "Cropping" only offers Center/Smart.
- Custom domain (Settings → Publication details), e.g. `writing.<yourdomain>`.
- Enable 2FA (dashboard banner).
- Publisher agreement "I agree": Dashboard → Revenue → Payments. Only needed for paid subscriptions.
