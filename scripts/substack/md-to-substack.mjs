// md-to-substack.mjs — convert blog markdown to Substack (tiptap) JSON.
//
// Usage:  node scripts/substack/md-to-substack.mjs all <out.json>   # every blog listed in INDEX.md
// Needs markdown-it:  npm i --prefix /tmp/mdit markdown-it  &&  MDIT=/tmp/mdit/node_modules/markdown-it node ...
// Output: [{ n, title, subtitle, body }]  — `body` is the Substack draft_body doc.
// Node names matter: Substack's editor rejects the whole doc ("Invalid JSON content")
// on unknown nodes. See guides/substack/README.md → Pitfalls.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import { createRequire } from 'module';
const MarkdownIt = createRequire(import.meta.url)(process.env.MDIT || 'markdown-it');

const BASE = 'https://cdn.jsdelivr.net/gh/Encryptioner/blogs@master/';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const md = new MarkdownIt({ html: true, linkify: true });

const resolveSrc = (src, file) => {
  if (/^https?:/.test(src)) return src;
  const abs = path.resolve(path.dirname(file), decodeURIComponent(src));
  return BASE + path.relative(root, abs).split('/').map(encodeURIComponent).join('/');
};
const img = (src, alt) => ({ type: 'captionedImage', content: [{ type: 'image2', attrs: { src, alt: alt || null, title: null, fullscreen: false, imageSize: 'normal', height: null, width: null, resizeWidth: null, bytes: null, type: null, href: null, belowTheFold: false, topImage: false, internalRedirect: null } }] });

function inline(children, file, marks = []) {
  const out = [];
  let cur = [...marks];
  const stack = [];
  for (const t of children) {
    if (t.type === 'text') { if (t.content) out.push({ type: 'text', text: t.content, ...(cur.length && { marks: cur }) }); }
    else if (t.type === 'code_inline') out.push({ type: 'text', text: t.content, marks: [{ type: 'code' }] });
    else if (t.type === 'softbreak') out.push({ type: 'text', text: ' ', ...(cur.length && { marks: cur }) });
    else if (t.type === 'hardbreak') out.push({ type: 'hardBreak' });
    else if (t.type === 'strong_open') cur = [...cur, { type: 'bold' }];
    else if (t.type === 'em_open') cur = [...cur, { type: 'italic' }];
    else if (t.type === 's_open') cur = [...cur, { type: 'strikethrough' }];
    else if (t.type.endsWith('_close') && ['strong', 'em', 's'].includes(t.type.replace('_close', ''))) cur = cur.filter((m) => m.type !== ({ strong: 'bold', em: 'italic', s: 'strikethrough' })[t.type.replace('_close', '')]);
    else if (t.type === 'link_open') { stack.push(cur); cur = [...cur, { type: 'link', attrs: { href: t.attrGet('href') } }]; }
    else if (t.type === 'link_close') cur = stack.pop() || cur;
    else if (t.type === 'html_inline') { /* drop */ }
    else if (t.type === 'image') { out.push({ __img: resolveSrc(t.attrGet('src'), file), alt: t.content }); }
  }
  return out;
}

// split inline run into paragraphs / block images
function para(children, file) {
  const parts = inline(children, file);
  const blocks = []; let buf = [];
  const flush = () => { while (buf.length && buf[buf.length - 1].type === 'hardBreak') buf.pop(); if (buf.length) blocks.push({ type: 'paragraph', content: buf }); buf = []; };
  for (const p of parts) { if (p.__img) { flush(); blocks.push(img(p.__img, p.alt)); } else buf.push(p); }
  flush();
  return blocks;
}

function htmlBlock(content, file) {
  const out = [];
  for (const m of content.matchAll(/<img\b[^>]*>/gi)) {
    const src = /src="([^"]+)"/.exec(m[0]); const alt = /alt="([^"]*)"/.exec(m[0]);
    if (src) out.push(img(resolveSrc(src[1], file), alt && alt[1]));
  }
  return out;
}

// ---- optional: tables as images (SUBSTACK_TABLES=image or convertPost auto-policy) ----
// Renders each table with real HTML/CSS in headless Chrome (markdown-preview look, bold/links/code kept), trims it with
// ImageMagick, caches PNGs in .cache/substack/tables (git-ignored) and emits an image node with src "file:<hash>".
// resolveLocalImages() swaps those for Substack-hosted URLs at push time. Needs Chrome (or CHROME=path) + `magick`.
export const CACHE = path.join(root, '.cache/substack/tables');
let TABLE_MODE = process.env.SUBSTACK_TABLES || 'list';
const CHROME = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'google-chrome', 'chromium'].filter(Boolean);
const TABLE_CSS = `body{margin:0;padding:10px;background:#fff;font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#1f2328}
table{border-collapse:collapse}th,td{border:1px solid #d0d7de;padding:7px 11px;text-align:left;vertical-align:top}
th{background:#f6f8fa;font-weight:600}tr:nth-child(even) td{background:#fbfcfd}code{font:14px ui-monospace,SFMono-Regular,Menlo,monospace;background:#eff1f3;border-radius:4px;padding:1px 5px}a{color:#0969da;text-decoration:none}`;

function renderTablePng(html) {
  const hash = crypto.createHash('sha1').update(TABLE_CSS + html).digest('hex').slice(0, 12);
  const out = path.join(CACHE, hash + '.png');
  if (fs.existsSync(out)) return hash;
  fs.mkdirSync(CACHE, { recursive: true });
  const page = path.join(CACHE, hash + '.html'), raw = path.join(CACHE, hash + '.raw.png');
  fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>${TABLE_CSS}</style>${html}`);
  let done = false;
  for (const bin of CHROME) {
    try { execFileSync(bin, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', '--window-size=580,3200', `--screenshot=${raw}`, 'file://' + page], { stdio: 'ignore', timeout: 40000 }); done = fs.existsSync(raw); if (done) break; } catch { /* next */ }
  }
  if (!done) throw new Error('no headless Chrome (set CHROME=/path/to/chrome)');
  execFileSync('magick', [raw, '-fuzz', '1%', '-trim', '+repage', '-bordercolor', 'white', '-border', '14', out]);
  fs.rmSync(page); fs.rmSync(raw);
  return hash;
}

function tableToImage(tokens, i) {
  let j = i; while (tokens[j].type !== 'table_close') j++;
  const hash = renderTablePng(md.renderer.render(tokens.slice(i, j + 1), md.options, {}));
  const rows = []; let row = null;
  for (let k = i; k < j; k++) { const t = tokens[k]; if (t.type === 'tr_open') row = []; else if (t.type === 'tr_close') rows.push(row); else if (t.type === 'inline') row.push(t.content.replace(/[*`]|\[([^\]]*)\]\([^)]*\)/g, '$1')); }
  return [img('file:' + hash, ('Table: ' + rows.map((r) => r.join(' | ')).join(' / ')).slice(0, 700)), j];
}

/** Replace "file:<hash>" image srcs with upload(buffer, hash) -> url. `cache` = {hash:url} to skip re-uploads. */
export async function resolveLocalImages(doc, upload, cache = {}) {
  let n = 0;
  const walk = async (node) => {
    if (node.type === 'image2' && /^file:/.test(node.attrs.src)) {
      const hash = node.attrs.src.slice(5);
      cache[hash] ??= await upload(fs.readFileSync(path.join(CACHE, hash + '.png')), hash);
      node.attrs.src = cache[hash]; n++;
    }
    for (const c of node.content || []) await walk(c);
  };
  await walk(doc); return n;
}

// Substack has no table node (the editor silently drops one), and a monospace block shows raw markdown and
// overflows phones. So rows become list items that scan like table rows:
//   2 columns:  • **term** — value
//   3+ columns: • **first cell**
//                 ◦ Header: value      (one short sub-bullet per column)
function tableToList(tokens, i, file) {
  const rows = []; let row = null; let j = i;
  for (; tokens[j].type !== 'table_close'; j++) {
    const t = tokens[j];
    if (t.type === 'tr_open') row = [];
    else if (t.type === 'tr_close') rows.push(row);
    else if (t.type === 'inline') row.push(inline(t.children, file).filter((x) => !x.__img));
  }
  const [head, ...body] = rows;
  const txt = (cell) => cell.map((x) => x.text || '').join('');
  const lead = (cell) => cell.map((x) => ({ ...x, marks: (x.marks || []).some((m) => m.type === 'code') ? x.marks : [...(x.marks || []).filter((m) => m.type !== 'bold'), { type: 'bold' }] }));
  const para = (c) => ({ type: 'paragraph', content: c.length ? c : [{ type: 'text', text: ' ' }] });
  const items = body.map((r) => {
    const first = lead(r[0] || []);
    if (head.length <= 2) return { type: 'listItem', content: [para([...first, ...(r[1] && r[1].length ? [{ type: 'text', text: ' — ' }, ...r[1]] : [])])] };
    const subs = r.slice(1).map((cell, k) => cell.length && { type: 'listItem', content: [para([{ type: 'text', text: txt(head[k + 1] || []) + ': ', marks: [{ type: 'italic' }] }, ...cell])] }).filter(Boolean);
    return { type: 'listItem', content: [para(first), ...(subs.length ? [{ type: 'bulletList', content: subs }] : [])] };
  });
  return [{ type: 'bulletList', content: items }, j];
}

function blocks(tokens, file, i = 0, end = tokens.length) {
  const out = [];
  while (i < end) {
    const t = tokens[i];
    if (t.type === 'heading_open') { const lvl = Math.min(+t.tag[1], 4); const c = inline(tokens[i + 1].children, file).filter((x) => !x.__img); if (c.length) out.push({ type: 'heading', attrs: { level: Math.max(lvl, 2) }, content: c }); i += 3; }
    else if (t.type === 'paragraph_open') { out.push(...para(tokens[i + 1].children, file)); i += 3; }
    else if (t.type === 'fence' || t.type === 'codeBlock') { const attrs = t.info ? { language: t.info.trim().split(/\s+/)[0] } : {}; out.push({ type: 'codeBlock', attrs, content: [{ type: 'text', text: t.content.replace(/\n$/, '') || ' ' }] }); i++; }
    else if (t.type === 'hr') { out.push({ type: 'horizontalRule' }); i++; }
    else if (t.type === 'html_block') { out.push(...htmlBlock(t.content, file)); i++; }
    else if (t.type === 'table_open') { let b, j; if (TABLE_MODE === 'image') { try { [b, j] = tableToImage(tokens, i); } catch (e) { console.error('table image failed → list:', e.message); [b, j] = tableToList(tokens, i, file); } } else [b, j] = tableToList(tokens, i, file); out.push(b); i = j + 1; }
    else if (/^(bullet|ordered)_list_open$/.test(t.type) || t.type === 'blockquote_open') {
      const close = t.type.replace('_open', '_close'); let depth = 0, j = i;
      for (; j < end; j++) { if (tokens[j].type === t.type) depth++; if (tokens[j].type === close && --depth === 0) break; }
      if (t.type === 'blockquote_open') { const c = blocks(tokens, file, i + 1, j); if (c.length) out.push({ type: 'blockquote', content: c }); }
      else {
        const items = []; let k = i + 1;
        while (k < j) {
          if (tokens[k].type === 'list_item_open') { let d = 0, m = k; for (; m < j; m++) { if (tokens[m].type === 'list_item_open') d++; if (tokens[m].type === 'list_item_close' && --d === 0) break; }
            let c = blocks(tokens, file, k + 1, m); c = c.filter((x) => x.type !== 'captionedImage'); if (!c.length) c = [{ type: 'paragraph' }]; items.push({ type: 'listItem', content: c }); k = m + 1; } else k++;
        }
        out.push({ type: t.type === 'bullet_list_open' ? 'bulletList' : 'orderedList', content: items });
      }
      i = j + 1;
    } else i++;
  }
  return out;
}

export const ROOT = root;

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** title -> URL of the same article on DEV (dev.to renders markdown tables natively). {} if offline. */
export async function devtoUrls(user = 'mir_mursalin_ankur') {
  try {
    const list = await (await fetch(`https://dev.to/api/articles?username=${user}&per_page=100`)).json();
    return new Map(list.map((a) => [norm(a.title), a.url]));
  } catch { return new Map(); }
}

/** Blogs from INDEX.md `## Blogs`: [{ n, file }] (n = B-number). */
export function listBlogs() {
  const idx = fs.readFileSync(root + '/INDEX.md', 'utf8').split('## Presentations')[0];
  return [...idx.matchAll(/^(\d+)\. [^:]+: \[[^\]]*\]\(\.\/(.+?\.md)\)\s*$/gm)]
    .map((m) => ({ n: +m[1], file: path.join(root, decodeURIComponent(m[2])) }));
}

/** markdown file -> { title, subtitle, cover, body } where body is the Substack draft_body doc. */
export function convert(file, { tables } = {}) {
  TABLE_MODE = tables || process.env.SUBSTACK_TABLES || 'list';
  let src = fs.readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  const m = /^#\s+(.+)$/m.exec(src);
  const title = m ? m[1].trim() : path.basename(file, '.md');
  if (m) src = src.replace(m[0], '');
  const toks = md.parse(src, {});
  const doc = { type: 'doc', content: blocks(toks, file) };
  const hadTable = toks.some((t) => t.type === 'table_open');
  const first = doc.content.find((b) => b.type === 'paragraph');
  const full = (first ? first.content.map((x) => x.text || '').join('') : '').trim();
  const subtitle = full.length > 170 ? full.slice(0, 170).replace(/\s+\S*$/, '…') : full;
  const firstImg = doc.content.find((b) => b.type === 'captionedImage');
  return { title, subtitle, hadTable, cover: firstImg ? firstImg.content[0].attrs.src : null, body: doc };
}

/**
 * Table policy (Substack has no tables). mode "list" (DEFAULT): readable list rows. "image": every table rendered as an
 * image. "auto": lists for posts that also exist on dev.to, images for the rest. Opt in with `--tables=image|auto`
 * (CLI) or SUBSTACK_TABLES_MODE.
 */
export function convertPost(file, devMap, mode = 'list') {
  const c = convert(file, { tables: mode === 'image' ? 'image' : 'list' });
  if (mode !== 'auto' || !c.hadTable || devMap.get(norm(c.title))) return c;
  return convert(file, { tables: 'image' });
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === 'all') {
  const dev = await devtoUrls();
  const out = listBlogs().map(({ n, file }) => ({ n, ...convertPost(file, dev, process.env.SUBSTACK_TABLES_MODE || 'list') }));
  fs.writeFileSync(process.argv[3], JSON.stringify(out));
  for (const o of out) console.log(o.n, o.title.slice(0, 60), o.body.content.length, JSON.stringify(o.body).length);
}
