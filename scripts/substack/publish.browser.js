// publish.browser.js — run INSIDE a logged-in Substack tab (DevTools console or chrome-devtools MCP evaluate_script).
// Substack has no public write API, so this uses the same-origin session API the editor uses.
//
// Setup: open https://<pub>.substack.com/publish/home, then attach posts.json (output of
// md-to-substack.mjs) to a file input:  document.body.prepend(Object.assign(document.createElement('input'),{type:'file',id:'zzup'}))
// Then paste one of the functions below and call it.
//
//   await createDrafts(uid)             -> [{n,id}]   create a draft per post
//   await updateBodies(map)             -> statuses   re-push bodies (fix + re-run; works on published posts too)
//   await publishAll(map, {send:false}) -> statuses   publish; send:false = no email blast
//   await setCover(map, n, 'zzcover')    -> [put, publish]   re-host a cover image (file input id=zzcover) and set it as post n's cover_image
//   await editorLoads(map)              -> ids that crash the editor ("Something has gone wrong")

const load = async () => JSON.parse(await document.getElementById('zzup').files[0].text());
const J = { 'Content-Type': 'application/json' };

async function createDrafts(uid) { // uid: GET /api/v1/user/profile/self -> .id
  const out = [];
  for (const p of await load()) {
    const r = await fetch('/api/v1/drafts', { method: 'POST', headers: J, body: JSON.stringify({
      draft_title: p.title.slice(0, 250), draft_subtitle: p.subtitle, draft_body: JSON.stringify(p.body),
      type: 'newsletter', audience: 'everyone', draft_bylines: [{ id: uid, is_guest: false }] }) }); // bylines required
    out.push({ n: p.n, id: (await r.json()).id });
  }
  return out;
}

async function updateBodies(map) { // map: { "1": 219198582, ... } = scripts/substack/post-ids.json
  const res = [];
  for (const p of await load()) {
    const r = await fetch('/api/v1/drafts/' + map[p.n], { method: 'PUT', headers: J,
      body: JSON.stringify({ draft_title: p.title.slice(0, 250), draft_subtitle: p.subtitle, draft_body: JSON.stringify(p.body) }) });
    res.push([p.n, r.status]);
  }
  return res;
}

async function publishAll(map, { send = false } = {}) {
  const res = [];
  for (const n of Object.keys(map)) { // ascending n = oldest first, newest ends on top
    const r = await fetch(`/api/v1/drafts/${map[n]}/publish`, { method: 'POST', headers: J,
      body: JSON.stringify({ send, share_automatically: false }) });
    res.push([n, r.status]);
    if (!r.ok) break;
    await new Promise((s) => setTimeout(s, 1500));
  }
  return res;
}

async function editorLoads(map) { // hidden-iframe smoke test; run with dialogs auto-accepted
  const bad = [];
  for (const id of Object.values(map)) {
    const f = Object.assign(document.createElement('iframe'), { src: '/publish/post/' + id });
    f.style.cssText = 'width:1200px;height:800px;position:fixed;left:-5000px';
    document.body.appendChild(f);
    let ok = false;
    for (let t = 0; t < 20 && !ok; t++) {
      await new Promise((r) => setTimeout(r, 500));
      try { ok = f.contentDocument.querySelector('.ProseMirror')?.innerText.length > 200; } catch {}
    }
    if (!ok) bad.push(id);
    f.remove();
  }
  return bad;
}

async function setCover(map, n, inputId = 'zzcover') { // attach assets/B-N/cover.png to <input type=file id=zzcover>
  const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(document.getElementById(inputId).files[0]); });
  const up = await (await fetch('/api/v1/image', { method: 'POST', headers: J, body: JSON.stringify({ image: data }) })).json();
  const a = await fetch('/api/v1/drafts/' + map[n], { method: 'PUT', headers: J, body: JSON.stringify({ cover_image: up.url }) });
  const b = await fetch(`/api/v1/drafts/${map[n]}/publish`, { method: 'POST', headers: J, body: JSON.stringify({ send: false, share_automatically: false }) }); // live page updates only on publish
  return [a.status, b.status];
}
