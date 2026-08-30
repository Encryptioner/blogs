# Editor Guide — Accessibility & Publishing Rules

## Headings — Accessibility

- **Never use `#` (h1) in post body.** The post title is already h1. Multiple h1s confuse screen readers and assistive tech.
- Start body sections at `##` (h2).
- Nest with `###` (h3), `####` (h4). Don't skip levels.
- Rule of thumb: `##` = Part/Path, `###` = section under it, `####` = sub-section under that.

## Image Alt Text — Accessibility

- Always provide meaningful alt text for images.
- Format: `![Description of what the image shows](path/to/image.png)`
- Describe the content, not the decoration. Screen readers read this aloud.
- Alt text should convey the same information the sighted reader gets from the image.

## Markdown

- Use standard markdown. Inline HTML is allowed when needed.
- Code blocks: triple backticks with language identifier.
- Tables, blockquotes, lists — all standard markdown.

## Platform-Specific Notes

### DEV.to
- Front matter required: `title`, `published`, `tags` (max 4, comma-separated)
- Optional: `cover_image` (best size 1000×420), `series`, `canonical_url`
- Embed external content with `{% embed URL %}` — tweets, GitHub issues, YouTube, etc.
- Source: https://dev.to/p/editor_guide
