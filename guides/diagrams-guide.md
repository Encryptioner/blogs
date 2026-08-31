# Diagrams Guide — Mermaid Workflow for Blogs & Presentations

## When to add a diagram

- A blog section or deck slide describes a non-trivial flow, state machine, sequence, or pipeline — something easier to read as a picture than a paragraph.
- One diagram per genuinely distinct concept. Don't reuse the same diagram across multiple blogs/decks for different ideas, and don't add one for a one-line flag or a trivial fact — that's diagram-per-sentence overkill.

## Source → asset pipeline

1. Write the diagram as mermaid syntax (`flowchart`, `sequenceDiagram`, etc.) in a `.mmd` file.
2. Render it: `scripts/render-mermaid.sh <input.mmd> assets/B-NN/<diagram-name>`
3. Output is a triple in that asset folder: `<name>.mmd` (source, kept for regeneration), `<name>.svg`, `<name>.png`.

`.mmd`/`.svg` are kept for future edits; `.png` is what markdown and decks actually embed — Medium strips inline SVG, so PNG is the one format that's portable everywhere this repo publishes.

## Theme: light by default

- The script's default is light theme (white background, dark text). Use it unless the diagram will genuinely only ever be viewed inside a fixed-dark-chrome deck.
- Why: blog markdown renders on GitHub, dev.to, and Medium — none of them under this repo's control, and Medium has no dark mode at all. A dark-rendered diagram is light text on transparency there — invisible.
- Every existing hand-designed diagram asset in this repo already follows this rule (light card, shared as-is between a blog post and its companion deck). Match it — don't invent a dark variant without a concrete reason.
- Pass `--dark` only for an asset that will never be embedded in a blog post.

## Embedding

- **Blog markdown:** `![Full descriptive sentence of what the diagram shows](../../../assets/B-NN/name.png)` — the `../` depth depends on the blog's folder nesting (three levels up from `topics/{category}/{subcategory}/*.md`).
- **Presentation deck:** `<div class="fig" onclick="openLightbox(this)"><img src="../../assets/B-NN/name.png" alt="..." loading="lazy" /><div class="fig-caption">short caption</div></div>` — same `.png`, two levels up from `presentations/P-N-*/`.
- One diagram, one file, referenced identically from both. Don't duplicate a diagram into separate blog/deck images.
- Alt text is a full descriptive sentence (what the diagram shows), not a caption — screen readers read it aloud. A deck's separate `.fig-caption` can carry the short version.

## Non-mermaid diagrams

A hand-designed diagram (built in a design tool, not mermaid) still gets an SVG source and a PNG, but convert it with `scripts/svg-to-png.sh path/to/file.svg` instead of `render-mermaid.sh`.

## Worked example

`assets/B-15/change-map-on-demand.*`, `assets/B-14/self-review-pipeline.*`, and the rest of the branchdiff diagrams added alongside its v2.2 feature update are a full worked example of this pipeline end to end — one diagram per concept, embedded identically in the blog and its companion deck.
