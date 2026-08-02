# Presentation Deck Checklist

Process doc: what to check every time a deck is **added, updated for a new
feature, or touched for mobile/PPT-mode work**. `README.md` in this folder is
the technical reference (the `Deck.mount()` API); this file is the checklist
that says *when* and *why* to reach for each part of it.

## 1. Every deck HTML file must have

- **Favicon.** `<link rel="icon">` right after `<title>`, inline data-URI SVG,
  single emoji matching the deck's core metaphor. Never ship a deck without
  one — the browser falls back to a 404'd `/favicon.ico` (console error).
- **Shared assets loaded from jsDelivr, never `raw.githubusercontent.com`:**
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Encryptioner/blogs@master/presentations/assets/css/deck-chrome.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Encryptioner/blogs@master/presentations/assets/css/deck-mobile.css">
  <script src="https://cdn.jsdelivr.net/gh/Encryptioner/blogs@master/presentations/assets/js/deck.js"></script>
  ```
  `raw.githubusercontent.com` serves `.js`/`.css` as `text/plain` with
  `nosniff` — the browser silently refuses to execute/apply them. Only
  `cdn.jsdelivr.net/gh/<user>/<repo>@<branch>/<path>` serves the correct MIME
  type. This repo has no real hosting (markdown-content-only), so the *only*
  way a deck is viewed live is through the `encryptioner.github.io/public-websites/any-page/`
  raw-content proxy — see §3 for what that proxy does to script execution.

## 2. PPT-mode options — what "all options" means

The shared engine (`deck.js`) supports, per deck, via `Deck.mount({...})`:
prev/next, overview grid, go-to-slide, help overlay, blackout, notes,
core-mode, lightbox, fullscreen. Not every deck needs every option — decide
per deck, don't cargo-cult the full set:

| Option | Wire it when | Skip when |
|---|---|---|
| prev/next, overview, fullscreen, lightbox | Always | — |
| goto (`G`), help (`?`), blackout (`B`) | The deck is meant to be presented standalone (a full "PPT-parity" ask) | Never really — cheap to add, shared CSS (`.dk-goto`/`.dk-help`/`#dk-blackout`) already ships in `deck-chrome.css` |
| notes (`S`) | The deck's slides actually carry `<aside data-notes>` speaker-note content | No notes content exists — wiring the toggle with nothing behind it just opens an empty panel |
| core mode | The deck has a "short version" cut (`data-core` on a subset of slides) | Single-length decks |

Adding goto/help/blackout to a deck is a **markup-only change** — the JS/CSS
support already exists in `deck.js`/`deck-chrome.css`. Per deck you need:
1. Two buttons in `.dk-nav`: `<button data-dk="goto">#</button>` and
   `<button data-dk="help">?</button>` (blackout has no button, `B` only).
2. Two overlay `<div>`s (`.dk-goto#gotoOverlay`, `.dk-help#helpOverlay`) —
   copy the pattern from an existing wired deck, update the slide-count
   placeholder and the keyboard table to match what's actually enabled.
3. `goto: {overlay:'#gotoOverlay', input:'#gotoInput'}, help: {overlay:'#helpOverlay'}, blackout: true`
   in the `Deck.mount()` call.

## 3. The any-page proxy is not a normal browsing context

The proxy (`public-websites/any-page/viewer.js`) fetches the raw file and
injects it into a `srcdoc` iframe **sandboxed without `allow-same-origin`**.
This has two consequences that don't show up in normal local testing:

- **`location.href` reads `about:srcdoc`, always** — any code that branches
  on "am I being viewed through the proxy?" must NOT check `location.href`.
  Check `document.baseURI` instead — the proxy injects a `<base href="https://raw.githubusercontent.com/.../">`
  tag before setting `srcdoc`, and `document.baseURI` reflects that even
  though the document's own origin stays opaque. (`document.baseURI.indexOf('raw.githubusercontent.com') !== -1`.)
- **`history.pushState`/`replaceState` throws `SecurityError`** if the URL
  resolves (via that same `<base>` tag) to a different origin than the
  document's own opaque one. Any deck code that calls these (`deck.js`'s
  `show()` does, for `cfg.hash`) **must wrap the call in try/catch** — an
  uncaught throw here kills the rest of that `<script>` block, including
  anything after it (e.g. a link-rewrite running in the same tag).

**Cross-deck navigation links** (next-deck, "back to all decks", "restart")
are plain anchors with the resolved proxy URL hardcoded directly — the same
`https://encryptioner.github.io/public-websites/any-page/#raw.githubusercontent.com/...`
form the hub (`index.html`) uses and `LINKS.md` lists. Always pair with
`target="_blank" rel="noopener"` (the proxy sandbox grants `allow-popups
allow-popups-to-escape-sandbox`, so new-tab opens work):
```html
<a class="primary" href="https://encryptioner.github.io/public-websites/any-page/#raw.githubusercontent.com/Encryptioner/blogs/refs/heads/master/presentations/P-5-branchdiff-features/02-local-first-privacy.html" target="_blank" rel="noopener">Next deck → 02 · ...</a>
```
Hardcoded, not JS-rewritten, because link correctness must not depend on
`deck.js` loading inside the proxy's opaque-origin `srcdoc` sandbox. An
earlier `href="PROXY:file"` + runtime JS-rewrite scheme rewrote hrefs in the
*same* inline `<script>` as `Deck.mount()`; if the external `deck.js` didn't
execute in the sandbox, `Deck` was undefined → `Deck.mount()` threw → the
block died before the rewriter ran → href stayed `PROXY:file` → the browser
parsed a `proxy:` scheme → dead link. A hardcoded absolute URL is
context-blind (local, proxied, or shared — all identical) and needs zero JS.
Add a new deck's links by copying the pattern from `LINKS.md` (or a sibling
deck); never reintroduce the `PROXY:` prefix.

## 4. Mobile / responsive

- `deck-mobile.css`'s `100dvh` fix uses `!important` deliberately — a deck's
  own inline `<style>` loads after it and would otherwise redeclare plain
  `100vh`/`100%` at equal specificity and silently win by source order.
- Chrome DevTools device emulation does **not** simulate the real
  address-bar show/hide that `vh` vs `dvh` differ on — a fix that passes
  DevTools mobile checks can still be broken on a real phone. Report DevTools
  verification as "no overflow reproduced in emulation," not "confirmed
  fixed on mobile."
- Fluid decks (no fixed `canvas`) auto-fit via `deck.js`'s `fitFluidSlide` —
  it scales the whole slide down if content overflows the viewport. This is
  a safety net, not a license to overflow by design (see §5).

## 5. Slide overflow: split, don't shrink

If new content pushes a slide past the fold: first try trimming genuinely
non-essential filler; if still too tall, **split into a new slide** — don't
shrink font size or images as the primary fix, and don't cram tighter
margins. This deck's house style already asked for large, legible,
from-a-distance text; shrinking to fix overflow undoes that. Only shrink
globally (one root font-size lever, applied to every slide) and only with
explicit sign-off — never a per-slide inline override.

## 6. Keeping deck content in sync with the source project

When a deck documents a live project (e.g. Branchdiff) and that project
ships new user-facing behavior:
1. Check the project's own release notes / changelog for what's new since
   the deck's last "coverage through vX.Y.Z" line (see `index.md`'s
   feature-mapping table for this deck family).
2. Only add slide content for **user-facing behavior changes** — new flags,
   new defaults, new gates — not internal refactors, file moves, or test
   additions.
3. Get exact mechanics from the source code before writing deck copy (e.g.
   "severity levels 1–5" needed reading `review-verdict.ts`'s
   `SEVERITY_RANK`/`gateTags` to state the level→tag mapping correctly,
   rather than guessing from a changelog's one example).
4. If a genuinely new concept needs its own slide, insert it and renumber
   every subsequent slide's `slide-num` label + the goto overlay's
   placeholder `1-N` — the total slide count is picked up dynamically by
   `deck.js`, only the two hardcoded text spots need manual updates.
5. Update `index.md`'s "Feature → deck mapping" and per-deck "Features:"
   bullet list to match, so the spec doc doesn't drift from the shipped deck.

## 7. Local testing workflow

Absolute jsDelivr URLs mean a straight local double-click or `file://` open
still fetches the *live* CDN copy of `deck.js`/CSS — defeating local
iteration on those shared files. To test a shared-asset change before
pushing: temporarily swap the `cdn.jsdelivr.net/.../presentations/assets/`
prefix to a relative `../assets/` path, serve locally (`python3 -m http.server`
from `presentations/`, not the deck's own subfolder, so the relative path
resolves), test, then **swap back to the absolute jsDelivr URL before
committing** — never commit the relative-path version.

After pushing a shared-asset fix, jsDelivr's `@master`-branch cache can serve
the stale pre-fix file for a while. Purge it per changed file:
```
https://purge.jsdelivr.net/gh/Encryptioner/blogs@master/<path>
```
