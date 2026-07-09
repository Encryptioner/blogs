## Slide 1: Title Slide

# Token Economics
## Better Results, Fewer Tokens

**Presented by:** Ankur Mursalin
**Lead Software Engineer, Nerddevs — 7+ years in production TypeScript/Node, now leading a team that ships more code through AI agents than by hand**

*Last month my MacBook fan spun up like a jet engine mid-standup — three worktrees, three agents, all fighting for the same cores. That's where this talk actually started.*

---

## Slide 2: The Hidden Meter

# 🎯 Every AI Session Has a Meter Running

- We watch output quality. We ignore the token counter.
- Then the monthly bill — or "context limit reached" — shows up.
- Coding is the **#1 use case** for AI agents industry-wide — "fixing errors" alone is ~10% of enterprise API traffic (Anthropic Economic Index).
- Token discipline isn't a personal habit — it's a **team cost lever**.

---

## Slide 3: The Real Cost Equation

# 💰 Cost ≠ Price Per Token

```
cost = (price per token) × (tokens per task) × (attempts)
```

Vendors advertise factor 1. Factors 2 and 3 are yours to control — and where the real money moves.

---

## Slide 4: The Cheap-Token Trap

# ⚠️ Cheaper Per Token ≠ Cheaper Per Task

**Gemini 3.5 Flash:** $1.50/M input vs Gemini 3.1 Pro's ~$2.00/M — looks like the win

**Real cost to run Artificial Analysis's Intelligence Index (their own published eval):**
- Gemini 3.5 Flash: **$1,552**
- Gemini 3.1 Pro: **~$887**
- Gemini 3 Flash (predecessor, same suite): **~$282**

Cheaper per token → 75% *more expensive* per workload — 3× pricier per token than its own predecessor, plus more input tokens from longer agentic turns. Both factors stack.

![Cheaper per token vs cheaper per task](../assets/B-16/cost-per-task-chart.png)

*Source: Artificial Analysis, "Gemini 3.5 Flash: the new leader in intelligence versus speed," May 19, 2026.*

---

## Slide 5: Model Tiering

# 🎛️ Pay for Reasoning Only When Needed

| Model | Input | Output | Use for |
|---|---|---|---|
| Haiku 4.5 | $1/M | $5/M | Lookups, file discovery |
| Sonnet 5 | $2→3/M | $10→15/M | Daily implementation |
| Opus 4.8 | $5/M | $25/M | Architecture, hard debugging |

**Haiku 4.5:** ~$0.13 spent per SWE-bench Pro point — cheapest correct-fix ratio of any current model.

**Our rule** (`~/.claude/rules/model-routing.md`): default to Sonnet, escalate to Opus only when reasoning depth justifies 5–25× the cost.

---

## Slide 6: Beyond One Vendor

# 🧰 Same Arithmetic, Different Tools

| Tool | Access | The tradeoff |
|---|---|---|
| Claude Code / Codex CLI | One vendor | Predictable, but capped on heavy days |
| OpenCode (open-source) | 75+ providers, switch mid-session | One UI, any vendor's pricing underneath |
| OpenRouter | 300+ models, one key | Cross-vendor arbitrage; proxy hop for caching |
| Local (Ollama/LM Studio) | Whatever fits your hardware | **$0/token, but not free** — see next |

Pick the tool for the constraint that binds: data residency → local; flexibility → OpenRouter/OpenCode; out-of-the-box quality → Claude Code/Codex.

---

## Slide 7: Harness Beats Horsepower

# 🔧 Scaffolding Matters as Much as the Model

- Claude Opus 4.8 on its own scaffolding: **69.2%** SWE-bench Pro
- Scale AI's SEAL leaderboard, *identical* scaffolding for every model: best score is **59.1%**
- **10 points of "capability" that was actually harness** — same benchmark, same tasks, only the scaffolding changed
- Frontier LLMs reliably follow ~150–200 instructions total — Claude Code's system prompt spends ~50 before your `CLAUDE.md` even loads

**Two rules from this repo's `.claude/` setup:**
- `CLAUDE.md` under ~200 lines; globbed `rules/*.md` for file-specific patterns
- Command hooks (0 tokens, deterministic) over prompt hooks (cost tokens every call)

*Source: Scale AI SEAL leaderboard, SWE-bench Pro (standardized scaffolding).*

---

## Slide 8: One Laptop, Many Agents

# 💻 Multi-Worktree Has a Device Cost Too

Real example, this repo's graphify hook — no guard: **3 rebuild processes at 65–73% CPU each, load average 12+, RAM saturated.**

Fix: skip the rebuild if CPU load >50% of cores or free memory <2GB, plus process dedupe. Same problem, any vendor:

- Every parallel worktree = a concurrent process on the same CPU/RAM/battery
- Local models sharpen this — one 8–14B model per active session, not per worktree
- A throttled laptop produces worse agent output long before the API bill is the bottleneck

---

## Slide 9: Feed Less, Not More

# 🌊 Bigger Window ≠ Better Recall

Accuracy drops as token count climbs — even well inside the limit. **Context rot** is real; the fix is a smaller haystack, not a bigger window.

- **On-demand retrieval:** our knowledge graph (`graphify` + `code-review-graph`) indexes 1,000+ files for **0 LLM tokens**; skipping it burns ~20,000 tokens re-orienting every session
- **Subagents** with clean, disposable context — the transcript gets thrown away, only the conclusion survives
- **Prompt caching:** up to 90% cheaper input, ~30% faster time-to-first-token — free correctness, no quality tradeoff

---

## Slide 10: Memory Compounds

# 🧠 Reuse Beats Re-Derivation

One real session, this repo's own memory index:

- Reading 50 indexed observations: **23,909 tokens**
- Original work that produced them: **485,629 tokens**
- **95% fewer tokens** — same starting knowledge, reused instead of re-derived

**Same idea pointed backward:** mine your own chat logs and PR review comments for recurring corrections — same nit on three PRs is a pattern, not three nits. Encode it once in `CLAUDE.md`/rules; the model stops repeating the mistake, and "number of attempts" from Slide 3 stops multiplying.

Capture once. Read forever. Don't re-derive — forward *or* backward.

---

## Slide 11: Less Code, Less to Reload

# ✂️ Every Line Written Is a Line Reloaded Later

Benchmark medians, lean-by-default vs. no constraint (5 tasks, 3 models):

| Metric | No constraint | Lean-by-default |
|---|---|---|
| Lines of code | 100% | 6–20% |
| Cost | 100% | 23–53% |
| Speed | 1× | 3–6× |

Fewer lines today = a standing token discount on every future session that touches the file.

---

## Slide 12: Beyond the Bill

# 🌍 Two Reasons This Isn't Only About Money

**Energy & water:** AI data centers alone are projected to draw **945 TWh by 2030** — nearly triple Pakistan + Bangladesh + Nigeria's combined electricity use. 2025 baseline: ~33–80M tons of CO2, ~313–765 billion liters of water. Every wasted token is a real watt and a real drop.

**The subsidy is ending:** OpenAI spends ~$2 per $1 earned on inference — $14B in 2026 losses. A $200 ChatGPT Pro plan would cost ~$14,000/mo at real API rates (70x gap). Anthropic and GitHub already moved enterprise customers to usage-based billing in 2026. Prices rise 30–50% within 12–24 months.

---

## Slide 13: Checklist

# ✅ Apply This Week

- [ ] Route by task: haiku → sonnet (default) → opus
- [ ] Match the tool to the constraint that binds — local, OpenRouter/OpenCode, or Claude Code/Codex
- [ ] `CLAUDE.md` under ~200 lines; globbed rules for the rest
- [ ] Command hooks over prompt hooks for deterministic checks
- [ ] Index once (Tree-sitter), query on demand; cache prompts; reuse memory instead of re-deriving it
- [ ] Mine chat logs and PR review comments for recurring corrections; encode each one once, don't re-correct it every time
- [ ] Guard background jobs (CPU/memory + dedupe) before running multiple worktrees
- [ ] Smallest correct diff, always — it's a discount on every future session, every watt, every dollar

---

## Slide 14: The Bottom Line

# 🎉 The Bottom Line

The MacBook fan and the burned token budget were the same failure wearing different costumes — too many tokens spent finding what a sharper request would've found in one pass.

The cheapest model was never the one with the lowest price per token. It's the one that reaches the correct answer in the fewest tokens, on the first attempt, on a device that isn't choking — and it's the only version of this that survives the subsidy clock running out.

**Pull all five levers while they're still optional, not after usage-based billing makes them mandatory.**

---

## Slide 15: Resources & References

# 📚 Resources & References

## Data Sources (primary)
- [Artificial Analysis — Gemini 3.5 Flash cost analysis](https://artificialanalysis.ai/articles/gemini-3-5-flash-everything-you-need-to-know) — the cheap-token-trap chart
- [Scale AI SEAL — SWE-bench Pro standardized leaderboard](https://labs.scale.com/leaderboard/swe_bench_pro_commercial) — the harness-swing slide
- [Anthropic — Claude Sonnet 5 pricing](https://www.anthropic.com/news/claude-sonnet-5)
- [Anthropic Economic Index — Cadences report](https://www.anthropic.com/research/economic-index-june-2026-report)
- [UN News — AI's environmental costs](https://news.un.org/en/story/2026/06/1167658)
- [Model subsidies are ending — Arize AI](https://arize.com/blog/ai-model-subsidies-ending-llm-inference-costs/)

## Data Sources (secondary, cross-checked)
- [Best AI Model for Coding — SWE-bench Pro cost per task](https://www.morphllm.com/best-ai-model-for-coding)

## Author's Articles
- [Token Economics: Better Results, Fewer Tokens](https://nerddevs.com/author/ankur/)
- [Claude Code Configuration Blueprint](https://dev.to/mir_mursalin_ankur)
- [Graphify + code-review-graph](https://dev.to/mir_mursalin_ankur)

## Connect with Author
- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [linkedin.com/in/mir-mursalin-ankur](https://linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [github.com/Encryptioner](https://github.com/Encryptioner)
- **Twitter**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)

---

## Slide 16: Closing

# One Thing, Tonight

Open your model-routing rule — or write one if you don't have it — and send one task to the cheapest model that can actually do it.

That's the whole talk, in one action.

**Thank you — I'd rather hear what broke than what worked. Come find me after.**
