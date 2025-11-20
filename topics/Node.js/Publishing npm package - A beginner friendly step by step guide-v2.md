# **Publishing Your First NPM Package: A Practical and Human-Friendly Guide for 2025**

Creating your first NPM package is a strangely exciting experience.
It feels like putting a tiny piece of your work out into the world — something others can install, import, extend, and even contribute to.

In my case, I started with a small utility: a simple HTML-to-PDF generator built during a hobby project. I rewrote the library once again for a work project, and eventually realized…
**why not make it a standalone open-source package?**

But like many developers publishing their first package, I quickly discovered:

* Some tutorials are outdated.
* Classic NPM tokens are gone.
* Testing packages locally can be confusing.
* There are surprising “gotchas” like naming, scopes, and versioning rules.
* And if you publish a wrong version… you only get **24 hours** to undo the mistake.

So this is a guide I wish I had — a mix of personal lessons, practical steps, and best practices.

Let’s begin.

---

# **Table of Contents**

- [**Publishing Your First NPM Package: A Practical and Human-Friendly Guide for 2025**](#publishing-your-first-npm-package-a-practical-and-human-friendly-guide-for-2025)
- [**Table of Contents**](#table-of-contents)
- [🧑‍💻 **Why Publish an NPM Package?** ](#-why-publish-an-npm-package-)
- [🪪 **Before You Begin: Understanding Scopes, Names \& Accounts** ](#-before-you-begin-understanding-scopes-names--accounts-)
- [🚀 **Setting Up Your Project** ](#-setting-up-your-project-)
- [📁 **Copying Source Files** ](#-copying-source-files-)
- [⚙️ **Configuring package.json** ](#️-configuring-packagejson-)
- [🌐 **Creating \& Connecting GitHub** ](#-creating--connecting-github-)
- [📦 **Publishing to NPM (First Release)** ](#-publishing-to-npm-first-release-)
    - [1. Login](#1-login)
    - [2. Build](#2-build)
    - [3. Publish](#3-publish)
- [🧪 **Testing Your Package Locally** ](#-testing-your-package-locally-)
    - [Generate a local tarball:](#generate-a-local-tarball)
    - [Test in another project:](#test-in-another-project)
- [🔁 **CI/CD Using GitHub Actions** ](#-cicd-using-github-actions-)
- [🔖 **Release Workflow \& Semantic Versioning** ](#-release-workflow--semantic-versioning-)
- [❗ **Fixing Mistakes: Unpublishing Within 24 Hours** ](#-fixing-mistakes-unpublishing-within-24-hours-)
- [📘 **Best Practices for Maintainers** ](#-best-practices-for-maintainers-)
    - [✔ Add a proper README](#-add-a-proper-readme)
    - [✔ Add a LICENSE](#-add-a-license)
    - [✔ Maintain CI](#-maintain-ci)
    - [✔ Use `.npmignore`](#-use-npmignore)
    - [✔ Encourage contributions](#-encourage-contributions)
    - [✔ Keep changes documented](#-keep-changes-documented)
- [🎬 **Final Thoughts** ](#-final-thoughts-)

---

# 🧑‍💻 **Why Publish an NPM Package?** <a name="why-publish-an-npm-package"></a>

Publishing a package does more than share your code.

* It forces you to organize your project clearly
* It encourages writing documentation
* It gives you a sense of craftsmanship
* It opens your work to open-source collaboration

And honestly?
**It’s fun.**
Especially the first time you see:

```bash
npm install my-cool-package
```

…and realize that command installs *your* work.

---

# 🪪 **Before You Begin: Understanding Scopes, Names & Accounts** <a name="before-you-begin"></a>

NPM packages can be:

* **Unscoped**: `html-to-pdf-generator`
* **Scoped**: `@yourname/html-to-pdf-generator`

If your NPM username is `encryptioner`, then:

```
@encryptioner/html-to-pdf-generator
```

is automatically your namespace.
You don’t need an organization unless your scope differs from your username.

To check availability:

```bash
npm view @yourname/html-to-pdf-generator
# 404 means it's available
```

---

# 🚀 **Setting Up Your Project** <a name="setting-up-your-project"></a>

Start by creating a clean directory for the standalone library.

```bash
mkdir html-to-pdf-generator
cd html-to-pdf-generator
git init
npm init -y
```

---

# 📁 **Copying Source Files** <a name="copying-source-files"></a>

Move your existing working library files into your package:

```bash
mkdir -p src
cp -r /path/to/service-charge/src/lib/pdf-generator/* src/
```

This keeps your package source clean and isolated.

---

# ⚙️ **Configuring package.json** <a name="configuring-packagejson"></a>

Use a template if you have one, or update fields manually:

```json
{
  "name": "@encryptioner/html-to-pdf-generator",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "repository": {
    "type": "git",
    "url": "https://github.com/encryptioner/html-to-pdf-generator.git"
  },
  "bugs": {
    "url": "https://github.com/encryptioner/html-to-pdf-generator/issues"
  },
  "homepage": "https://github.com/encryptioner/html-to-pdf-generator#readme"
}
```

---

# 🌐 **Creating & Connecting GitHub** <a name="creating-github"></a>

```bash
git add .
git commit -m "Initial commit: HTML to PDF Generator library"
git branch -M main
git remote add origin https://github.com/yourusername/html-to-pdf-generator.git
git push -u origin main
```

---

# 📦 **Publishing to NPM (First Release)** <a name="publishing-first"></a>

### 1. Login

```bash
npm login
```

### 2. Build

```bash
npm run build
```

### 3. Publish

```bash
npm publish --access public
```

That’s it — your package is live!

---

# 🧪 **Testing Your Package Locally** <a name="testing-locally"></a>

This is one of the most confusing parts for beginners.

### Generate a local tarball:

```bash
npm pack
```

You’ll get:

```
html-to-pdf-generator-1.0.0.tgz
```

### Test in another project:

```bash
npm install ../path/html-to-pdf-generator-1.0.0.tgz
```

This is the *exact* package that would be published to NPM — perfect for debugging.

---

# 🔁 **CI/CD Using GitHub Actions** <a name="setting-up-cicd"></a>

Automation ensures:

* Every tag -> triggers publish
* Tests and type-checks run automatically
* Builds remain reproducible
* Package.json version matches tag

Here’s the recommended workflow:

<details>
<summary><strong>📄 publish.yml</strong></summary>

```yaml
# Publish to NPM When Version Tag Is Pushed
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag to publish (e.g., v1.0.0)'
        required: false
        type: string

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9.0.0

      - uses: actions/setup-node@v4
        with:
          node-version: '18.20.0'
          registry-url: 'https://registry.npmjs.org'
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
      - run: pnpm run build

      - name: Verify package.json version matches tag
        run: |
          TAG="${GITHUB_REF#refs/tags/}"
          VERSION="${TAG#v}"
          FILE_VERSION=$(node -p "require('./package.json').version")
          if [ "$VERSION" != "$FILE_VERSION" ]; then
            echo "Version mismatch"
            exit 1
          fi

      - name: Publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: pnpm publish --access public --provenance
```

</details>

---

# 🔖 **Release Workflow & Semantic Versioning** <a name="versioning"></a>

Semantic versioning helps maintain compatibility.

| Type      | Example       | Meaning          |
| --------- | ------------- | ---------------- |
| **Major** | 1.0.0 → 2.0.0 | Breaking changes |
| **Minor** | 1.0.0 → 1.1.0 | New features     |
| **Patch** | 1.0.0 → 1.0.1 | Bug fixes        |

Use:

```bash
npm version patch
npm version minor
npm version major
```

Each version bump automatically creates a git tag.

---

# ❗ **Fixing Mistakes: Unpublishing Within 24 Hours** <a name="unpublish"></a>

We've all been there — accidentally pushing a wrong version.

NPM allows:

* **Unpublishing within 24 hours**
* After that: you can deprecate, but not delete

```bash
npm unpublish @scope/package@1.1.0
```

If it still appears in the registry:
wait a minute or two — NPM takes time to update caches.

---

# 📘 **Best Practices for Maintainers** <a name="best-practices"></a>

### ✔ Add a proper README

People should understand how to use your package within 30 seconds.

### ✔ Add a LICENSE

MIT is common for open-source libraries.

### ✔ Maintain CI

Helps catch build or type errors early.

### ✔ Use `.npmignore`

Keep your published package clean.

### ✔ Encourage contributions

Add a `CONTRIBUTING.md`.

### ✔ Keep changes documented

Use changelogs or GitHub releases.

---

# 🎬 **Final Thoughts** <a name="final-thoughts"></a>

Publishing an NPM package isn’t just a technical step —
it’s a creative act, a contribution to a global community of builders.

Your package doesn’t have to be perfect.
It just has to *work*, and be useful to someone.

The more you iterate, document, automate, refine and collaborate —
the better your package will become.

If you're reading this while preparing to publish your first version…
I’m cheering for you. 🎉
The open-source world needs more builders like you.
