# Post Architecture

One layout for every blog, its social posts, and its later deck. A post is a **bundle**: the English blog, its assets, and a `research/B-N/` folder holding everything that is not the blog itself.

## Layout

```
topics/<Category>/<Topic>/<Title>.md     # English blog (the only publishable long-form)
assets/B-N/                              # cover.png, diagrams (.mmd + .png), images
research/B-N/
  brief.md          # angle, audience, thesis, what is in/out of scope
  research.md       # raw R&D: measurements, commands, results, failures (sanitized)
  references.md     # every external source: title, URL, date accessed, what it supports
  social/
    en-linkedin.md
    en-facebook.md
    bn-linkedin.md  # Bangla, written natively, not machine-translated line by line
    bn-facebook.md
  deck-brief.md     # added later: slide outline for P-N, sourced from the blog
```

Blog numbers follow `INDEX.md`. The `research/B-N` number always equals the `assets/B-N` number.

## Lifecycle

| Stage | Output | Gate |
|-------|--------|------|
| 1. Brief | `brief.md` | Thesis stated in one sentence |
| 2. R&D | `research.md`, `references.md` | Every claim has a measurement or a reference |
| 3. Sanitize | Sanitized section of `research.md` | Checklist below passes |
| 4. Blog | Blog `.md`, `assets/B-N/` | Cover, alt text, closing block, References section |
| 5. Social | `social/*.md` | Each post links the blog and cites at least one source |
| 6. Register | `INDEX.md`, `README.md` | See CLAUDE.md "Listing files" |
| 7. Deck (later) | `deck-brief.md` then `presentations/P-N` | Built from the blog, not from raw research |
| 8. Publish | Substack, site | Owner confirms every publish step |

## References rule

- The blog ends with a `## References` section (before `## Let's Connect`). Number them `[1]`, `[2]` and cite inline.
- `references.md` is the full list; the blog lists only what it cites. Each entry: title, URL, accessed date, one line on what it supports.
- Prefer primary sources: official docs, release notes, issue trackers, benchmarks you ran yourself. A secondary source (another blog) is fine when it is the only place a fact lives; label it.
- Social posts carry a short reference line or link, not a full list.
- Never cite an AI answer or a share link as a source. Use it as a lead, then find the primary source.
- Your own measurements are references too: state tool versions, machine class (not the device name), and the command shape.

## Sanitization checklist (case studies on real projects)

Before anything leaves `research/`:

- No project, customer, company or repo names. Use a description: "a large Express + Vue LMS monorepo".
- No domains, hostnames, IPs, bucket names, database names, ports tied to real infra.
- No absolute paths, usernames, device names, or machine identifiers.
- No env values, tokens, keys, certificates, or config contents.
- No ticket numbers or internal branch names.
- Numbers are fine when they do not identify the project (install seconds, dependency counts as ranges).
- Code snippets are rewritten to generic names; real file contents are never pasted.

## Social post rules

- English and Bangla are separate files, written for the audience, not translated word for word.
- LinkedIn: 150-250 words, a hook line, 3-5 short points, one link, a few hashtags. Facebook: shorter, more conversational.
- Plain tone, no emoji decoration, no engagement bait.
- Show the owner before posting anywhere. Posting is a separate, confirmed step.

## Deck handoff

The deck is generated from the blog: each `##` section becomes one or two slides, diagrams are reused as the same `assets/B-N` files, and the references slide mirrors the blog's References section. `deck-brief.md` records the slide order and speaker notes before `presentations/P-N` is built.
