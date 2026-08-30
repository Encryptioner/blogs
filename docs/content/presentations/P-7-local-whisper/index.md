# P-7 — Local Whisper

## A private AI chatbot that lives in your browser

A site-aware chat widget that runs a real LLM entirely in the visitor's browser — no
backend, no API key, no per-token bill — and answers from the host page's own content,
with clickable links that jump to the relevant section.

**Source project:** [`Encryptioner/private-chat`](https://github.com/Encryptioner/private-chat) ·
**Live:** <https://encryptioner.github.io/private-chat/>
**Audience:** semi-technical (site owners, devs who don't do ML, PMs). Friendly,
benefit-first; no code in the deck, just concepts, diagrams, and trade-offs.

**Deck file:** `index.html` — single deck, **21 slides**, midnight-violet theme, 🤫 favicon.
Engine: shared `deck.js` + `deck-chrome.css` + `deck-mobile.css` via jsDelivr. Speaker notes
on every slide (toggle `S` / the `#notesToggle`). Three architectural images, all inline
CSS/SVG (no PNG assets):
- **Image A · System architecture** (slide 6) — host `embed.js` ↔ sandboxed iframe.
- **Image B · RAG pipeline** (slide 13) — scrape → chunk → embed → retrieve → ground.
- **Image C · 3-way comparison** (slide 4) — Chat API vs local server vs in-browser.

**Presenter notes (long form):** [`notes.md`](./notes.md).
**Companion blog:** _none yet_ (private-chat has no long-form post).

---

## Slide 1 — Hero

# Local Whisper

A site-aware chat widget that runs entirely in your visitor's browser — no backend, no
API key, no per-token bill — and it answers from your page's own content.

- 100% local-first · Site-aware RAG · Pluggable scraper · Works offline

---

## Slide 2 — The Problem

# Site chatbots make you pick a pain

- **Generic** — pre-built bots know nothing about *your* content. "I don't have information on that."
- **Leaky & costly** — API bots send every question to a third-party server. Per-token cost, key to babysit, data leaves the page.

Small sites are stuck: too small to build a backend chatbot, too privacy-conscious to ship questions to a cloud API.

---

## Slide 3 — What It Is

# One `<script>` tag. A chatbot that knows your page.

A floating widget that reads your page, finds the relevant section, and answers from it — with a link that jumps to the answer. The whole thing runs in the visitor's browser.

- 1 script tag · 0 backend · 0 API key · 100% client-side

---

## Slide 4 — Why Free + Local, Not a Chat API  *(Image C)*

# A cloud chat API is a backend you rent

"No-backend" LLM APIs still need a server to hide your API key — and that server is the backend. Then every question costs money and leaks data.

| | Chat API (cloud) | Local server | In-browser · Local Whisper |
|---|---|---|---|
| Cost | per-token bill | server + compute | **free** |
| Privacy | data leaves device | your server sees it | **never leaves device** |
| Infra / upkeep | key-hiding proxy | run & patch a box | **none — static host** |
| Knows your content | needs a RAG backend | if you build it | **built-in, client-side** |
| Works offline | no | no | **yes, after cache** |

---

## Slide 5 — Why In the Browser?

# Why not just run a model on a $5 server?

- **Static hosts can't run backends** — GitHub Pages, Netlify, a CDN portfolio have no server process.
- **Infra is real work** — provision, scale, keep alive, secure, patch.
- **The visitor's device is free compute** — modern phones/laptops run a small LLM fine.
- **Privacy scales for free** — "data never leaves your device" is automatically true when there's no server.

Shift the work from your server (costs money, sees data) to the visitor's device (free, already trusted).

---

## Slide 6 — Architecture  *(Image A)*

# Two contexts, one postMessage bridge

The widget is a sandboxed iframe — it can't read a cross-origin parent directly. So `embed.js` runs in the host page (always same-origin to itself), scrapes the content, and hands it to the iframe via `postMessage`.

- **Host page** — `embed.js` scrapes sections; scrolls to the section on link click.
- **Chat widget (iframe)** — React + Wllama (WebAssembly): chunk → embed → retrieve → ground; answer + "Related sections" links.

This split is why it works on any site: the scraper lives where the page is readable; the model lives where it can run sandboxed.

---

## Slide 7 — How the Chat Works

# A real LLM, loaded as WebAssembly

- **GGUF model → Wllama → WebAssembly** → runs on the visitor's CPU. No server round-trip per message.
- **Tiny by design** — default is Gemma 3 270M (~278MB); presets run 270M → 1B (Gemma, Llama 3.2, Qwen3, SmolLM2).
- **Cached = offline** — after first load, the model is in the browser cache.
- **Swappable** — upload a different `.gguf` (up to 2GB) for smarter answers at more RAM.

---

## Slide 8 — Why Wllama

# Why Wllama — and how it actually runs

- **It's llama.cpp, compiled to WebAssembly** — the same ggml/llama.cpp core that runs Llama-class models natively. Real inference, not a toy.
- **No GPU, no server** — runs on the visitor's CPU, inside their tab.
- **Multi-threaded, off the main thread** — a Web Worker + SharedArrayBuffer use several cores; the page never freezes.
- **Streams both ways** — model chunks stream in, tokens stream out.
- **GGUF-native** — loads standard Hugging Face GGUF files; swap models by swapping a file.

How a model reaches the user: `GGUF file → llama.cpp/ggml (C++ core) → Emscripten → WebAssembly module → Web Worker → visitor CPU → streamed answer`.

---

## Slide 9 — Deep Dive: The Local-LLM Landscape

# Wllama vs Ollama vs the rest

Several runtimes can run an LLM on your own machine. They split on one question — **does it need installing?** — and that decides whether it can power a chatbot embedded on someone else's static website.

| Runtime | How it runs | Install on visitor's device? | Powers an embedded site widget? |
|---|---|---|---|
| **Wllama** (this) | llama.cpp → WebAssembly, in a Web Worker | no — loads with the page | **✓ the pick** |
| WebLLM | MLC models → WebGPU/WASM, in-browser | no | alt in-browser engine |
| transformers.js | ONNX Runtime in-browser (WASM/WebGPU) | no | embeddings more than chat |
| Ollama | native llama.cpp app + local REST server (`localhost:11434`) | yes — app + running process | ✗ visitor must install it |
| LM Studio | desktop GUI + OpenAI-compatible local server | yes — app + running process | ✗ visitor must install it |

**The crux:** Ollama and LM Studio are excellent — for running a model on *your* machine (bigger models, GPU, very fast). They can't power a widget on a stranger's static site, because every visitor would need them installed and running. Wllama is the one that runs on the visitor's device with zero install.

---

## Slide 10 — The Gap

# A general model doesn't know your content

Ask "what's your refund policy?" and a generic model invents one. It's smart about language, not about your site. Two ways to teach it:

- **Option A · Train** — bake content into the weights (fine-tuning). The model *memorizes*.
- **Option B · Retrieve** — hand it the right snippet at question time (RAG). The model *reads* on demand.

---

## Slide 11 — Why Not Train a Model?

# Teaching a model by training doesn't fit the browser

- **Training is heavy** — fine-tuning needs GPU clusters and hours-to-days.
- **It's per-site** — retrain for every site, and again for every content update.
- **Browsers are RAM/CPU bounded** — even running a tiny model is near the ceiling.
- **It breaks the promise** — training wants data centralized (the exact setup Local Whisper avoids).
- **The models are tiny by design** — a 270M model can't absorb deep site knowledge through weights.

We don't need the model to *remember* your site — we need it to *read* your site on demand. **Deep dive:** the project's [custom-training R&D notes](https://github.com/Encryptioner/private-chat/blob/main/docs/CUSTOM-MODEL-TRAINING.md) — why RAG + `persona` already cover what training would, with zero training.

---

## Slide 12 — So We Retrieve, Not Memorize

# RAG: hand the model the right paragraph, then let it talk

Retrieval-Augmented Generation: keep your page as text, find the relevant chunk per question, paste it into the model's context. Model stays general; content stays fresh.

- 0 training · re-scrape to update · grounded (cites the page) · linkable · 100% in-browser

---

## Slide 13 — How RAG Works  *(Image B)*

# Five steps, all in the visitor's browser

**Scrape → Chunk → Embed → Retrieve → Ground**

- Scrape: read the page into sections
- Chunk: split into passages
- Embed: `bge-small` (~35MB) → vectors
- Retrieve: top-k matches
- Ground: answer + "Related sections" links

The embedder is a *separate* model from the chat model — loads lazily on the first grounded question, then vectors are cached in IndexedDB.

---

## Slide 14 — The Techniques, Named

# Six techniques do the heavy lifting

Each is a deliberate choice — standard building blocks, not magic.

1. **WebAssembly inference** — the LLM core (llama.cpp) compiled to WASM, runs on CPU.
2. **Sandboxed iframe + postMessage** — the widget is isolated; the host script bridges content cross-origin.
3. **Vector embeddings + retrieval** — text → vectors (bge-small); nearest chunks by similarity.
4. **IndexedDB vector cache** — embeddings persist across visits; repeat questions skip the work.
5. **COEP / COOP isolation** — cross-origin headers that unlock SharedArrayBuffer (multi-threaded WASM).
6. **Lazy loading** — the ~35MB embedder loads on the first grounded question, not on page load.

---

## Slide 15 — Pluggable Chatbot

# Bring your own scraper — or use the built-in one

- **Default scraper** reads visible text grouped under each heading — zero config.
- **Override with `getSections`** for a CMS, JSON-LD block, API, or specific region.
- **Custom voice or brand?** Set `PRIVATE_CHAT_CONFIG.persona` — one config line, no training.
- Runs in your page's context — can fetch your own APIs.
- Degrades gracefully — throw or empty → plain chat, no crash.

---

## Slide 16 — Whole-Site Awareness

# One widget, the whole site

- **Static cross-page index** — drop a `site-index.json` (built by the bundled crawler — Node, or Python via Scrapling) → answers across pages.
- **SPA-aware** — re-scrapes automatically on client-side navigation.
- **Links go to the right place** — other-page hits link there with an anchor, then scroll.

Default: just the current page. Add `site-index.json` only for cross-page answers.

---

## Slide 17 — Three Running Modes

# Same widget, any deployment

1. **Cross-origin embed** — widget on your domain; `embed.js` scrapes, `postMessage` bridges. The common case.
2. **Same-origin embed** — widget served from the same origin; iframe-side scrape as fallback.
3. **Standalone** — the app at its own URL; plain general chat, no RAG.

---

## Slide 18 — Where It Shines

# Built for the small static site

For a portfolio, docs page, or landing page on GitHub Pages / Netlify — you can't run a backend chatbot and don't want an API bill. Local Whisper fits that world.

- One script tag, zero config · No backend to run · No bill · Private by default

---

## Slide 19 — Wider Possibilities

# Where else this unlocks something

- Internal wikis & docs · Education · Kiosks & offline · Regulated (health/finance) · Local dev tools · Personal sites

Anywhere "private," "free," "offline," or "static-hosted" is the constraint — in-browser RAG turns it from a blocker into a feature.

---

## Slide 20 — Honest Boundaries

# What it can't do (yet)

- **Tiny models hallucinate** — RAG grounds it, doesn't guarantee perfection.
- **Retrieval is brute-force** — large sites feel it in latency and memory.
- **Needs COEP / COOP headers** — cross-origin isolation is a WebAssembly requirement.
- **First-question latency** — the ~35MB embedder loads on the first grounded question (then cached).
- **No deep multi-step reasoning** — it reads and answers; no long agentic chains.
- **Browser memory ceiling** — bigger model = smarter, until the tab runs out of RAM.

None fatal — they're the honest cost of "100% in the browser, zero backend," picked on purpose.

---

## Slide 21 — Recap

# Local Whisper, in one line

A chat widget that runs a real LLM in the visitor's browser, reads your page, and answers from it — with links. No backend, no API key, no bill, no data leaving the device.

- **Why not a chat API:** a rented backend — key to hide, per-token cost, data leaks.
- **Why in the browser:** static hosts can't run servers; the visitor's CPU is free, private compute.
- **Why Wllama (not Ollama):** llama.cpp compiled to WASM — the only local runtime that runs on a visitor's device with zero install.
- **Why not training:** heavy, per-site, breaks the no-backend promise — `persona` + RAG already cover it.
- **Why RAG:** grounded, fresh on re-scrape, linkable — fits a tiny model, in-browser.
- **Pluggable:** default scraper works; `getSections` + `persona` give full control.
