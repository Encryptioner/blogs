# Presentation Shared Assets

One slide-deck **engine** + shared **chrome** used by every HTML presentation in
`presentations/`. Each deck keeps its own theme tokens + slide content; the
interaction layer (navigation, keyboard, swipe, lightbox, overview, fullscreen)
lives here once.

```
presentations/assets/
├── js/
│   └── deck.js              # the engine — Deck.mount({...})
├── css/
│   ├── deck-chrome.css      # shared controls (nav, lightbox, overview) — theme-agnostic via --dk-*
│   ├── deck-mobile.css      # mobile + rotation UX (scoped to body.dk-* classes; desktop untouched)
│   └── branchdiff.css       # Branchdiff feature decks: slide layout + GitHub-dark/neon-mint theme
├── LINKS.md                 # public URL for every presentation (markdown + HTML decks)
├── Checklist.md             # checklist: favicon, PPT-options, proxy gotchas, mobile, feature-sync
└── README.md                # this file
```

Adding a deck, updating one for a new PPT option, or syncing a deck with a
new project feature? Read [`Checklist.md`](./Checklist.md) first — it's the
process checklist; this file is the API reference.

Public path for every presentation (markdown blob link or raw-content proxy
link, per format) is documented in [`LINKS.md`](./LINKS.md).

## Decks wired in

| Deck | Engine | Canvas | Slide sel | Extra features |
|------|--------|--------|-----------|----------------|
| Token Economics | `deck.js` | fluid (`vw`/`clamp`) | `.slide` | core-mode, overview, goto, lightbox |
| Many Accounts… | `deck.js` | fixed 1280×720 + `fitStage` | `.deck-slide` | goto, notes, blackout, help, lightbox |
| Branchdiff 01–07 | `deck.js` | fluid (`vw`/`clamp`) | `.slide` | overview, lightbox + proxy link-rewrite |

## `Deck.mount(config)` — the API

Load `deck.js` in `<head>` (no `defer` — it must be defined before the inline
mount call at end of `<body>`), then:

```html
<script>
Deck.mount({
  slide:   '.slide',            // slide selector
  reveal:  'attr',              // 'attr' (data-active + data-state="prev") | 'class' (.active/.prev)
  canvas:  null,                // null = fluid | {w:1280,h:720} = fixed canvas scaled by fitStage
  stage:   '#stageWrap',        // required when canvas is fixed
  viewport:'#viewport',         // click-advance + swipe target (default: document)
  progress:'#progress', curNum:'#curNum', totalNum:'#totalNum',
  counter: '#counter', curTitle:'#curTitle',
  hash: true, clickAdvance: true, swipe: true,
  ignoreClick: 'a,button,...',  // don't advance when clicking these
  lightbox: { toggle: 'attr' },        // 'attr' (data-open) | 'class' (.open) | null
  overview: { titleSelector: 'h3.section,h1.title' },   // null disables
  core:    { attr:'data-core', param:'mode', label:'12-min' },  // null disables
  goto:    { overlay:'#gotoOverlay', input:'#gotoInput' },      // null disables
  notes:   { toggle:'#notesToggle', cls:'notes-mode' },         // null disables
  blackout: true, help: { overlay:'#helpOverlay' },              // false/null disables
});
</script>
```

Returns `{ show, next, prev, first, last, total, getCurrent }` (also `window.__deck`).
Buttons with `data-dk="prev|next|overview|core|notes|goto|help|fullscreen"` are auto-wired.

### Reveal models
- **`attr`** — current slide gets `data-active="true"`; prior slides `data-state="prev"`.
- **`class`** — current gets `.active`; prior get `.prev` (matches Branchdiff's CSS).

### Canvas models
- **fluid** — slides use `vw`/`vh`/`clamp()` (Token Economics, Branchdiff). Already responsive.
- **fixed** (`canvas:{w,h}` + `stage`) — PPT-style fixed canvas, `fitStage()` scales it to the
  viewport and re-runs on `resize` + `orientationchange` (Many Accounts). This is the model that
  makes mobile + rotation trivial: the slide frame keeps its aspect and just rescales.

## The `--dk-*` theme contract

`deck-chrome.css` reads only `--dk-*` tokens — it never touches a deck's own
variable names. Each deck aliases them in its `:root`:

```css
:root {
  --dk-bg: var(--bg);  --dk-surface: var(--surface);  --dk-elevated: var(--elevated);
  --dk-border: var(--border);  --dk-border-soft: var(--border-light);
  --dk-text: var(--text);  --dk-muted: var(--muted);  --dk-dim: var(--dim);
  --dk-accent: var(--accent);  --dk-accent-soft: var(--accent-soft);
  --dk-accent-glow: var(--accent-glow);  --dk-danger: var(--danger);
  --dk-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

Defaults ship in `deck-chrome.css` so it renders even without aliasing.

## Mobile + rotation support

`deck.js` toggles `body.dk-*` classes via `matchMedia`; `deck-mobile.css` styles
off them. Desktop never gets `dk-touch`/`dk-narrow`/`dk-rotate`, so it's untouched.

- **`dk-touch`** (coarse pointer) — thumb-friendly chrome: 44px nav tap targets,
  safe-area-inset padding, keyboard hint hidden, full-bleed lightbox, single-column
  overview, `overscroll-behavior:none`.
- **`dk-portrait` / `dk-landscape`** — orientation tracking. Title pill hides in
  portrait (room is tight).
- **`dk-narrow`** — phone-width viewport.
- **`dk-rotate`** — fixed-canvas deck in a narrow portrait screen → shows a
  dismissible "↻ rotate to landscape" hint (whole slide stays visible, letterboxed).
  Dismissing resets on the next orientation change.
- **`fitStage`** uses `visualViewport` (accurate despite the mobile URL bar) and
  re-runs on `resize` + `orientationchange` + `visualViewport.resize`, so rotation
  smoothly rescales the fixed canvas.
- **Swipe** is horizontal-dominant (`|dx| > |dy|·1.2`) — vertical scroll inside a
  fluid slide is never mistaken for a nav swipe.
- **Fluid decks** (Token, Branchdiff) reflow in both orientations via `vw`/`vh`/`clamp()`
  + `100dvh`; **fixed-canvas** (Many Accounts) is best in landscape (scale ~0.5×,
  ~35px text) and graceful in portrait (scale-to-fit + rotate hint).

### Possible next polish
Presenter pinch-zoom on slides, swipe-edge indicators, slide-thumbnail rail. All
would land in `deck-mobile.css` / `deck.js` and inherit to every deck automatically.
