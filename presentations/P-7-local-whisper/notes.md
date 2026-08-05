# Local Whisper — Presenter Notes

Companion to [`index.html`](./index.html) (the slide deck). One section per slide, in plain
language, for a **semi-technical** audience (site owners, devs who don't do ML, PMs). Use
these to prepare, or toggle the in-deck speaker notes (`S` key / the **Notes** button) during
a live talk.

**How to present this deck:** the spine is a ladder of *"why"* questions — each slide knocks
out the obvious alternative until in-browser RAG feels like the only possible answer. Lead
benefit-first; keep it friendly, not jargony.

---

## 1 · Hero

Open with the one-line promise: **a chatbot that runs in the browser and knows your page —
no backend, no bill, no data leaving the device.** The four pills (local-first, site-aware
RAG, pluggable, offline) are the agenda in disguise. Don't dwell — go straight to the problem.

## 2 · The problem

Two real failure modes. *Generic* bots know nothing about your content ("I don't have
information on that"). *API* bots leak every question to a third-party server and meter it.
The punchline: **small sites end up shipping nothing**, because both options are wrong for
them. That gap is what Local Whisper fills.

## 3 · What it is

The fix in one breath: **one `<script>` tag, it reads the page, answers from it, and links
back to the exact section.** Hammer the zeros — no backend, no API key. That's the whole
differentiator. The rest of the deck just explains how those zeros are even possible.

## 4 · Why not a chat API *(Image C)*

Walk the comparison table top-to-bottom. The insight people miss: a "serverless" LLM API
still forces you to run a **key-hiding server** — and that server *is* the backend. The
in-browser column wins every row (cost, privacy, infra, content-knowledge, offline). This
is the economic + privacy case.

## 5 · Why in the browser

Pre-empt the obvious objection: *"why not a cheap $5 server?"* Four reasons — static hosts
can't run backends, infra is real work, the visitor's CPU is free compute, and privacy is
automatic when there's no server. The takeaway line: **move compute to the visitor's
device; the site owner ships a script tag, not a server.**

## 6 · Architecture *(Image A)*

The cleverest part of the design. A sandboxed **iframe cannot read a cross-origin parent** —
browser security forbids it. So `embed.js` runs *in the host page* instead, where it's
same-origin to itself and can always scrape. Content crosses to the iframe via `postMessage`
(which works cross-origin). Neither side breaks its security model — that's the whole trick,
and why it works on any site.

## 7 · How the chat works

Demystify "AI in the browser": it's a **real LLM, compiled to WebAssembly, running on the
visitor's CPU** — no server round-trip per message. Default model is Gemma 3 270M (~278MB);
the preset lineup runs 270M → 1B. Bigger = smarter but more RAM. Cached after first load →
works offline.

## 8 · Why Wllama

Why this engine and not a from-scratch one: **Wllama is `llama.cpp` (the ggml core) compiled
to WebAssembly** — the same battle-tested inference code that runs Llama-class models on
servers and laptops, just retargeted to the browser. Two details worth saying aloud: it runs
in a **Web Worker with SharedArrayBuffer** (multi-core, UI never freezes), and it **streams**
(model chunks in, tokens out). *(That multi-core WASM is exactly what needs the COEP/COOP
headers from slide 20.)*

## 9 · Deep dive: the local-LLM landscape

**Optional slide — skip for a short talk.** The landscape of "run an LLM locally" splits
cleanly on one question: **does it need installing?**

- *In-browser engines* (Wllama, WebLLM, transformers.js) need no install → can embed in any
  site.
- *Native runtimes* (**Ollama, LM Studio**) are faster and run bigger models (real CPU/GPU),
  but require an app + a running `localhost` server on each machine — fine for *your* laptop
  or a desktop app, impossible for a public website's visitors.

**Ollama's architecture, simply:** `llama.cpp` wrapped as a native app that exposes a REST
API on `localhost:11434` — your code calls it like a local OpenAI. Brilliant for personal/dev
use; can't be embedded on a stranger's static site. **Wllama over WebLLM** here: the GGUF /
llama.cpp ecosystem matches Hugging Face model availability; WebLLM's edge is WebGPU
acceleration where browsers support it.

## 10 · The gap

Set up RAG. A general model is fluent but ignorant of *your* content — ask a policy question
and it **hallucinates** a plausible-sounding wrong answer. Two ways to fix that: **train**
(memorize) vs **retrieve** (read on demand). The next slide disposes of training.

## 11 · Why not train

Knock out Option A methodically. Training needs GPUs + hours, repeats per-site and per-update,
hits the browser's RAM ceiling, and — critically — wants data centralized, which **breaks the
no-backend promise**. Land the reframe: we don't need the model to *remember* the site, we
need it to *read* the site on demand.

If someone wants their "brand voice," the answer isn't training — it's the shipped **`persona`**
config (slide 15). The linked [custom-training R&D notes](https://github.com/Encryptioner/private-chat/blob/main/docs/CUSTOM-MODEL-TRAINING.md)
make the full case: RAG + `persona` already cover what training would, with zero training.

## 12 · So: RAG

The heart of the project. **RAG = keep the page as text, find the relevant chunk per
question, paste it into the model's context.** The model stays general and small; the content
stays fresh because it's just text on a page. It's the only option that satisfies every
constraint at once — tiny model, instant updates, grounded answers, fully in-browser.

## 13 · How RAG works *(Image B)*

Walk the five steps left-to-right: **scrape → chunk → embed → retrieve top-k → ground** the
answer and attach "Related sections" links. The detail that surprises people: the embedder
(`bge-small`, ~35MB) is a **second model**, separate from the chat model. It loads lazily on
the first grounded question, then vectors cache in IndexedDB — so the second question on the
same page is instant.

## 14 · The techniques, named

This is the "underline the techniques" slide — name each building block so the audience can
google it later and sees there's no magic: WebAssembly inference · sandboxed iframe +
postMessage · vector embeddings + retrieval · IndexedDB cache · COEP/COOP isolation · lazy
loading. Call out #5: COEP/COOP is the one requirement that can be fiddly on some static
hosts, because multi-threaded WASM (SharedArrayBuffer) demands cross-origin isolation.

## 15 · Pluggable chatbot

"Pluggable" = the default scraper works out of the box, but a site owner can swap in their
own via `getSections` (CMS, JSON-LD, an API, a content region). And the answer to "I want my
brand voice" is **not training** — it's the shipped `persona` config, one line. Reassure: the
scraper runs in *their* page context, and if it fails the widget **degrades to plain chat,
never crashes**.

## 16 · Whole-site awareness

One widget can cover the whole site, not just one page. Two mechanisms: a static
`site-index.json` (built by the bundled crawler — a Node script, or Python via Scrapling) for
cross-page answers, and automatic re-scrape on SPA route changes. Reassure: default is still
just-the-current-page; cross-page is opt-in via one JSON file.

## 17 · Three running modes

Same widget, three deployments. **Cross-origin embed** is the common case (widget on your
domain). **Same-origin** is a simpler path when the widget shares the origin. **Standalone**
is the app at its own URL — a private, offline general chat with no RAG. Note: RAG only
activates in the two embed modes.

## 18 · Where it shines

The payoff — where all the "why" answers converge on a concrete user. **A portfolio or docs
site on GitHub Pages can finally have a chatbot that knows its content**, free and private.
Personify it: *"a developer's resume site, on free static hosting, with a chatbot that
answers 'what did you work on at Nerddevs?' from the page itself."*

## 19 · Wider possibilities

Broaden the lens. Each card is a place where one of the constraints (private / free / offline
/ static-hosted) is the blocker — and in-browser RAG flips it into the feature. If the
audience is enterprise-leaning, lean on the **regulated + internal-docs** cards: "data never
leaves the device" stops being a compliance fight and becomes the selling point.

## 20 · Honest boundaries

The honesty beat. Pair each limit with its "why": tiny model → hallucination (RAG grounds,
doesn't fix); brute-force retrieval → large-site latency; COEP/COOP → the one hosting
friction; first-question latency; no deep multi-step reasoning; RAM ceiling on bigger models.
Close with: **none fatal — they're the honest cost of "100% in-browser, zero backend,"
chosen on purpose.**

## 21 · Recap

Land the one-liner, then walk the "why" checklist — that's the memorable spine. Highlight the
Wllama-vs-Ollama line: **only Wllama runs on the visitor's device with zero install.** End
with the call to action: point to the [live site](https://encryptioner.github.io/private-chat/)
and the [integration guide](https://github.com/Encryptioner/private-chat/blob/main/docs/SITE-INTEGRATION.md),
and invite them to drop the one `<script>` tag on their own site and watch it answer.
