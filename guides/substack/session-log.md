# Substack rollout — step log (2026-10-07, branch `dev/substack-publication-v1`)

Chronological record of what was done, so it can be repeated or audited. Reference: `README.md` in this folder.

## 1. Recon
1. Listed blogs from `INDEX.md` → 28 blogs (B-1..B-28). `topics/**/Global Research` and `Project Research` notes and `nerddevs/` (dup of B-6) were **not** published (internal / duplicate).
2. Used the already-logged-in Chrome tab via `chrome-devtools` MCP. Publication was empty (0 posts, 0 drafts); an unrelated "Untitled" draft (id 219198143) pre-existed — left alone.
3. Probed the editor's own API from the page (same-origin session): `POST /api/v1/drafts` needs `draft_bylines`; deleting a throwaway test draft worked.

## 2. Converter (`scripts/substack/md-to-substack.mjs`)
4. markdown-it tokens → Substack tiptap JSON (title from first `# `, subtitle from first paragraph, images → jsDelivr URLs of this repo, tables → monospace code block, html `<img>` kept, other html dropped).
5. Getting the JSON into the page: `fetch('http://localhost')` from the Substack page failed (browser blocks it), so injected an `<input type=file>` and used the MCP `upload_file` (only accepts workspace paths → copied to repo root temporarily, deleted afterwards).

## 3. Drafts → fix loop
6. Created 28 drafts via `POST /api/v1/drafts`. Editor showed "Something has gone wrong…" → console: `[tiptap error]: Invalid JSON content`.
7. Fixed schema names in three rounds (details in README → Pitfalls): `code_block`→`codeBlock` and back, `strong/em`→`bold/italic`, snake_case lists→`bulletList/listItem/orderedList`, `hard_break/horizontal_rule`→`hardBreak/horizontalRule`, `code` mark exclusive.
8. Re-pushed bodies with `PUT /api/v1/drafts/:id` (works on published posts too).
9. Verified: all 28 open in the editor (hidden-iframe smoke test, `editorLoads()` → `[]`), images load, 10 code blocks render on B-28.

## 4. Publish
10. `POST /api/v1/drafts/:id/publish` `{send:false, share_automatically:false}` in B-1→B-28 order (newest on top). No emails sent. All 28 returned 200; archive shows 28 posts with bodies.
11. Ids/slugs recorded in `scripts/substack/post-ids.json` and `published-posts.md`.

## 5. Branding
12. Reused existing blog-site identity (`docs/favicon.svg`: "Ankur's Writing", mint #00e3a8→#00996d, ink #06231b, amber #f2b84b).
13. Built `assets/brand/` SVGs → PNG with `scripts/svg-to-png.sh` (logo-square 1024², logo-wide 1200×300, cover 1600×400).
14. Uploaded via `POST /api/v1/image` (base64) and applied with `PUT /api/v1/publication`: name "Ankur's Writing", tagline, logo, wide logo, cover, accent `#00996D`, copyright, subscribe footer. Verified on the live site (green accent + logo header).
15. `homepage_type` change → 400, not done via API.

## 6. Repo changes
`scripts/substack/` (3 scripts + ids), `guides/substack/` (README, published-posts, this log), `assets/brand/`, `CLAUDE.md` (Substack in platform list), `.gitignore` (temp files). Nothing committed yet.

## Open / manual (see README → Manual steps)
Profile bio, website-editor theme/nav, custom domain, featured posts, 2FA, optional unpublish/edit of the new name if "Ankur's Writing" isn't wanted (revert: `PUT /api/v1/publication {name: "Mir Mursalin Ankur"}`).

## 7. Theme-safe redesign + site changes (same day, follow-up)
16. Problem: the wide logo (dark box, small tagline) looked bad in the header and can't adapt to themes. Substack's public site is light by default and dark only if the reader switches it (emulated `prefers-color-scheme: dark` had no effect) → design must hold in both.
17. Removed `logo-wide.*`; `logo_url_wide` set to `null`. Rebuilt `cover.svg/png` text-free (gradient + centered mark). Re-uploaded via `/api/v1/image`, applied with `PUT /api/v1/publication`.
18. Accent `#00996D` → `#008A63` (balanced ~4.3:1 vs white and vs near-black). `PUT {theme:{...}}` is rejected (400); only `theme_var_background_pop` works via API.
19. Website editor (UI, chrome-devtools MCP): Theme **Profile → Custom** (the dropdown offers only Profile / Custom), header Standard, hero Feature, background FFFFFF, accent 008A63 → Save. Result: logo + live-text name header, nav Home / Notes / Archive / About, featured latest post, tagline + subscribe box. Verified on the live site.
20. About page = publication field `subscribe_content` (JSON string of tiptap doc; the dashboard "Edit page" link only passes `bodyField=subscribe_content`). Replaced the default "Why subscribe?" with intro / what you'll find / start here (B-16, B-11, B-19) / elsewhere links.
21. Profile bio via `PUT /api/v1/user/profile {bio}`. **Previous bio (to revert):** "Lead Full-Stack Software Engineer | 7+ years of industry expertise in TypeScript, NodeJS, MongoDB, VueJS, TailwindCSS, Firebase, Flutter, Shopify & AWS | ACMP 4.0 | SaaS Solution Architect | Work impacts 500K+ users".
22. Not done on purpose: "I agree" on the Publisher agreement (Dashboard → Revenue → Payments) — legal acceptance, user's call; only needed for paid features.
23. Observed, not mine: an "Untitled" draft (id 219198143) and a later new draft in the account were created outside this work — left untouched.

Revert cheatsheet: name `PUT /api/v1/publication {name:"Mir Mursalin Ankur"}`; theme → Website editor → Theme → Profile; accent `theme_var_background_pop:"#FF6719"`.

## 8. Visitor-view fix (cover banner)
24. Logged-out check (isolated browser context) showed the subscribe overlay topped by a long dark strip with a small mark — the cover image (1600×400) rendered as a wide, mostly empty bar.
25. `PUT /api/v1/publication {cover_photo_url:null}`; re-checked with `?nocache=2` (visitor pages are cached, first reload still showed the old strip). Overlay now = square logo + name + tagline + subscribe box; homepage = logo/name header, nav, featured post, tagline sidebar.
26. Known remaining cosmetic: hero "Feature" crops the latest post's diagram image. Options if it bothers: Website editor → Hero → another style, or give the featured post a cleaner top image.

## 9. Verification pass + tooling (follow-up)
27. Visitor mobile (390×844, isolated context): subscribe overlay and homepage render cleanly (square mark, themed name text, nav, featured post). Dark: substack.com surfaces (profile) follow dark and look right; the `*.substack.com` site has no dark hook and stays light by design.
28. Bug found while checking B-28: tables rendered as a monospace block with raw `**bold**` / `[link](url)` and overflowed phones. Converter now turns each table row into a bullet (`**first cell** — Header: value · Header: value`, inline formatting kept). Re-pushed all 28 bodies; live post shows 46 list items; 28/28 editors still load.
29. Hero styles tried in the Website editor: Newspaper and Highlight are image-heavy with blank/cropped thumbnails → reverted to Feature (Discard). "Images → Cropping" offers only Center/Smart (no "fit").
30. New CLI `scripts/substack/substack.mjs` (check / push / status; `--dry-run`, `--publish`, `--send-email`), lint rules for Substack look, `listBlogs()`/`convert()` exported from the converter. Tested: `check all` → 0 errors (all images reachable on master), 2 long-title warnings, 1 heading skip (B-1); `push all --dry-run` OK; push with a bogus cookie → 403 (auth path not live-tested with a real `substack.sid`, which only the account owner can supply).
31. `guides/substack/README.md` rewritten as the guideline: markdown conventions, setup, publish/update workflow, verification checklist, pitfalls, brand.

## 10. Tables (feedback round) + live-update bug
32. User saw tables still as code on B-9 (`/p/inside-bangladeshs-software-industry`). Cause: for an already-published post `PUT /api/v1/drafts/:id` only updates the draft; public `body_html` stayed at the first-publish version (55,850 bytes, three monospace tables). Fix: re-publish (`POST /api/v1/drafts/:id/publish {send:false}`) after every PUT. All 28 re-published; order unchanged (newest first). CLI `push` now does this automatically for live posts.
33. Substack tables: tested a native `table/tableRow/tableCell` doc → editor loads but silently drops it. So no true tables. Image rendering (headless Chrome → PNG) was prototyped, rejected by the user (many files, not a table feel); code removed, `.cache/` added to `.gitignore`, leftover cache deleted.
34. Final rendering: 2-col tables `**term** — value`; 3+ cols bold row title + italic-header sub-bullets. Footer line "Tables in this post read best as real tables: read it on DEV Community" on the 10 table posts that exist on dev.to (B-7..14, 26, 28; dev.to API match by title). 10 newer table posts (B-15..21, 24, 25, 27) have no DEV version.
35. Audit (visitor, 390px and 1200px, hidden iframes): first 14 posts no horizontal overflow, 0 broken images, 0 tables-as-code; all 28: 0 table-like code blocks in live `body_html`.

## 11. Table image mode built, kept optional
36. Built `--tables=image|auto|list` (headless Chrome → PNG, ImageMagick trim, cached in git-ignored `.cache/substack/tables`, uploaded via `POST /api/v1/image` at push time, alt text = table text). Rendered all 36 tables for the 10 posts without a DEV copy (B-15..21, 24, 25, 27) and checked the output looks like a markdown-preview table.
37. Decision (user): **list style stays the default**; image mode is an option for later. Defaults switched to `list`; nothing re-published (live site already list style). Cache PNGs deleted.

## 12. Let's Connect callout (blog source, all platforms)
38. DEV "read it on DEV Community" footer removed (user: looks odd). Converter's Substack-only CTA injection removed (user: blog and Substack must match; markdown is the single source).
39. Added to the **markdown of all 28 blogs** a callout at the bottom of "Let's Connect" (blockquote, no emoji, user's voice): "**Stay in touch.** Get new posts in your inbox: subscribe to my newsletter on Substack (link)." / "**Support my work.** If this helped, you can support me on SupportKori (link). Thank you." The old `- **Support**` bullet was dropped from the 14 lists that had it. Shapes: 14 posts with a Let's Connect list; 10 with an "End / Check more on" list (callout after the list); 4 (B-17, 18, 19, 23) had no link block, so a standard "Let's Connect" section was appended.
40. Process slip: an emoji version of the callout was published before the user's "show first, confirm, then publish" message was read; it was rolled back to the previous content within minutes (verified 0 emoji/callouts on all 28), copy rewritten, shown, confirmed, then published. Lesson: show diffs of source content changes first, publish only after confirmation.
41. Published to Substack (PUT draft + re-publish, no email); verified live on all 28: callout once per post, no emoji, 28 blockquotes. Visitor check on B-16: green accent bar, links work.

## 13. Blog site + master + B-28 cover + Media feature layout
42. Pushed branch, fast-forwarded `master` (6 commits, no conflicts), pushed. Site rebuilt with the generator `various-projects/blogs-and-presentations` (`pnpm site:publish --dry-run`, then `pnpm site:publish`: sync → verify → build → replace `docs/` → commit "chore(site): rebuild" → push). Verified 36 blogs + 9 decks; Pages `.site-build` shows the new build. Needs a clean blogs tree on the branch being published.
43. B-28 cover: user supplied the dev.to banner (1000×420 webp). The site generator only accepts a first image with aspect 0.5–2.2 (`MIN/MAX_COVER_RATIO` in `sync-content.mjs`), so 2.38 would be ignored. Built `assets/B-28/cover.png` = 1200×630: original scaled to width 1200 and centered over a blurred, darkened copy of itself (ImageMagick). Placed as the first image right under the `# Title` with descriptive alt text; committed and pushed to `master`.
44. Substack B-28: uploaded `cover.png` via `POST /api/v1/image`, `PUT /api/v1/drafts/:id {draft_body, cover_image}` + re-publish. `cover_image` is the post's hero/social image field (null for the other 27 posts).
45. Owner switched the Website editor hero to **Media feature** (looks better than Feature). Checked as a visitor: cover on the right under a left fade; the baked-in title on the left edge is partly faded ("uild Your Own…") and repeats the headline — fixable with a title-less crop of the same banner if wanted.
46. CLI `push` now also sets `cover_image` from the post's first image when its aspect ratio is 0.5–2.2 (re-hosted on Substack). Not live-tested (needs the owner's `SUBSTACK_SID`).

## 14. Covers across all posts
47. Audit of every blog's first image (size, aspect): fit for a cover (0.5–2.2): B-2*, 6, 7, 8, 9, 10, 12, 15, 16, 17, 18, 23, 24, 25, 26, 28; unfit: B-1 (192×71), 11 (2.38), 13 (2.22), 14 (2.35), 20 (0.44), 21 (4.6), 22 (5.1); no image: B-3, 4, 5, 19, 27. (*B-2's first image is an external SVG, left alone.)
48. Finding: publishing auto-fills `cover_image` from the first body image with its jsDelivr URL, even for unfit shapes. Re-hosted + explicitly set (upload → PUT `cover_image` → re-publish) for the 14 fit posts, plus B-28 = **15 Substack-hosted covers**; the other 13 keep Substack's auto value (awkward) or none.
49. Duplicate check (user concern): on Substack the post page shows the cover once (it is the first body image; `cover_image` is not rendered again). On the blog site the cover is only used for OG/social tags and cards; `cover.png` appears once in the rendered body.
50. dev.to API: banners exist for B-1 (gif), B-2, B-7, B-11, B-28 only; the rest have none. Option for later: pad B-11 (and B-1/B-2) to 1200×630 like B-28 and add as first image. Nothing else changed in blog content, so the site did not need a rebuild after the B-28 cover build.
