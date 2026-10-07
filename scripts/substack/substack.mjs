#!/usr/bin/env node
// substack.mjs — lint, preview, create/update and publish blogs on Substack from this repo's markdown.
//
//   node scripts/substack/substack.mjs check   <B-N|all>             lint markdown for Substack look & feel (no network except image HEADs)
//   node scripts/substack/substack.mjs push    <B-N|all> [flags]     create the draft, or update the existing post (ids in post-ids.json)
//   node scripts/substack/substack.mjs status                        list posts + ids known to the repo
//
// push flags:  --dry-run          convert + lint, print what would happen, change nothing
//              --publish          also publish a draft that is not live yet (default: leave as draft)
//              --send-email       email subscribers on publish (default: NO email)
//              --skip-check       push even if lint reports errors
//              --tables=list|image|auto   Substack has no tables. list (DEFAULT): list rows + a link to the DEV copy if the post is on dev.to.
//                                 image: every table as a rendered image (needs Chrome + ImageMagick). auto: list + DEV link where a DEV copy
//                                 exists, images otherwise
//
// Auth (push only): SUBSTACK_SID = value of the `substack.sid` cookie from a logged-in browser
//   (DevTools → Application → Cookies → https://substack.com). It is a password: keep it in your shell env,
//   never in a file in this repo. SUBSTACK_PUB defaults to "ankurmursalin".
// Needs markdown-it:  npm i --prefix /tmp/mdit markdown-it  &&  export MDIT=/tmp/mdit/node_modules/markdown-it
// Full guide: guides/substack/README.md
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { convert, convertPost, listBlogs, ROOT, devtoUrls, resolveLocalImages, CACHE } from './md-to-substack.mjs';

const MarkdownIt = createRequire(import.meta.url)(process.env.MDIT || 'markdown-it');
const IDS_FILE = path.join(ROOT, 'scripts/substack/post-ids.json');
const ids = () => JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
const PUB = process.env.SUBSTACK_PUB || 'ankurmursalin';
const CDN = 'https://cdn.jsdelivr.net/gh/Encryptioner/blogs@master/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [cmd, target = '', ...flags] = process.argv.slice(2);
const has = (f) => flags.includes(f) || target === f;

function pick(t) {
  const all = listBlogs();
  if (t === 'all') return all;
  const n = Number(String(t).replace(/^B-?/i, ''));
  const hit = all.filter((b) => b.n === n);
  if (!hit.length) die(`No blog ${t} in INDEX.md`);
  return hit;
}
function die(m) { console.error('✗ ' + m); process.exit(1); }

// ---------- lint ----------
async function lint({ n, file }) {
  const raw = fs.readFileSync(file, 'utf8');
  const out = []; // [level, msg]
  const toks = new MarkdownIt({ html: true }).parse(raw.replace(/^---\n[\s\S]*?\n---\n/, ''), {});
  let seenTitle = false, last = 1;
  for (const t of toks) {
    if (t.type === 'heading_open') {
      const l = +t.tag[1];
      if (l === 1 && !seenTitle) { seenTitle = true; continue; }
      if (l === 1) out.push(['warn', 'extra # (h1) in body — it becomes an h2 on Substack']);
      else if (l > last + 1) out.push(['warn', `heading jumps h${last}→h${l}`]);
      last = Math.max(l, 2);
    }
    if (t.type === 'fence' && !t.info.trim()) out.push(['info', `code fence without a language (line ${t.map[0] + 1}) — tag it (use "text" for diagrams) for consistent rendering`]);
    if (t.type === 'fence' && t.content.split('\n').some((l) => l.length > 100)) out.push(['info', `wide code block (line ${t.map[0] + 1}) scrolls sideways on phones; wrap lines at ≤100 cols`]);
    if (t.type === 'table_open') out.push(['info', `table (line ${t.map[0] + 1}) becomes a bullet list on Substack`]);
    if (t.type === 'html_block' && !/<img\b/i.test(t.content)) out.push(['info', `raw HTML block dropped (line ${t.map[0] + 1})`]);
    if (t.type === 'inline') for (const c of t.children || []) {
      if (c.type === 'image') {
        if (!c.content.trim()) out.push(['warn', `image without alt text: ${c.attrGet('src')}`]);
        const src = c.attrGet('src');
        const url = /^https?:/.test(src) ? src : CDN + path.relative(ROOT, path.resolve(path.dirname(file), decodeURIComponent(src))).split('/').map(encodeURIComponent).join('/');
        try { const r = await fetch(url, { method: 'HEAD' }); if (!r.ok) out.push(['error', `image not reachable (${r.status}) — push assets to master first: ${url}`]); }
        catch (e) { out.push(['error', `image fetch failed: ${url}`]); }
      }
    }
  }
  const c = convert(file);
  if (c.title.length > 100) out.push(['warn', `title is ${c.title.length} chars; email subject lines cut at ~100`]);
  if (c.subtitle.length < 40) out.push(['warn', 'first paragraph is short — it is used as the subtitle/preview']);
  return out;
}

async function runCheck(blogs) {
  let errors = 0;
  for (const b of blogs) {
    const r = await lint(b);
    const e = r.filter(([l]) => l === 'error').length; errors += e;
    console.log(`${e ? '✗' : r.length ? '!' : '✓'} B-${b.n} ${path.basename(b.file).slice(0, 70)}`);
    for (const [l, m] of r) console.log(`    ${l.padEnd(5)} ${m}`);
  }
  return errors;
}

// ---------- API ----------
let uid;
async function api(method, url, body) {
  const sid = process.env.SUBSTACK_SID || die('SUBSTACK_SID is not set (see header of this file)');
  const r = await fetch(`https://${PUB}.substack.com${url}`, { method, headers: { 'Content-Type': 'application/json', Cookie: `substack.sid=${sid}`, 'User-Agent': 'blogs-repo-substack-script' }, body: body && JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) die(`${method} ${url} → ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}

const CACHE_JSON = path.join(path.dirname(CACHE), 'uploaded.json'); // hash -> Substack image URL (git-ignored)
let _ic; const imageCache = () => (_ic ??= fs.existsSync(CACHE_JSON) ? JSON.parse(fs.readFileSync(CACHE_JSON, 'utf8')) : {});
async function uploadImage(buf, hash) {
  const url = (await api('POST', '/api/v1/image', { image: 'data:image/png;base64,' + buf.toString('base64') })).url;
  imageCache()[hash] = url; fs.writeFileSync(CACHE_JSON, JSON.stringify(imageCache()));
  return url;
}

async function push(blogs) {
  const map = ids();
  const dev = await devtoUrls();
  const dry = has('--dry-run');
  for (const b of blogs) {
    const tm = (flags.find((f) => f.startsWith('--tables=')) || '--tables=list').split('=')[1];
    const c = convertPost(b.file, dev, tm);
    if (!dry) await resolveLocalImages(c.body, uploadImage, imageCache());
    const payload = { draft_title: c.title.slice(0, 250), draft_subtitle: c.subtitle, draft_body: JSON.stringify(c.body) };
    const id = map[b.n];
    if (dry) { console.log(`[dry] B-${b.n} ${id ? 'update ' + id : 'create'} "${c.title.slice(0, 60)}" (${payload.draft_body.length} bytes)`); continue; }
    let pid = id;
    if (pid) await api('PUT', `/api/v1/drafts/${pid}`, payload);
    else {
      uid ??= (await api('GET', '/api/v1/user/profile/self')).id;
      pid = (await api('POST', '/api/v1/drafts', { ...payload, type: 'newsletter', audience: 'everyone', draft_bylines: [{ id: uid, is_guest: false }] })).id;
      map[b.n] = pid; fs.writeFileSync(IDS_FILE, JSON.stringify(map, null, 2) + '\n'); // record id immediately
    }
    let state = 'draft saved';
    const post = (await api('GET', `/api/v1/posts/by-id/${pid}`)).post;
    if (post?.is_published) { // PUT only changes the draft copy; re-publishing is what updates the public page
      await api('POST', `/api/v1/drafts/${pid}/publish`, { send: false, share_automatically: false }); state = 'live post updated';
    }
    else if (has('--publish')) { await api('POST', `/api/v1/drafts/${pid}/publish`, { send: has('--send-email'), share_automatically: false }); state = `published${has('--send-email') ? ' + emailed' : ' (no email)'}`; }
    console.log(`✓ B-${b.n} ${state} → https://${PUB}.substack.com/publish/post/${pid}`);
    await sleep(1500);
  }
  if (!dry) console.log('\nNext: add new ids to guides/substack/published-posts.md (post-ids.json is already updated).');
}

// ---------- main ----------
if (cmd === 'check') process.exit((await runCheck(pick(target))) ? 1 : 0);
else if (cmd === 'push') {
  const blogs = pick(target);
  if (!has('--skip-check')) { if (await runCheck(blogs)) die('lint errors — fix them or pass --skip-check'); }
  await push(blogs);
} else if (cmd === 'status') {
  const map = ids();
  for (const b of listBlogs()) console.log(`B-${b.n}`.padEnd(5), map[b.n] ? String(map[b.n]) : '— not on Substack', path.basename(b.file).slice(0, 70));
} else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 22).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
