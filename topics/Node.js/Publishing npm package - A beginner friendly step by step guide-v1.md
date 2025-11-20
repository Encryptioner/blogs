# Publishing My First NPM Package — A Beginner-Friendly, Real-World Guide

*A practical, humane walkthrough based on my own experience building and publishing an NPM package.*

For a long time, publishing an NPM package felt like this mysterious ritual only “real open-source developers” knew. Eventually I decided to turn one of my hobby utilities — an HTML-to-PDF generator — into a standalone NPM package.

Here’s the good news:
Creating your own NPM package **is genuinely fun**, especially if you care about open-source contribution.
Here’s the not-so-good news:
Some of the online tutorials are outdated, especially since NPM **deprecated classic tokens**, changed UI flows, and updated how scoped packages work.

So I wrote this guide to share the full process — the real-world steps, mistakes, and things nobody mentions until you hit the problem at 2 AM.

Let’s begin.

---

# Why Create an NPM Package?

If you’ve ever written a piece of utility code and thought,
“Hey, I’m copying this everywhere… maybe this should be a package?”
— you’re halfway there.

For me, it started with a simple need: converting DOM/HTML to PDF with good accuracy. Existing libraries didn’t behave consistently across screen sizes, and I ended up rewriting a chunk. Later, I needed the same logic in another project — so packaging it made perfect sense.

Publishing the package did three things:

* let me reuse it across projects
* helped others facing the same pain
* pushed me into the world of open-source workflow, versioning, CI/CD, and documentation

This guide collects everything I learned along the way.

---

# Step 1 — Create the Project Structure

```bash
mkdir html-to-pdf-generator
cd html-to-pdf-generator
git init
npm init -y
```

I kept the code inside a simple `src/` folder.

---

# Step 2 — Bring in Your Library Files

In my case I copied code from an internal project:

```bash
mkdir -p src
cp -r /path/to/service-charge/src/lib/pdf-generator/* src/
```

---

# Step 3 — Configure `package.json`

Copy your template, then update:

* `name`: must be unique
* `repository.url`: GitHub repo
* `bugs.url`: issue tracker
* `homepage`: docs or website

If you plan to publish under your scope, choose:

```
@username/package-name
```

(If your npm username matches the scope, you **don’t** need an org.)

---

# Step 4 — Set Up the GitHub Repository

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/html-to-pdf-generator.git
git push -u origin main
```

---

# Step 5 — Create an NPM Account + Login

NPM’s login system is straightforward:

```bash
npm login
```

But the tricky part is tokens.
**Classic tokens are disabled**, and many tutorials still refer to them.

### Create a Granular Access Token

1. Go to npmjs.com → Access Tokens
2. Choose **Granular Access Token**
3. Give it read & write permissions
4. Attach it to your package or scope
5. Save it as your GitHub secret: `NPM_TOKEN`

That’s the token GitHub Actions will use later.

---

# Step 6 — Test Your Build

```bash
npm run build
```

To test the package locally:

```bash
npm pack
```

This creates a `.tgz` file.

In another project:

```bash
npm install /path/to/your-package.tgz
```

This is incredibly useful.
I discovered multiple issues only after testing the package in a fresh environment.

---

# Step 7 — Publish Your First Version

```bash
npm publish --access public
```

The `--access public` is required for scoped packages (e.g., `@encryptioner/...`).

---

# Step 8 — Version Management (Semantic)

```bash
npm version patch   # 1.0.2 → 1.0.3
npm version minor   # 1.0.0 → 1.1.0
npm version major   # breaking changes
```

Semantic versioning keeps releases predictable for everyone using your package.

---

# Step 9 — CI/CD Workflow With GitHub Actions

Automation removes human error — especially version mismatches.

Here’s the workflow I set up:

* triggers on tags like `v1.2.3`
* builds & tests the code
* verifies the version in `package.json`
* publishes to NPM
* creates a GitHub release

*(Workflow YAML omitted here for brevity, but you can paste it fully in your repo.)*

This CI/CD pipeline has saved me from accidentally shipping broken versions.

---

# Step 10 — What Actually Gets Published?

Run:

```bash
npm pack --dry-run
```

It shows exactly what goes into the tarball.

Normally:

* `dist/`
* `README.md`
* `LICENSE.md`

are enough.

You can control this using `.npmignore`.

---

# Step 11 — Documentation, README, and Examples

Your README should cover:

* Installation
* Usage examples
* API reference
* Edge cases
* Browser vs Node differences
* Troubleshooting

A good README increases adoption more than people realize.

---

# Step 12 — Collaboration, Licensing & Releases

If you plan to collaborate:

* Use **MIT License** (most permissive)
* Create GitHub discussions or issues
* Have a CONTRIBUTING.md
* Use semantic commits (optional but neat)

Releases should be tagged in GitHub:

1. “Releases” tab
2. “Create new release”
3. Tag as `v1.x.x`
4. Add changelog
5. Publish

GitHub Actions will take over from there.

---

# Bonus — What If You Published the Wrong Version?

Yes, it happened to me.
I mistakenly pushed **1.1.0** instead of **1.0.3**.

The fix:

### If within 24 hours:

```bash
npm unpublish @scope/package@version
```

If over 24 hours, NPM refuses unpublish for safety reasons.
In that case:

* deprecate the version
* publish a fixed version
* communicate in changelog

Lesson learned: double-check before tagging.

---

# Publishing Helper Scripts

I also wrote scripts like:

* `publish-patch.sh`
* `publish-minor.sh`
* `publish-major.sh`

These automatically:

* bump version
* commit
* delete old tags
* create new tag
* push to GitHub

Which triggers CI/CD and publishes automatically.

---

# Final Thoughts

Publishing your first NPM package is a mix of excitement and “why is this failing again?” moments.
You’ll learn about versioning, packaging, automation, documentation, and even how to fix mistakes gracefully.

But once you see your package installable via:

```
npm install @your-scope/package-name
```

— it genuinely feels rewarding.

If you’re thinking of converting your own utility into a package, do it.
The tools are better than ever, and the process teaches more than any tutorial could.

And when you break something?
Don’t panic — we’ve all been there.
Just unpublish (within 24 hours), fix it, push again, and keep going.

Happy publishing! 🚀

