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
│   ├── deck-chrome.css      # shared controls (nav, lightbox, overview, mobile) — theme-agnostic via --dk-*
│   └── branchdiff.css       # Branchdiff feature decks: slide layout + GitHub-dark/neon-mint theme
└── README.md                # this file
```

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

## Responsive foundation (current state)

- **Chrome** — `@media (max-width:720px)` hides the keyboard hint, shrinks the
  chrome pills, and grows nav tap targets to 40px; portrait hides the title pill.
- **Fixed-canvas decks** — `fitStage` rescales on `resize`/`orientationchange`,
  so rotation just works.
- **Fluid decks** — slide padding/sizing use `vw`/`vh`/`clamp()`, already adapting.

### Next phase — PPT/Google-Slides mobile UI
The foundation above is in place; the richer mobile UX (swipe indicators, a
thumb-friendly bottom bar, slide thumbnails, presenter pinch-zoom) lands later in
a new `css/deck-mobile.css` + a mobile bar in `deck.js` — both inherited by every
deck automatically because the chrome is shared.
