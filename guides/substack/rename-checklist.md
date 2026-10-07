# Renaming the Substack publication

Current name: **Ankur Ships Value** (set 2026-10-07, see `session-log.md` §18). Use this list if the name changes again.

## Rules for a new name

- Max 3 words, keep "Ankur", state a promise.
- The blog site title ("Ankur's Writing") is separate and stays unless asked.

## What does NOT change

| Item | Why |
|---|---|
| Subdomain `ankurmursalin.substack.com` | Changing it breaks every post URL, the closing block in each blog, `post-ids.json` links and `published-posts.md`. |
| Post URLs, post ids | Independent of the publication name. |
| Logo (the "A" mark) | Fits any "Ankur ..." name. Only redo it if the name drops "Ankur". |
| `copyright` ("Mir Mursalin Ankur") | Author name, not publication name. |
| Blog markdown | The closing block says "newsletter on Substack" with no name. Run `grep -rn "<old name>" topics/` to confirm. |

## On Substack (live)

Apply 1 and 2 together via the browser console (`brand.browser.js`, `PUT /api/v1/publication`); the rest are dashboard or API edits.

| # | Where | Field |
|---|---|---|
| 1 | Publication settings | `name` |
| 2 | Same | `hero_text` (tagline); keep it saying "engineering" if the name does not |
| 3 | About page (`subscribe_content`) | Any sentence that uses the old name |
| 4 | Welcome email | Subject line and body (the sender display name follows the publication name) |
| 5 | Onboarding survey | Any line naming the publication |
| 6 | Profile bio (`PUT /api/v1/user/profile`) | Only if it names the publication |
| 7 | Website editor | Check header, tab title and nav render the new name |

## In this repo

| File | Change |
|---|---|
| `scripts/substack/brand.browser.js` | `name` and `hero_text` in `applyBrand()`; welcome-email text if scripted |
| `guides/substack/README.md` | §6 Brand kit: name line, rationale line, tagline row |
| `guides/substack/session-log.md` | New numbered section: old name, new name, what was applied, what was verified |
| `guides/substack/rename-checklist.md` | Update "Current name" above |
| `CLAUDE.md` | Only if it ever names the publication (today it does not) |

## Verify (as a logged-out visitor)

1. Open `https://ankurmursalin.substack.com/?nocache=1`. Visitor pages are cached, so the first plain reload can show the old name.
2. Check: header, browser tab title, About page, subscribe overlay.
3. Subscribe with a test address, or read the welcome email text in settings, and check the subject.
4. `grep -rIn "<old name>" --exclude-dir=.git --exclude-dir=node_modules .` returns only the session-log history.

## Revert

`PUT /api/v1/publication {name: "<previous name>", hero_text: "<previous tagline>"}`. Old values are in `session-log.md`.
