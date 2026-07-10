# Token Economics: Better Results, Fewer Tokens

> More tokens do not mean better answers. They mean a bigger bill and, past a point, a *worse* answer — because the model has to search harder for the signal in the noise.

I've spent 7+ years shipping production TypeScript and Node systems, and the last couple of those leading a team at Nerddevs that now writes more code through AI agents than by hand. The habits below aren't theory — they're what I run on my own side projects (this blog repo included) and what I've had to walk teammates back from when a session quietly burned through a day's token budget on a single "just look around the codebase first" request.

Every AI coding session has a hidden meter running. Most engineers watch the response quality and ignore the meter — until the monthly bill or the "context limit reached" wall shows up. This post is the meter, made visible: what actually drives token cost, why the cheapest-looking model is sometimes the most expensive, and the concrete configuration in this repo's own `.claude/` setup that keeps cost down without touching output quality.

The worked examples below use Claude Code because that's this repo's own daily driver — but the arithmetic (price × tokens × attempts) and the guard rails don't belong to one vendor. There's a dedicated section on Codex, OpenCode, OpenRouter, and local models further down, plus what changes on your laptop when you're running several of them at once across worktrees.

Before the math, the picture — this is the moment most teams first notice the meter exists:

<div align="center">
  <img src="../../../assets/B-16/bill-reveal.png" alt="Editorial cartoon: a relaxed developer enjoying a $20/month AI deal in month one, then the same developer a quarter later sweating over a $14,000 compute bill while finance asks who approved the robot's tab"/>
  <br/>
  <sub>The gag is just the real numbers with a face on it — the ~$14,000/mo figure and the 70× subsidy gap are cited further down. Original artwork, not a stock image.</sub>
</div>

It isn't only enterprises eating this. One [Copilot Studio user's Reddit post](https://www.reddit.com/r/copilotstudio/comments/1ueqedl/woke_up_to_a_47k_bill_after_deploying_one_copilot/) lays it out plainly: separate dev/prod environments on a developer tenant, the Pay-as-you-go plan turned on, one agent deployed from dev to prod — and an Azure bill of **~$47,000**. One agent, one deployment, five figures.

---

## The Real Cost Equation

Cost per task is not the sticker price per million tokens. It's:

```
cost = (price per token) × (tokens consumed per task) × (number of attempts)
```

Vendors advertise the first factor. The second and third factors are where the real money moves, and they're controlled by *your* setup — model choice, harness quality, context hygiene — not by the vendor.

That third factor is bigger than it looks. Coding is already the dominant AI-agent use case industry-wide, and Anthropic's own usage data shows "modifying software to correct errors" alone accounts for roughly 6% of consumer Claude.ai usage and **10% of enterprise API traffic**. A meaningful slice of the industry's entire token spend isn't new work at all — it's *attempts*, paying again for something that didn't work the first time.

**The cheap-per-token trap, with real numbers (verified, mid-2026):** Gemini 3.5 Flash prices input at $1.50/M tokens against Gemini 3.1 Pro's ~$2.00/M — on the sticker, a clear win. But according to Artificial Analysis's own published evaluation — they run every model through their Intelligence Index and report the total cost — running the **full suite cost $1,552 on Gemini 3.5 Flash versus ~$887 on Gemini 3.1 Pro**: the "cheaper" model came out 75% *more expensive* per workload. Artificial Analysis attributes this to two stacking factors, not one: Flash 3.5 is priced 3× higher per token than its own predecessor (Gemini 3 Flash, at $0.50/$3.00 vs the new $1.50/$9.00 per million), *and* it uses significantly more input tokens per evaluation because agentic runs now take more turns. Gemini 3 Flash itself cost only ~$282 to run the identical suite — so Flash 3.5 costs 5.5× more than its own prior generation, on top of costing more than the "expensive" Pro tier it's supposed to undercut.

The lesson: **price-per-token and cost-per-task are different numbers, and only one of them is on the pricing page.** Or, as one comment on a viral post of this same chart put it: paying for the flagship model on a task the cheap tier could handle is buying a Ferrari to drive to the grocery store.

And the gap isn't a Gemini quirk — it holds across the entire field. Artificial Analysis's own weighted cost-per-task ranking puts **Claude Fable 5 as the single most expensive model benchmarked, at $2.73 per Intelligence Index task** — 136× the cheapest model measured, gpt-oss-20b at $0.02. The flagship-est model on the market is, quite literally, the most expensive way to answer a question.

<div align="center">
  <img src="../../../assets/B-16/which-ai-cost-more-per-task.png" alt="Bar chart: Which AI models cost the most per task? Weighted average cost in USD per Intelligence Index task, ranked from Claude Fable 5 at $2.73 down to gpt-oss-20b at $0.02"/>
  <br/>
  <sub>Source: <a href="https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index">Artificial Analysis — Intelligence Index, weighted cost per task</a>, Jul 3, 2026.</sub>
</div>

---

## Model Tiering: Pay for Reasoning Only When You Need It

This isn't a Claude-only habit — every vendor prices a cheap/default/flagship ladder, and the open-weight labs undercut all three on a per-token basis. Current pricing (July 2026), per million tokens:

| Model | Input | Output | Best for |
|---|---|---|---|
| Claude Haiku 4.5 | $1 | $5 | Lookups, file discovery, quick reformatting |
| Claude Sonnet 5 | $2 (intro, until Aug 31 '26) → $3 | $10 → $15 | Implementation, review, daily development |
| Claude Opus 4.8 | $5 | $25 | Architecture, complex debugging, spec writing |
| Claude Fable 5 | $10 | $50 | Anthropic's hardest-reasoning tier, above Opus — for when Opus isn't enough |
| GPT-5.6 Luna | $1 | $6 | OpenAI's cheap high-volume tier |
| GPT-5.6 Terra | $2.50 | $15 | OpenAI's default/mid tier |
| GPT-5.6 Sol | $5 | $30 | OpenAI's flagship tier |
| GLM-4.6 (Zhipu/Z.ai, open-weight) | $0.43 | $1.74 | Cheap tier, self-hostable |
| MiniMax M2 (open-weight) | $0.26 | $1.00 | Cheap tier, self-hostable |
| Kimi K2.6 (Moonshot, open-weight) | $0.95 | $4.00 | Mid-cheap tier, self-hostable |

Cached input runs up to **90% cheaper** than fresh input across the Claude tiers.

That table is the reason `~/.claude/rules/model-routing.md` in this setup exists as a rule, not a suggestion — every subagent dispatch in this session picks a model deliberately:

```md
- Use haiku for: quick lookups, file discovery, simple reformatting
- Use sonnet for: implementation, testing, code review
- Use opus for: architecture decisions, complex debugging, spec writing
- Default to sonnet — only escalate to opus when reasoning depth matters
```

The benchmark data backs this up from the other direction: on SWE-bench Pro, **Haiku 4.5 solves problems for about $0.13 of spend per benchmark point** — the cheapest cost-per-correct-fix of any current model — while Opus 4.8 posts the highest score (69.2%) but at 5-25x the per-token price. Routing by task, not defaulting everything to the flagship model, is the single highest-leverage lever most teams never pull.

---

## Where Your Tokens Actually Go

For a working developer, the split isn't abstract: looking up syntax, rephrasing a Slack message, translating a stack trace, formatting a commit message — that's the bulk of a session's tokens, and none of it needs the flagship model. The 6% that actually compounds is architecture, hard refactors, and shipping.

<div align="center">
  <img src="../../../assets/B-16/token-mix.png" alt="Chart showing a typical developer session: ~94% of tokens spent on low-value tasks like syntax lookups and boilerplate, only ~6% on high-value work like architecting and shipping a feature — with a redirect showing cheap-tier, mid-tier, and flagship-tier task routing"/>
  <br/>
  <sub>Slice sizes are illustrative, not a measured breakdown — the point is the shape, not the precision. Closer to home: Anthropic's own Economic Index ranks Bangladesh 116th of 121 tracked countries on Claude.ai usage relative to population — a usage index of 0.11, among the lowest anywhere it's measured. But the topics that <em>are</em> distinctive there skew technical and developer-shaped: Math and CS theory (2.4× the global rate), Web front-end (1.8×), general software development (1.8×), and AI app building (1.6×) all outpace homework and self-presentation writing. Same 94/6 split holds — the 6% that gets used skews toward the work this post is about.</sub>
</div>

**The move:** cheap tier (Haiku, GLM, MiniMax, local) for the 94%, flagship only for the 6% that compounds.

---

## Beyond One Vendor: Tools, Routing, and Local Models

Everything above happens to use Anthropic's price list, but none of it is Claude-specific. Here's the same arithmetic across the rest of the landscape, light touch — pick the tool for the constraint that actually binds, not the one with the loudest benchmark claim.

| Tool | Model access | Pricing shape | The real tradeoff |
|---|---|---|---|
| **Claude Code** | Anthropic only | $20/$100/$200 subscription tiers (~44K tokens per 5-hour window on the $20 plan), or pay-per-token API | Predictable, but heavy days hit the window cap |
| **OpenAI Codex CLI** | OpenAI only | Go $8 / Plus $20 / Pro $100–$200; GPT-5.4 API at $2.50 in / $15 out per MTok | OpenAI markets ~4× better token efficiency than Claude Code — a vendor claim, worth measuring on your own workload before trusting it |
| **OpenCode** (open-source) | 75+ providers — Claude, GPT, Gemini, local Ollama, switchable mid-session | Whatever the backing model charges | One terminal UI, any vendor's pricing tier underneath; built-in LSP integration feeds it real type signatures instead of the model guessing — fewer exploratory tokens spent either way |
| **OpenRouter** | 300+ models, one API key | Pass-through provider pricing (no markup) + 5.5% card-funding fee (min $0.80) + 5% BYOK fee over 1M req/month | Cross-vendor arbitrage without rewriting your harness per provider; supports prompt caching with "sticky routing" to keep cache hits high — but you're trusting a proxy hop to pass caching semantics through correctly |
| **Local (Ollama, LM Studio + open models)** | Whatever fits your hardware | $0 marginal cost per token | The token is free; the device isn't — see the device-cost section below |

---

## Harness Beats Horsepower

Model choice gets all the attention. Scaffolding — the tools, prompts, and retrieval strategy wrapped around the model — often matters more, and there's a clean, verifiable example of exactly how much. Claude Opus 4.8 reports 69.2% on SWE-bench Pro using its own vendor scaffolding. Scale AI's SEAL lab runs the *same* benchmark with identical, standardized scaffolding across every model — no vendor tuning its own harness to the test — and on that leaderboard, the best score any model posts is 59.1%. That's a **10-point gap from harness alone**, on the same tasks, same benchmark, same scoring — the only variable that changed is who built the scaffolding around the model.

Two harness-level rules in this repo's config exist specifically to buy back that swing:

- **Instruction budget.** Frontier LLMs reliably comply with roughly 150–200 instructions total; Claude Code's own system prompt burns ~50 of those before a project's `CLAUDE.md` even loads. Every low-value rule in a project file degrades the following rate of every *other* rule, uniformly. Keeping `CLAUDE.md` under ~200 lines isn't tidiness — it's a token-and-compliance budget.
- **Rules over CLAUDE.md bloat.** `~/.claude/rules/*.md` files load only when a file matching their glob is touched (`*.ts,*.tsx` → TypeScript rules; `*.vue` → Vue conventions). A `CLAUDE.md` loads in full, every turn, regardless of relevance. Splitting file-specific patterns into globbed rules means the model isn't carrying Vue conventions while it edits a Python script.
- **Command hooks over prompt hooks.** A `command` hook runs a shell check directly — zero model tokens, deterministic. A `prompt` hook asks the model to *evaluate* a condition and decide whether to act — it costs tokens and reasoning on every single tool call it's attached to. Lint and type-check gates belong in command hooks; save prompt-based judgment for things that genuinely need judgment.

---

## Device Cost — Not Just a Token Bill

Token cost isn't only an API bill. It's also whatever is left of your CPU, RAM, and battery once you've opened three worktrees to pair-review a `branchdiff` PR, keep a side project's agent running in another tab, and let a background hook update a knowledge graph on commit. Every one of those is a concurrent process competing for the same cores — and it doesn't take much to tip that into visible thermal throttling.

This repo's own graphify integration hit the same wall before it shipped a fix: without a guard, concurrent graph rebuilds piled up — **3 processes at 65–73% CPU each, load average past 12, RAM saturated** — because every worktree switch and every commit tried to rebuild at the same time. The fix wasn't a cheaper model; it was a resource check baked into the git hook itself: skip the rebuild if CPU load is above 50% of available cores or free memory drops under 2 GB, plus a `pgrep` dedupe so a second trigger can't stack a second process on top of the first.

That pattern is vendor-agnostic and it matters more, not less, as you multiply concurrent agents:

- **Every parallel worktree is a concurrent process**, whether it's a hosted tool's background hook, a subagent dispatch, or — sharpest of all — a local model's inference process competing for the same RAM your IDE and browser already claimed.
- **Guard background jobs, don't just schedule them.** A resource check (CPU + free-memory threshold) before any rebuild, index, or hook fires, plus process dedupe, is cheaper than the cleanup after three of them collide.
- **Serialize the heavy jobs across worktrees.** One graph rebuild running at a time beats one per open worktree — the git hook above already does this by design.

**Local models sharpen the same problem, in numbers.** Ollama's floor is 8 GB RAM with no GPU, but agentic coding is a different animal — the KV cache grows every turn, so even a model that fit comfortably at turn one gets pushed into slow CPU territory by turn twenty. Realistic targets: 16 GB RAM minimum, 32 GB recommended, 64 GB for comfortable headroom; 7–8B models want 8–12 GB of VRAM (or unified memory on Apple Silicon, which doesn't split between GPU and system RAM the way a Windows laptop with a discrete GPU does). An 8–14B model fits one active session comfortably — open two or three worktree sessions on the same box and you're splitting that same 16–32 GB of RAM/VRAM three ways, with your battery draining faster than any "up to 20 hours" spec sheet implies. None of that shows up on a per-token price comparison, and neither does the quality gap: a weaker local model that needs three retries to reach the same correct answer a hosted model gets in one has spent more *wall-clock* and dev attention than the "expensive" API call, even at $0 marginal token cost. The real win with local models isn't price; it's that nothing leaves the device — the actual deciding factor for regulated or offline work.

A laptop under load throttles, times out, and produces worse — slower, sometimes truncated — agent output long before the API bill becomes the bottleneck. Plan for concurrent device load the same deliberate way you plan for tokens-per-task.

---

## Feed Less, Not More

Bigger context windows solved one problem and created another: **context rot**. Accuracy degrades as token count climbs, even well inside the window limit — the model has more haystack to search for the same needle. The fix isn't a bigger window; it's a smaller haystack.

Three patterns do the heavy lifting:

1. **Agentic, on-demand retrieval instead of pre-loading everything.** This repo's knowledge-graph tooling (`graphify` + `code-review-graph`) builds its index with Tree-sitter — **0 LLM tokens** to parse 1,000+ files into a queryable graph. Every session that skips it re-reads dozens of files just to get oriented — one measured session lost "twenty thousand tokens evaporated before a single line of code is written." Querying the graph (`semantic_search_nodes`, `get_impact_radius`) costs a few hundred tokens instead of a fresh directory sweep.
2. **Subagents with clean context.** Dispatching research or exploration to a subagent means the main conversation gets a distilled answer back, not the transcript of every file it read to get there. The heavy lifting happens in a context that gets thrown away; only the conclusion survives.
3. **Prompt caching** — big enough to get its own section, below.

---

## Caching: The 90% Lever

Prompt caching is the single highest-leverage, zero-quality-loss technique in this whole post. The model already computed the attention values for your static prefix — system prompt, tool definitions, the unchanging file you're iterating on — on the last call. Instead of throwing that work away, the provider keeps it warm and charges you a fraction to reuse it. The output is byte-identical; only the bill and the latency change.

The headline number every provider converges on is **~90% off the cached portion of input**. The mechanics differ enough across the three majors that the strategy has to differ too:

| Provider | Cache TTL | Write (first hit) | Read (cache hit) | How to get it |
|---|---|---|---|---|
| **Anthropic (Claude)** | 5 min or 1 hour (opt-in) | **1.25×** standard input for 5 min, **2.0×** for 1 hour | **0.10× input** (90% off) | Explicit: mark `cache_control: { type: "ephemeral" }` on the prefix blocks you want cached |
| **OpenAI (GPT-5.x)** | up to **24 hours** (default on 5.5+, no fee) | 1.0× input, no surcharge | **0.50× input** (50% off, ≥1024 tok, 128-tok increments) | Automatic — routed to servers that recently computed the same prefix, no code change |
| **Google (Gemini 3.x)** | 60 min default (extensible) | 1.0× input + per-hour storage cost | **0.10× input** (90% off) | Implicit (auto, free) or explicit (declared, guaranteed discount) |

<div align="center">
  <img src="../../../assets/B-16/caching-lever.png" alt="Comparison of Anthropic, OpenAI, and Gemini prompt caching: TTL, write cost, read discount, plus break-even math and the 5-minute TTL cliff"/>
  <br/>
  <sub>Sources: <a href="https://platform.claude.com/docs/en/build-with-claude/prompt-caching">Anthropic prompt-caching docs</a>, <a href="https://developers.openai.com/api/docs/guides/prompt-caching">OpenAI prompt-caching guide</a>, <a href="https://ai.google.dev/gemini-api/docs/caching">Gemini context caching docs</a>. Chart built from their published mechanics — not a reproduction of any vendor graphic.</sub>
</div>

### The break-even that determines whether caching is even worth it

Caching is not free money — there's a **write surcharge** on the first hit, and it only pays off once enough *reads* land before the prefix expires to earn that surcharge back. Here's the actual math on Claude's 5-minute tier: a write costs **1.25×** normal input; each cache hit after that costs **0.10×** — a saving of 0.90× versus paying full price again. You need enough hits to cover the 0.25 extra you paid on the write: 0.25 ÷ 0.90 ≈ **1.4 reads to break even.** Fewer hits than that inside the window, and caching cost you money instead of saving it — a 20,000-token system prompt that only gets hit ~1.1 times per five-minute window is a real-world example of a cache that's actively losing money.

### The 5-minute TTL cliff (and how to not fall off it)

Anthropic quietly dropped the Claude cache TTL from 60 minutes down to **5 minutes** in early 2026, and it caught a lot of production workloads mid-stride: savings that were tracking ~84% fell to ~52% overnight, because every request that landed past the 300-second mark became a fresh write instead of a cheap read. If your batch job processes 200 items at 2 seconds each (400 seconds total), the cache dies around item 135 and *every call after that is a miss* — the 90% lever silently switches off mid-workflow.

Four mitigations hold the cache warm, and they generalize across providers:

- **Batch within the window.** Don't trickle requests in over an hour. Cluster the work so all the reads land before the TTL expires — turn a slow steady stream into a tight burst.
- **Keep-alive ping.** For a long session against high-value cached content, send a lightweight request roughly every 4 minutes. Accessing a cached block *resets* its TTL, so a cheap read keeps an expensive write alive indefinitely.
- **Static-prefix-first.** Cache matching is positional — it breaks the moment a single byte changes ahead of the cached segment. Put the unchanging bytes (system prompt, tool defs, reference docs) at the very front, and push anything dynamic (the current user message, working memory, the file you're actively editing) to the *back*. The most common reason a cache hit rate is stuck low is dynamic state living in the system prompt, invalidating the whole prefix every turn.
- **Batch API for overnight jobs.** When the window is too long to batch within, switch to the provider's Batch API: it processes requests with a shared prefix, so the *first* request in the batch pays the write cost and the rest pay the read cost (10%) — and Anthropic/Gemini stack a further ~50% batch discount on top, which can reach ~95% off the repeated portion for genuinely async work.

### My rule for sessions, not just servers

Most of that table is server-side API economics, but the same instinct applies to an interactive coding session: **work in tight bursts, not long drips.** If you're iterating on one file, keep the turns close together so the provider's cache for that file stays warm between requests — leave for a coffee and a meeting and you come back to a cold cache paying full write cost again. Bunch the exploration, the edits, and the review into the same window. It's the same "fewer tokens, fewer watts, fewer dollars" loop this whole post runs on, just timed.

---

## Memory Compounds — Reuse Beats Re-Derivation

The most expensive token is one spent re-discovering something already known. This project's own memory index made that concrete in a single session log:

> Loading 50 indexed observations cost **23,909 tokens to read**. The work that originally produced those observations — research, building, deciding — cost **485,629 tokens**. Reusing the index instead of re-deriving the same context: **95% fewer tokens**, for the same starting knowledge.

That's not a benchmark claim, it's one real number from one real session — but the mechanism generalizes: any time context is captured once (a memory file, a spec, a knowledge graph, a CLAUDE.md gotcha) and *read* on every subsequent occasion instead of *re-derived*, the savings compound across every future session that touches the same ground.

The infra that makes this systematic instead of accidental: **skills** — Claude Code's own skill system, and OpenCode's equivalent plugin system — package a repeatable workflow (file a bug, write a spec, run a security audit) into something invoked by name instead of re-explained in prose every time it comes up. **Memory plugins** go a layer further: they persist facts, corrections, and decisions *across sessions*, so a new conversation starts with everything a prior one learned instead of from zero. Same "capture once, reuse forever" principle as caching above — just moved from a manual habit into installed tooling.

---

## Compact Before You Run Out — Summarize, Don't Replay

Context has its own cost curve: every extra token sitting in the window is a token every subsequent turn re-pays for, in both dollars and attention — the same context-rot mechanic as "Feed Less, Not More" above, just measured in session length instead of file count. The fix isn't finishing one unbroken thread; it's closing a session deliberately before it gets there.

When a session's context is getting large — a long debugging thread, a big multi-file refactor, a research spiral — write a short summary of what's been decided and done, then start a fresh session and hand it that summary instead of the full transcript. Most agentic tools now do a version of this natively (compaction commands, session-summary hooks), but the manual version works everywhere: a markdown file with "what we tried, what worked, what's next" costs a few hundred tokens to write once and read forever, instead of every future turn re-reading — and re-paying for — the entire prior conversation.

---

## Mine Your Own History — Stop Paying for the Same Mistake Twice

Every repeated correction is a hidden multiplier on the "number of attempts" term from the cost equation at the top of this post — the agent doesn't fail once, it fails the *same way* every time nobody tells it to stop. Two logs already sitting on disk are worth mining for exactly this, and most teams never look at either:

- **Session/chat logs.** This project's own auto-memory has a `feedback` category built for it: "any time the user corrects your approach... or confirms a non-obvious approach worked, save what is applicable to future conversations." This repo's memory index already has two live examples — a note that command hooks beat prompt hooks for deterministic checks, and one that skills should install globally, not per-project — corrections made once in a session, now loaded automatically at the start of every future one instead of being re-explained from scratch.
- **PR review comments.** If the same review comment shows up on three different PRs — a missing null check, an error message that isn't pulled from the constants file, an `any` type that should've been a real one — that isn't three isolated nits, it's a pattern the model will keep reproducing until someone tells it once, permanently. That's exactly what a `CLAUDE.md`'s "Critical Gotchas" or "PR Review Rules" section is for: recurring review feedback, distilled once, applied on every future session without a human retyping the same comment a fourth time. (My own tool, **branchdiff**, does this mechanically — its review skill reads resolved/dismissed threads before commenting, so a dismissed nit with a reason isn't re-raised next pass. The tool enforces the discipline I'm describing by hand above.)

> Both of the above are why tooling and reference material belong in the talk and the blog, not just the prose: the *pros* of a tool are in its README, but the **cons — what it costs in device load, license, or ban risk, and whether you keep it or cut it — are where the real-world experience actually lives.** Marketing only shows the pros. The decisions below are the cuts.

The token math is the same "capture once, reuse forever" pattern as the memory index above — just pointed backward at your own mistake history instead of forward at new work. A correction re-explained in chat costs a few hundred tokens *every time it recurs*. The same correction encoded once in a rule costs those tokens once, then applies for free on every future turn where it's relevant.

---

## Write Less Code, Read Less Code Later

Every line of code written today is a line some future session has to load into context to understand, review, or modify. Fewer lines isn't just a maintainability win — it's a standing token discount on every future interaction with that file.

Jeff Atwood put it plainly back in 2007: **"the best code is no code at all."** Every line you bring into the world is a line that has to be debugged, read, understood, and supported — that's technical debt in its most literal form. In the AI-agent era it compounds twice: once as the maintenance burden it always was, and again as a token bill every future session pays just to load the file before it can do any actual work on it.

Benchmark medians across five everyday coding tasks (email validator, debounce, CSV sum, countdown timer, rate limiter) across three model tiers, comparing a YAGNI-first approach against no constraint:

| Metric | No constraint | Lean-by-default | Change |
|---|---|---|---|
| Lines of code | 100% | 6–20% | 80–94% less |
| Cost | 100% | 23–53% | 47–77% less |
| Speed | 1× | 3–6× | 3–6× faster |

Deletion beats addition, boring beats clever, and the smallest correct diff wins — not for aesthetic reasons, but because every unnecessary abstraction is context every future session pays to load.

---

## The Dev-Team Angle

The error-fixing share from the cost equation above isn't a rounding error at team scale — the top 10 tasks industry-wide make up close to a fifth to a quarter of all conversations, and engineering teams are, structurally, the heaviest token consumers in most organizations that adopt AI coding tools.

That makes token discipline a team-economics lever, not a personal frugality habit. A 47–77% cost reduction on the highest-volume workload in the company (from the table above) moves a real line item — and it costs nothing in output quality, because every technique here is a routing, caching, or context-hygiene change, not a capability cut.

---

## Fewer Tokens, Fewer Watts

There's a dimension to this that never shows up on any invoice: electricity and water. Global data-center electricity demand was already an estimated 460–490 TWh in 2025; AI workloads are the reason it's projected to roughly double by 2030, with AI-specific data centers alone expected to draw **945 TWh** — nearly triple the combined annual electricity use of Pakistan, Bangladesh, and Nigeria, three countries home to 650M+ people. The same 2025 baseline carried an estimated **32.6–79.7 million tons of CO2** and **312.5–764.6 billion liters of water** for cooling. UN researchers are now measuring AI's footprint against entire countries, not companies.

None of that is on the pricing page either. Every unnecessary retry, every full-repo re-read that a knowledge graph could have answered in a few hundred tokens instead, every task upgraded to Opus that Haiku would have solved just as well — is a small amount of *real* electricity and *real* water spent on work that didn't need doing. That's not a guilt trip; it's just the honest scope of what "fewer tokens" actually means. Liquid cooling is cutting water use per data center 70–90% industry-wide, which helps — but the lever on our side of the API call is the same one this whole post has been making: do the same job in fewer tokens.

---

## The Subsidy Clock Is Running Out

One more reason today's prices aren't the real prices: **they're not real prices yet.** OpenAI, Anthropic, Google, and Meta are all pricing inference below what it costs them to serve it. OpenAI's own numbers show roughly $2 spent for every $1 earned on inference, with $14B in losses projected for 2026 and $44B in cumulative losses before profitability arrives — by their own timeline — in 2029. A fully-utilized $200/month ChatGPT Pro plan would cost close to **$14,000/month** at published API rates: a 70x subsidy gap that exists because labs are buying market share with venture capital, not because inference is actually that cheap. This isn't a fringe observation anymore — Forbes ran a July 2026 piece bluntly titled *"AI Costs More Than The People It Replaced,"* and the same reporting surfaced that **Uber reportedly burned through its entire 2026 AI coding budget in four months.** The sticker shock is becoming the headline, not the footnote.

> **News callout:** *["AI Costs More Than The People It Replaced"](https://www.forbes.com/sites/jemmagreen/2026/07/02/ai-costs-more-than-the-people-it-replaced/)* — Jemma Green, Forbes, Jul 2, 2026. The Uber budget figure was widely circulated in discussion of that piece.

That subsidy is already unwinding. Anthropic moved enterprise customers from flat-rate plans to usage-based billing tied to actual compute in April 2026. GitHub Copilot — the tool ~4.7 million paying developers already use — follows on **June 1, 2026**: every plan moves from a flat allotment of "premium requests" to metered AI Credits priced off real per-token API rates, and the fallback that used to drop heavy users to a cheaper model when they ran out is gone entirely. Pro still lists at $10/month — it just now buys $15 of credits instead of an unlimited allotment. Same sticker price, a meter where there used to be a flat rate. Analysts expect frontier API prices to rise within 12–24 months, and enterprise AI bills to land 30–50% above today's levels once pricing reflects real infrastructure cost. (The honest counterweight: Gartner still expects the underlying cost *per unit* of inference to keep falling from hardware and algorithmic efficiency — this isn't pure doom, it's a floor rising under a ceiling that's also dropping.)

Either way, the habits in this post stop being optional the moment the subsidy ends. A team that's already routing by task, caching aggressively, and keeping context lean barely notices the price hike when it lands. A team that's defaulted to the flagship model on every request — because it was cheap enough not to think about — is about to feel the whole 30–50% at once, with no muscle memory for absorbing it.

## Make the Meter Visible — Track Before You Cut

You cannot cut what you cannot see, and the single biggest reason teams overspend is that the meter is invisible by default. The good news: every agent writes local session logs, so tracking is *always* possible even when the built-in command is weak. The built-in visibility is uneven across agents, though, so pick the tracker that reads *your* agent's logs:

| Agent | Native tracking | Where its logs live | Reach for |
|---|---|---|---|
| **Claude Code** | `/cost` (session token + spend), `/context` (window fill = context-rot warning), `/usage-credits` (org spend), status line, Agent SDK | local usage files | **ccusage**, tokscale |
| **Codex CLI** | in-session token totals (input / cached input / output) — lighter than Claude's, users routinely want more | `~/.codex/sessions/*.jsonl` | **tokscale**, Dynatrace |
| **OpenCode** | stored token/cost totals shown in the session context — but **no dedicated tracking command** | local SQLite / JSON | **opencode-stats**, Portkey |
| **All / enterprise** | — | — | Dynatrace, Portkey, AgentsView |

**The trackers, with their pros and cons** (because, again, the READMEs only ship the pros):

- **[ccusage](https://github.com/ccusage/ccusage)** — ✅ the one I reach for on Claude Code: daily/weekly/monthly/per-session reports plus a **5-hour-block** view that maps directly onto the subscription window caps (you *see* a heavy day hitting the wall before you hit it), plus a live dashboard. ❌ Con: Claude-centric — it's expanding to other agents but it's not a true cross-agent dashboard yet.
- **[tokscale](https://github.com/junhoyeo/tokscale)** — ✅ genuinely cross-agent: one CLI + dashboard across multiple coding agents, which matters when you run Claude *and* Codex *and* OpenCode in parallel (the multi-agent device theme from earlier). ❌ Con: newer and less mature than ccusage's Claude-specific depth.
- **opencode-stats** (Rust, `lib.rs/crates/opencode-stats`) — ✅ fills OpenCode's exact gap: reads the local SQLite/JSON, shows token usage + cost estimates + 365-day stats. ❌ Con: OpenCode-only.
- **Dynatrace / Portkey** — ✅ enterprise-grade, multi-agent governance and access control (Dynatrace expanded in April 2026 to cover Claude Code, Gemini CLI, Codex CLI, OpenCode, and Copilot SDK). ❌ Con: governance-shaped, not hacker-shaped — overhead an individual or small team doesn't need.

The point isn't which dashboard — it's the habit: **glance at usage before you escalate a task to the flagship model, review the weekly report before you approve an agent run that fans out 20 subagents, and watch the 5-hour block (or your agent's equivalent) when you're on a subscription tier.** Every cut in the next section came out of exactly this kind of measurement — I cut Headroom because I *measured* the device load, and I pruned the idle graph MCP because I *measured* the context tax its schemas were charging every turn. Measure first; the optimizations are obvious once the numbers are in front of you.

---

## My Toolkit — What I Actually Run, and What I Cut

Everything above is principle. This is what's installed on my machine, dated and verdict'd — including the tools I tried and threw out, because the cuts are where the real lessons are. I ran a full evaluation on 2026-07-04 with four hard constraints: **no device slowdown, no quality loss, no context loss, zero ban risk from any frontier provider.** Those constraints sorted the whole field fast.

### The mental model: three layers, not one competition

Token-reduction tools aren't competitors — they stack on different layers:

| Layer | What it does | Example |
|---|---|---|
| **Output-side** | Make the model *write less* | Ponytail (code), caveman (prose) |
| **Input-side** | Compress what the model *reads* before it hits the LLM | RTK (shell), Headroom (files) |
| **Routing-side** | Send the request to a cheaper/fallback provider | OmniRoute, OpenRouter |

A tool only saves tokens on its own layer. The mistake is picking one "best" token tool; the win is covering each layer with the lightest thing that does the job.

### The one rule that decided most of it: ban risk lives on the wire

**A tool only risks a provider ban if it sits between Claude Code and the provider *and* mutates the payload.** Rule-injection tools (Ponytail, caveman) inject instructions into the session — they never touch the network, so the risk is literally zero. Proxy tools (Headroom, OmniRoute) intercept and rewrite traffic — risk is real, and it's *highest on subscription auth* (Max/Pro plans) and lower on your own API key. That single distinction is why my final stack contains zero proxies.

### The stack (and the cuts)

| Tool | Layer | Footprint | Verdict |
|---|---|---|---|
| **Ponytail** | Output / code | Pure rules + hooks, ~983 tokens always-on | ✅ **Run** — YAGNI-first "laziness ladder," shortest working diff; benchmark medians say 6–20% the lines, 23–53% the cost, 3–6× faster |
| **caveman** | Output / prose | Mode, zero daemon | ✅ **Run** — compressed prose, ~75% fewer tokens; overlaps Ponytail by design (one does code, one does prose — keep both) |
| **RTK** (rtk-ai/rtk) | Input / shell | Rust binary, <10ms/call, no daemon | ✅ **Run** — auto-rewrites `git status` → `rtk git status`, 60–90% off ~100 common commands; **only Bash output**, Read/Grep/Glob bypass |
| **Headroom** | Input / files | Local ML daemon + ~600MB models | ❌ **Cut** — 60–95% input reduction, AST-aware, byte-perfect, reversible cache… and exactly the device-drag failure this post warns about. Only tool covering *file-read* compression; I left that gap uncovered on purpose. If you adopt it: API-key only, never subscription auth |
| **OmniRoute** | Routing | Local proxy + SQLite | ❌ **Cut** — 237-provider cost-arbitrage gateway; answers come back from random non-frontier models, so you get quality drift, context drift, *and* the ToS-ban pattern. Fails "no quality/context loss, no bans" on all three counts |
| **token-optimizer** | Config / hygiene | Python hook per Read/Bash | ❌ **Cut** — PolyForm-NonCommercial license (blocks commercial work) plus per-call Python overhead |

Final stack: **Ponytail + caveman + RTK** — three light layers, no daemon, no proxy on the wire, all commercial-safe. The file-read compression layer stays intentionally empty, because the only tool that covered it cost more in device load than it saved in tokens.

### The graph-tools call — same tools, two contexts, two verdicts

This is the nuance I'd get wrong if I just said "use graphify" or "don't." I run **graphify and code-review-graph on specific repos** — this blog repo included — *behind resource-guarded git hooks* (the Stop hook runs CRG's ~0.425s incremental update, graphify rebuilds only as a detached `nohup` after commits with a CPU/memory guard). What I explicitly *don't* run is the **always-on global MCP daemon** — on 2026-07-04 I removed `code-review-graph` from my global config because its background embeddings + indexing daemon was the exact thing making my daily-driver laptop slow across every project, whether that project needed a graph or not.

Same lesson, sharper version: **an idle MCP server still costs context every turn.** Even abandoned, `code-review-graph` was loading 30+ tool schemas into every session's context before a single word was typed. Pruning it reclaimed that context with zero downside. The biggest free token lever is often a tool you're not using anymore that's still paying its schema tax.

### branchdiff — my own review tool, as a token mechanism

I built **branchdiff** (local diff viewer + AI review at `localhost`, nothing leaves the machine), and its token economics are deliberate, not accidental:

- **Controlled context surface.** `branchdiff review context` pipes *just the diff* to the model — not a full repo dump. The AI sees exactly what changed, nothing more.
- **Nth-time review awareness.** Before commenting, the review skill reads already-resolved and dismissed threads. Resolved points aren't re-raised; dismissed ones only come back with new evidence. Run `/branchdiff-review` after every commit without re-litigating the same feedback — that's the "Mine Your Own History" pattern from earlier, built into the tool.
- **Focused passes over full dumps.** A security-only pass on a 200-line auth diff produces five precise comments instead of fifty; for a 200-file refactor, point the AI at the riskiest ten files first and run a second pass only if needed. Less output tokens, higher signal.

The pattern across all of it: **the lightest layer that does the job, never a proxy on the wire, and cut anything that pays a daemon or schema tax you're not using.** That's the stack, and it's the reason the rest of this post's numbers hold up on a real laptop, not just a benchmark.

---

## Judgment, Not Just a Checklist — Output, Outcome, Impact

AI's headline effect isn't better decisions — it's more Output. A model can draft the code, the summary, the migration plan, all day, instantly. But Output, Outcome, and Impact are three different things, and AI only ever hands you the first one:

- **Output** — the immediate, direct result the model generates: a code snippet, a summarized document, a predictive score.
- **Outcome** — the observable shift in behavior or process *caused by* that output: a bug actually stops recurring, a report actually gets acted on.
- **Impact** — the ultimate business or strategic value that shift produces: lower support cost, higher revenue, a team that ships without burning out.

More Output doesn't automatically buy more Outcome, and more Outcome doesn't automatically buy more Impact. A model can generate ten pull requests in the time a human generates one — that's Output, verifiable in seconds. Whether those ten PRs actually reduce defect rates (Outcome), and whether that shows up as fewer incidents and a calmer on-call rotation six months later (Impact), is not something the model decides. That gap — between what AI can *produce* and what actually *changes* — is exactly where judgment lives: an engineering read on what will actually break, and a business read on what's actually worth paying for downstream, before the extra Output is worth anything at all.

Everything in this post is one instance of that same gap, pointed at cost instead of code volume:

| Output (what you did) | Outcome (what changed) | Impact (the long-term difference) |
|---|---|---|
| Route lookups to Haiku/GLM/MiniMax instead of the flagship | Same task costs 5–25× less | Team absorbs the subsidy unwind without a budget shock |
| Structure prompts for caching (static prefix front, batch inside the TTL) | Repeated-prefix reads cost 90% less | The same fixed AI budget covers new work, not repeated context |
| Prune the idle graph MCP daemon | Every session carries ~30 fewer tool schemas | Laptop stays responsive across concurrent worktrees — no thermal throttling |

None of these picks itself, and neither does any other AI output in your organization. The checklist below is the Output layer of this specific post; deciding which lines actually turn into Outcome and Impact *for your team* is the part no checklist — and no model — can do for you.

---

## Checklist — Apply This Week

- [ ] **Make the meter visible first** — your agent's built-in usage command (Claude's `/cost`/`/context`, Codex's session totals, OpenCode's stored totals) or a cross-agent tracker like ccusage/tokscale; you can't cut what you can't see
- [ ] Route by task: cheap tier (Haiku, GLM, MiniMax, Kimi) for lookups, mid tier as default, flagship only when reasoning depth justifies 5–25x the cost
- [ ] Match the tool to the constraint that actually binds — data residency → local, cross-vendor flexibility → OpenRouter/OpenCode, out-of-the-box agent quality → Claude Code/Codex
- [ ] Keep `CLAUDE.md` under ~200 lines; move file-specific patterns into globbed `rules/`
- [ ] Replace prompt-based lint/type checks with command hooks
- [ ] Index the codebase once (Tree-sitter-based graph, not LLM-based) instead of re-reading it every session
- [ ] Dispatch exploration and research to subagents; keep the main thread to conclusions
- [ ] Turn on prompt caching — and structure for it: static prefix at the front, dynamic state at the back, batch reads inside the TTL window (break-even ≈1.4 reads/write)
- [ ] Guard any background job — hooks, rebuilds, local inference — with CPU/memory checks and process dedupe before running multiple worktrees or projects in parallel
- [ ] Capture decisions in memory/spec files once — read them, don't re-derive them
- [ ] When a session's context gets long, write a short summary and start fresh instead of replaying the whole transcript — a bigger context window is not a free lunch
- [ ] Mine session logs and PR review comments for recurring corrections; encode each one once into `CLAUDE.md`/rules instead of re-correcting it every time it recurs
- [ ] Default to the smallest correct diff; every deleted line is a discount on every future session
- [ ] Treat an unnecessary token as a small real energy-and-water cost, not just a cent — the same discipline covers both
- [ ] Don't build workflows that assume today's subsidized price is permanent — these habits are the buffer for when usage-based billing lands on your desk

---

## The Bottom Line

The cheapest model was never the one with the lowest price per token — it's the one that reaches the correct answer in the fewest tokens, on the first attempt, on a device that isn't choking. Pull these levers while they're still optional, not after usage-based billing makes them mandatory.

Open `~/.claude/rules/model-routing.md` — or whatever your tool calls it — and route one task to the cheapest model that can actually do it.

---

## References

**Pricing & Benchmarks (primary sources):**
- [Artificial Analysis — "Gemini 3.5 Flash: The new leader in intelligence versus speed"](https://artificialanalysis.ai/articles/gemini-3-5-flash-everything-you-need-to-know) (May 19, 2026) — source for the cheap-per-token-trap chart: $1,552 (Flash 3.5) vs ~$887 (3.1 Pro) vs ~$282 (Flash 3, predecessor) to run their Intelligence Index eval suite
- [Scale AI Leaderboards — SWE-bench Pro (SEAL, standardized scaffolding)](https://labs.scale.com/leaderboard/swe_bench_pro_commercial) — source for the 69.2% vendor-scaffold vs 59.1% standardized-scaffold gap
- [Anthropic — Introducing Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)
- [Anthropic API Pricing — Claude Platform Docs](https://platform.claude.com/docs/en/about-claude/pricing)

**Pricing & Benchmarks (secondary aggregators, cross-checked):**
- [Best AI Model for Coding — SWE-bench Pro Score and Cost per Task](https://www.morphllm.com/best-ai-model-for-coding) — Haiku 4.5 cost-per-point figure
- [SWE-bench Pro Leaderboard (2026)](https://www.morphllm.com/swe-bench-pro) — explains the Scale SEAL vs vendor-scaffold methodology gap in plain terms
- [Codex vs Claude Code (July 2026) — Benchmarks, Subagents & Limits](https://www.morphllm.com/comparisons/codex-vs-claude-code)
- [OpenCode — the open source AI coding agent](https://opencode.ai/)
- [OpenRouter — Pricing](https://openrouter.ai/pricing) and [Prompt Caching guide](https://openrouter.ai/docs/guides/best-practices/prompt-caching)
- [Local LLM Hardware Requirements in 2026](https://overchat.ai/ai-hub/llm-hardware-requirements)

**Context Engineering:**
- [Anthropic — Context engineering: memory, compaction, and tool clearing (Claude Cookbook)](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)
- [Don't Break the Cache: Prompt Caching for Long-Horizon Agentic Tasks](https://arxiv.org/pdf/2601.06007)

**Prompt Caching (primary docs — source for the caching chart & break-even):**
- [Anthropic — Prompt caching (1.25×/2.0× write, 0.10× read, 5-min/1-hr TTL)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [OpenAI — Prompt caching (up to 24-hr default, 50% off ≥1024 tok, automatic)](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Google — Gemini context caching (90% off, implicit vs explicit, 60-min TTL)](https://ai.google.dev/gemini-api/docs/caching)

**Caching strategy & the 5-minute TTL cliff (analysis, cross-checked against docs above):**
- [Claude Prompt Caching in 2026 — the 5-minute TTL change costing you money](https://dev.to/whoffagents/claude-prompt-caching-in-2026-the-5-minute-ttl-change-thats-costing-you-money-4363)
- [Prompt Caching Deep Dive — when it helps, when it hurts, the 270s cliff](https://dev.to/whoffagents/prompt-caching-deep-dive-when-it-helps-when-it-hurts-and-the-270s-cliff-291j)

**Multi-Vendor & Open-Weight Pricing (July 2026):**
- [GitHub Blog — GitHub Copilot is moving to usage-based billing](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/) — source for the Copilot AI Credits shift
- [Reddit r/copilotstudio — "Woke up to a $47K bill after deploying ONE Copilot agent"](https://www.reddit.com/r/copilotstudio/comments/1ueqedl/woke_up_to_a_47k_bill_after_deploying_one_copilot/)
- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing) — GPT-5.6 family (Luna/Terra/Sol) and GPT-5.5
- GLM-4.6 (Zhipu/Z.ai) and MiniMax M2 and Kimi K2.6 (Moonshot) — pricing aggregated from provider docs and OpenRouter model pages, cross-checked mid-2026
- [Jeff Atwood — "The Best Code is No Code At All"](https://blog.codinghorror.com/) (2007) — source for the "best code is no code at all" line

**Usage Data:**
- [Anthropic Economic Index report: Cadences](https://www.anthropic.com/research/economic-index-june-2026-report)
- [Anthropic Economic Index report: Learning curves](https://www.anthropic.com/research/economic-index-march-2026-report)
- [Anthropic Economic Index — country usage (Bangladesh: 116/121, usage index 0.11)](https://www.anthropic.com/economic-index#country-usage)

**Environment & Subsidy Economics:**
- [UN News — AI's environmental costs threaten water, land and climate](https://news.un.org/en/story/2026/06/1167658)
- [AI Environment Statistics 2026 — power and water use](https://www.allaboutai.com/resources/ai-statistics/ai-environment/)
- [Model subsidies are ending. What do you do now? — Arize AI](https://arize.com/blog/ai-model-subsidies-ending-llm-inference-costs/)
- [AI Inference Cost Crisis 2026 — why OpenAI loses $1.35 per dollar earned](https://aiautomationglobal.com/blog/ai-inference-cost-crisis-openai-economics-2026)
- ["AI Costs More Than The People It Replaced" — Jemma Green, Forbes, Jul 2, 2026](https://www.forbes.com/sites/jemmagreen/2026/07/02/ai-costs-more-than-the-people-it-replaced/) (headline + Uber budget anecdote)

**Related posts from this repo:**
- [Claude Code Configuration Blueprint - The Complete Guide for Production Teams](./Claude%20Code%20Configuration%20Blueprint%20-%20The%20Complete%20Guide%20for%20Production%20Teams.md)
- [Graphify + code-review-graph: Build a Self-Updating Knowledge Graph](./Graphify%20+%20code-review-graph:%20Build%20a%20Self-Updating%20Knowledge%20Graph%20for%20Claude%20Code%20and%20other%20AI%20Coding%20Agent.md)
- [Self-Review With AI Before You Open the PR — branchdiff](./branchdiff/Self-Review%20With%20AI%20Before%20You%20Open%20the%20PR%20-%20A%20Practical%20Workflow%20with%20branchdiff.md)

**My toolkit (tool sources — what I run / what I cut):**
- 📊 Track first (cross-agent): [ccusage](https://github.com/ccusage/ccusage) (Claude) · [tokscale](https://github.com/junhoyeo/tokscale) (multi-agent) · [opencode-stats](https://lib.rs/crates/opencode-stats) (OpenCode) · built-in `/cost`, `/context`, `/usage-credits`
- ✅ Run: [Ponytail](https://github.com/DietrichGebert/ponytail) (output/code) · caveman (output/prose) · [RTK](https://github.com/rtk-ai/rtk) (input/shell)
- ❌ Cut: [Headroom](https://github.com/headroomlabs-ai/headroom) (device drag) · [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (ban risk) · [token-optimizer](https://github.com/alexgreensh/token-optimizer) (license)
- ⚠️ Context-dependent: graphify + code-review-graph (project-local only) · [branchdiff](https://github.com/Encryptioner/branchdiff-releases) (review — my own)

> *Pros are in each tool's README; the cuts and the device/ban/license reasons behind them are from my own 2026-07-04 evaluation, not the marketing pages.*

---

## Let's Connect

Thank you for the time — genuinely. If you try any of this, I'd rather hear what broke than what worked:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
- **Support**: [SupportKori](https://www.supportkori.com/mirmursalinankur)
