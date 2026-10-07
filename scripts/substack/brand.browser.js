// brand.browser.js — apply the brand kit. Run in a logged-in Substack tab (any ankurmursalin.substack.com page).
// 1) attach assets/brand/logo-square.png to <input type=file multiple id=zzbrand>
// 2) await applyBrand();  await applyAbout();  await applyProfileBio();
// Theme-safe by design: no wide logo, no text baked into images (the site is light by default,
// dark if the reader chooses; Substack themes the name/tagline text itself). See guides/substack/README.md.
const J = { 'Content-Type': 'application/json' };
const put = (u, b) => fetch(u, { method: 'PUT', headers: J, body: JSON.stringify(b) }).then((r) => r.status);

async function applyBrand() {
  const url = {};
  for (const f of document.getElementById('zzbrand').files) {
    const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
    url[f.name] = (await (await fetch('/api/v1/image', { method: 'POST', headers: J, body: JSON.stringify({ image: data }) })).json()).url;
  }
  return put('/api/v1/publication', {
    name: "Ankur's Writing",
    hero_text: 'Practical engineering notes by Ankur Mursalin: AI-assisted dev workflows, software architecture, and the tools I build. Lead full-stack engineer, 7+ years in TypeScript, Node.js and cloud.',
    logo_url: url['logo-square.png'], logo_url_wide: null, cover_photo_url: null, // cover intentionally unset (see README → Light and dark themes)
    theme_var_background_pop: '#008A63', // ~4.3:1 on white AND on near-black
    copyright: 'Mir Mursalin Ankur',
    subscribe_footer: 'New posts on AI-assisted workflows, architecture and dev tools, straight to your inbox.' });
}

// About page = publication.subscribe_content (a JSON *string* of a tiptap doc).
async function applyAbout(doc) { return put('/api/v1/publication', { subscribe_content: JSON.stringify(doc) }); } // doc: tiptap doc, see session-log.md step 20

// Profile bio (substack.com/@handle) is separate from the publication tagline.
async function applyProfileBio() {
  return put('/api/v1/user/profile', { bio: 'Lead full-stack engineer writing about AI-assisted dev workflows, architecture and the tools I build. TypeScript · Node.js · cloud · 7+ years.' });
}
// Not API-settable: Theme "Profile" → "Custom" (Website editor UI: /publish/website-editor/home → Theme → Custom → Save).
