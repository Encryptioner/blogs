# Build Your Own IDE Extension: A Real-World Guide From Idea to Install (VS Code, Zed, and Friends)

> The most useful software you'll ever write might be the kind only you needed.

Every developer has one. That small thing your editor *almost* does — the command you retype ten times a day, the info you keep switching to a browser to check, the tool you love that lives in a terminal while your actual work lives three windows away. You've tolerated it for months. Maybe years.

Here's the thought this post is built on: **you can fix that yourself, in a weekend, without being an expert.** An IDE extension is not a mystical artifact maintained by people smarter than you. It's a small program plus a form that tells the editor where to plug it in. If you can write a script, you can write an extension.

I recently went through this end to end. I maintain a CLI tool called [branchdiff](https://github.com/encryptioner/branchdiff-releases) — it runs a local web UI for reviewing pull requests. The UI was fine, but using it meant a terminal, a command, a browser tab, a context switch. So I built a VS Code extension that starts the server, shows the numbers in the sidebar, and embeds the whole UI in an editor tab. Along the way I hit everything the tutorials don't warn you about: a status bar icon that silently refuses to render, links that open *nothing* with no error, a marketplace account that needs an Azure subscription before it needs an extension.

This guide is the general version of that journey. It works for your use case, whatever it is — and it doesn't stop at VS Code. There's a full field guide to Zed, JetBrains, and friends near the end, because the most important decision you'll make is *which editor to target first*, and the answer surprised me.

If you're not a developer, read the next section anyway — it explains what extensions actually are, in plain language, and honestly, that's the part most developers would benefit from too.

---

## What an Extension Actually Is

Strip away the branding and every IDE extension system on earth answers the same three questions:

1. **Where does it plug in?** — a *manifest*, a small config file where you declare: I add a command, a keyboard shortcut, a sidebar panel, a setting.
2. **When does it wake up?** — editors don't run your code constantly. They load it when something you declared happens: the user runs your command, opens a certain file type, or the editor finishes starting up.
3. **What can it touch?** — an API the editor hands your code, and a sandbox deciding how far your code can reach.

For the non-developers: think browser extensions, but for the program people *write code* in. The editor is like a phone, extensions are apps, and the marketplace is the app store. Same shape, different device. And just like phone apps, most extensions are tiny — one command, one panel, one quality-of-life fix.

![Diagram showing how a VS Code extension plugs into the editor: the package.json manifest declares contributions and activation events, src/extension.ts holds activate and deactivate functions, both feed into the extension host process, which surfaces them as Command Palette entries, status bar items, sidebar panels, and webview tabs](../../assets/B-28/extension-anatomy.png)

That diagram is the whole mental model for VS Code. Two files do almost everything:

- **`package.json`** — the manifest. It's a form your extension fills out: "here's my command, here's its keyboard shortcut, here's a setting users can tweak."
- **`src/extension.ts`** — your code. One function runs when the editor activates you (`activate`), one runs on shutdown (`deactivate`). Everything else is you calling editor APIs.

One detail worth knowing because it makes extensions *safe to experiment with*: your code runs in a separate process the editor babysits, called the extension host. If your extension crashes, the editor doesn't. You cannot brick your setup by writing a bad extension. Worst case, you disable it. This is why the barrier to trying is much lower than it looks.

---

## Before You Write Code: Audit Your Idea

Most failed extensions die here, not in the code. Two minutes of honesty saves a weekend.

**Your idea is probably good if it's one of these:**

- **A repeated action** — you do the same 3–4 steps daily (copy file path, transform it, paste it somewhere, open a tool). A command plus a keyboard shortcut turns that into one keypress.
- **Glanceable information** — build status, server health, ticket numbers, whatever you'd otherwise open a browser tab to check. A status bar item or sidebar row makes it ambient.
- **A bridge** — a tool you love (a CLI, a local server, an internal dashboard) that lives outside the editor. The extension doesn't replace the tool; it hands you a doorway to it.

**Your idea is probably bad if:**

- **Settings or keybindings already do it.** Embarrassing numbers of "extensions" are re-implementations of built-in configuration. Search the editor's settings first.
- **An existing extension already does it.** Search the marketplace twice — once for what it's called, once for what it *does*.
- **It's a whole app.** If your extension needs its own navigation, accounts, and a database, ask whether it should be a web app with an extension as a thin doorway instead. Which brings me to the most valuable principle in this entire post.

### The thin-client principle

When I planned the branchdiff extension, the obvious-looking path was to rebuild the review UI natively inside VS Code — native diffs, native comment threads, the works. The APIs exist. I said no, and it's the decision I'd repeat every time.

The extension doesn't re-implement anything. It **embeds** the existing web UI inside an editor tab, and every sidebar row deep-links to the exact section of it. One UI, two viewports. If the editor can host a web view, the same app appears inside it; everywhere else, one click opens the right page in a browser.

Why this matters for you: if your tool has any real interface, **an extension should be a bridge to it, not a second copy of it.** Otherwise you're maintaining two frontends forever — and if you ever target a second editor, four. The extension's actual jobs are the cheap ones: start the thing, show the numbers, open the right place. That's a weekend. A native re-implementation is a quarter.

---

## The VS Code Path

VS Code first, for three reasons: the API is genuinely pleasant, TypeScript does half the work for you, and — this is the part nobody tells you — **one VS Code extension covers way more editors than VS Code.** Cursor, Windsurf, VSCodium, and friends are all built on VS Code's open-source core, and they install extensions from the same second store. Build once, reach nearly everyone. (Details in the shipping section.)

### The fifteen-minute skeleton

You need Node.js installed. Then, in an empty folder:

```bash
npx --package yo --package generator-code -- yo code
```

That's the official scaffolder. It asks a handful of questions — name, identifier, TypeScript (say yes) — and hands you a working extension with a sample command.

To see it alive: open the folder in VS Code and press **F5**. A *second* VS Code window appears — the Extension Development Host — with your extension loaded in it. Press `Ctrl+Shift+P` (that menu is the Command Palette), type your command's name, run it. A notification pops up. Congratulations, that's the whole loop.

You'll live in this loop: edit, F5, test in the host window, `Developer: Reload Window` to pick up changes. It's fast and it's the same for every extension you'll ever write. No emulator downloads, no signing certs, no device registration. Compare that to literally any other platform you've developed for.

### The manifest: where half the work happens

Here's the part that surprises people: a lot of "extension development" is filling in `package.json`. You don't code a command palette entry or a keyboard shortcut — you *declare* them, and the editor builds them for you:

```json
{
  "name": "deploy-buddy",
  "publisher": "yourname",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "deploybuddy.deploy", "title": "Deploy current branch" }
    ],
    "keybindings": [
      {
        "command": "deploybuddy.deploy",
        "key": "ctrl+alt+d",
        "when": "editorTextFocus"
      }
    ],
    "configuration": {
      "title": "Deploy Buddy",
      "properties": {
        "deploybuddy.environmentUrl": {
          "type": "string",
          "default": "https://staging.example.com",
          "description": "Where deployments go"
        }
      }
    }
  }
}
```

That JSON gives you: a Command Palette entry, a keyboard shortcut that only fires when you're focused in the editor, and a settings screen — the settings UI is generated from that `configuration` block, free.

Two manifest notes that save real pain:

- **`engines.vscode` must match the editor you test in.** A mismatch is the number-one reason a fresh extension's command simply doesn't appear. If your command is missing, check this before anything else.
- **Modern VS Code infers most activation events** from what you contribute — declare a command and the editor knows to load you when it runs. You rarely hand-write `activationEvents` anymore; an empty array is normal for command-driven extensions.

### Your first command

The code side, complete:

```typescript
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "deploybuddy.deploy",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("Open a file first");
        return;
      }
      const branch = await vscode.commands.executeCommand("git.currentBranch");
      vscode.window.showInformationMessage(`Deploying ${branch}…`);
      // your actual work here
    }
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
```

Read it and notice what it *isn't*: there's no framework, no build orchestration you must understand, no lifecycle diagram to memorize. The editor calls `activate`, you register things, done. `subscriptions.push` is just "clean this up when I'm unloaded" — copy the pattern and move on.

### The five surfaces you'll actually use

The VS Code API is huge, but almost every useful extension is built from five surfaces. Know these and you can read anyone's extension:

| Surface | What it is | Use it for |
|---|---|---|
| **Command Palette** | `Ctrl+Shift+P` entries | Anything the user does occasionally |
| **Quick Pick** | `showQuickPick()` — the fuzzy-search dropdown | Picking one thing from a list: environments, branches, tickets |
| **Status bar** | `createStatusBarItem()` — text in the bottom bar | One number or word, always visible: build status, server health |
| **Sidebar panel** | `createTreeView()` — a tree in the activity bar | Structured info: multiple items, live counts, expandable rows |
| **Webview** | `createWebviewPanel()` — a real browser tab *inside* the editor | Anything visual: dashboards, forms, embedding an existing web UI |

A status bar item is three lines and a weekend-killer:

```typescript
const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
bar.text = "$(rocket) staging";
bar.tooltip = "Current deploy target — click to switch";
bar.command = "deploybuddy.deploy";
bar.show();
```

That `$(rocket)` is a **codicon** — a built-in icon from VS Code's icon font. Remember that phrase; it stars in the gotchas section.

If your extension wraps an existing local web tool, the webview is the finish line: point an iframe in a webview panel at `http://localhost:PORT` and your entire UI now lives in an editor tab. Chromium treats localhost as trustworthy, so the http iframe doesn't trip security rules. One refinement worth stealing: reuse a single "main" panel and repoint its `src` on navigation instead of spawning a tab per click — it behaves like a browser tab, not a pile of them. That one trick — *embed, don't rebuild* — is the thin-client principle in code.

### Lessons that cost me an afternoon each

These are the things the docs mention in one buried line and reality teaches loudly. Consider this section the fee I already paid on your behalf.

**Status bar icons are codicons only.** `StatusBarItem` cannot render a custom SVG — the API simply has no `iconPath` on it. You use the built-in codicon font (`$(rocket)`, `$(git-compare)`, `$(sync)`) or you use text. Custom icons go in the sidebar and editor tabs, which *do* accept SVGs — but the rules differ per surface: the activity bar alpha-masks your SVG and repaints it in the theme color (draw with `currentColor` and punched holes), while editor-tab icons want a `{light, dark}` pair because the tab background flips with the theme. I verified this the hard way, against the latest type definitions, after wondering why nothing rendered.

**Manifest changes sometimes need a full restart, not a reload.** Some `contributes` entries — icons, view containers, menus — are only read when the extension host starts. `Developer: Reload Window` picks up your *code*; if a new icon or view stubbornly refuses to appear, fully quit the host window and relaunch. This one had me convinced my icon path was wrong for an embarrassingly long time.

**Webviews are sandboxed, and they fail silently.** A webview is a locked-down browser. `window.open()` and `target="_blank"` links do *nothing* — no error, no console spam, just silence. If your embedded UI needs to open things, your webview code must `postMessage` the URL to the extension, which decides: same-server link → open a new webview tab; external link → `vscode.env.openExternal()`. Also set `retainContextWhenHidden: true` when you create the panel, or the webview's state resets every time the user switches tabs. There's a memory cost; for a dashboard it's worth it.

Two more traps live inside that same iframe. Keystrokes land in it, where the editor's keybindings can't see them — your embedded app has to forward the workbench escapes (`Ctrl+Shift+P`, `Ctrl+P`, the sidebar toggles) to the extension over `postMessage`, and the extension replays a short whitelist of commands, nothing more. And the editor's theme only reaches the iframe after a message round trip, so a fresh load briefly falls back to the *OS* theme — pass it in the iframe's URL (`?theme=dark`) and apply it with an inline script before your stylesheets load, or dark-theme editors on light-OS machines flash the wrong theme on first paint.

**Windows spawns need a shell.** If your extension launches a local tool and it works on your Mac but dies for Windows users: npm-installed CLIs are `.cmd` shim files on Windows, and those can't be spawned directly. Pass `shell: true` in your spawn options. This is the classic "works on my machine" bug of extension development, and Windows users will find it for you.

**Adopt, don't duplicate, long-running processes.** If your extension starts a server, check whether one is already running for this workspace first, and attach to it. Otherwise every window reload spawns another copy, ports fight, and users end up with zombie processes. My extension reads a small registry file the CLI maintains; a healthy match means adopt, otherwise spawn. Ten lines of code, entire class of bugs gone.

**One source of truth for repeated lists.** I had the same menu in two places — a sidebar panel and a quick pick — hand-maintained separately. They drifted: the quick pick was missing rows and had a copy-pasted wrong icon on one entry. The fix was boring and permanent: both surfaces now render from one array in one file. Any list that appears twice in your UI will drift; make it appear once in code.

### Testing like it matters

The F5 loop is for your eyes. For real coverage, VS Code ships a test runner that downloads an actual VS Code binary and runs your tests inside the real extension host — not a mock, the actual editor, headless:

```bash
npm install --save-dev @vscode/test-electron
# package.json: "test": "node out/test/runTest.js" (the scaffold has this)
```

Because it's "a real editor, headless," it also runs in CI on all three operating systems. If you ship to strangers, do this: a test that asserts your commands are registered and your endpoints answer catches the entire class of "the extension loaded but nothing works" bug reports. One quirk to know before it bites: the test host rejects a module that merely runs itself — it must export a `run()` function. Then keep a small manual checklist for what automation can't see — icons rendering, panels looking right, keyboard shortcuts firing. Two lists, both short.

---

## Shipping It

### Start with just a file: the `.vsix`

Everything in VS Code extension land packages into one file format: `.vsix`. It's a zip with your code and manifest inside, installable directly.

```bash
npm install -g @vscode/vsce
vsce package
```

Now there's a `your-extension-1.0.0.vsix` file. Anyone — including future you — installs it via the Extensions panel's `⋯` menu → **Install from VSIX…**, or:

```bash
code --install-extension your-extension-1.0.0.vsix
```

Do not skip past this. **A `.vsix` file is a completely legitimate end state.** Your team's shared tooling, an internal extension that will never be public, a personal scratch extension for your own workflow — package it, drop it in a shared drive or a GitHub release, done. Two things to know at this stage: a `.vscodeignore` file keeps junk out of the package (only ship your `dist/` bundle, manifest, README, license), and manually installed `.vsix` files never auto-update — installing the next version's file over it just works.

### The Marketplace — and the Azure detour nobody warns you about

The main app store is the Visual Studio Marketplace. Publishing is one command (`vsce publish`) behind two accounts, and the account part is where the adventure lives:

1. **Create a publisher** on the Marketplace — an ID that permanently identifies you and your extensions.
2. **Create a Personal Access Token on Azure DevOps.** Yes, Azure. The Marketplace's auth lives there, not on the Marketplace site. The token must be scoped to *All accessible organizations* with the *Marketplace → Manage* scope — pick anything else and you get a bare 403 that doesn't tell you why.
3. And the genuinely absurd part: **creating an Azure DevOps organization can require linking an Azure subscription**, and even a free-tier Azure account wants a card for identity verification. To publish a free extension. Plan for this detour; it's the single most common place extension publishing stalls out.

One more thing to calendar: **Microsoft is retiring global PATs on December 1, 2026**, and the going-forward path is Entra ID-based auth (workload identity federation in CI, `vsce publish --azure-credential`). If you're setting up publishing fresh, set it up the new way from day one and skip the token-renewal treadmill entirely.

Marketplace rules that bite people, from the official docs and from experience:

- **Versions must strictly increase.** Published a broken version? You can't overwrite it — you fix it by shipping the *next* version.
- **The listing is a snapshot.** Your README, icon, and description on the store update only when you publish. There is no "refresh listing" button.
- **No SVGs in listings** — icon, badges, and README images must be PNG/other raster with https URLs.
- **Removal is forever.** Unpublishing removes the extension from every user, and extension names stay reserved after removal. Prefer leaving an old version up.

### Open VSX: one extra step, five more editors

Here's the leverage play. Microsoft's Marketplace terms only allow *Microsoft builds* of VS Code to use it. Cursor, Windsurf, VSCodium, Gitpod, Theia — all built on VS Code's open-source core, all banned from the main store. They share a second store instead: **[Open VSX](https://open-vsx.org)**.

The beautiful part: it takes the *same `.vsix`* you already built. One package, two stores, every major editor covered:

![Diagram showing one vsix file flowing to three destinations: the VS Code Marketplace serving VS Code users, Open VSX serving Cursor, Windsurf, VSCodium, Gitpod, Theia and Antigravity users, and direct Install-from-VSX reaching any editor without a store, with Open VSX also noted as usable by VS Code itself](../../assets/B-28/vsix-distribution.png)

Open VSX setup is its own small saga, so you don't hit it blind: you sign in with GitHub, then discover that's not enough — you need an **Eclipse Foundation account** (separate registration), sign the publisher agreement, and *link your GitHub account inside your Eclipse profile*. Skip that last link and login fails with a bare redirect that looks like an OAuth bug. The actual reason lives in a background request (`eclipse-missing-github-id`) that the page never shows you. Once in: create a namespace matching your publisher ID exactly, generate a token, `npx ovsx publish`. 

That's the entire distribution strategy for a solo developer: build one `.vsix`, publish it twice, and every editor from stock VS Code to Cursor can install your work.

---

## Beyond VS Code: A Field Guide

VS Code has the gentlest on-ramp, but it's not the only editor people love. Here's the honest state of each — what you can build, what you can't, and what it costs.

### Zed: small, sharp, sandboxed

Zed takes the opposite bet from VS Code on extension power. Extensions are written in **Rust**, compiled to **WebAssembly**, and run in a sandbox. The manifest is an `extension.toml` file; you test locally by installing your folder as a "dev extension," and publishing means opening a pull request against Zed's central extensions repository — with a license file at the root of your repo (open source is required) and CI checking your submission.

What Zed extensions can be: **language support** (tree-sitter grammars, language servers you can download on demand), **themes and icon themes**, **snippets**, **debug adapters**, and **MCP context servers** — the integration path for connecting Zed's assistant to your own tools.

What they still can't be: **anything with its own UI.** No sidebars, no panels, no status bar items of your own, and no general "draw a window" API. Extensions *can* reach outside the sandbox a little, through narrowly-scoped capability grants — running specific commands (`process:exec`), downloading files from specific hosts, installing named npm packages — but with nowhere to render a result, that power changes little. The Visual Extension API is an open proposal; until it lands, Zed extensions are ingredients, not apps.

So what do you do if you love Zed and want your tool closer? Two honest answers:

- **`tasks.json`.** Zed's task runner can execute your CLI with a keystroke, and its terminal renders printed `http://localhost:…` URLs as clickable links. A config file, not code — and suddenly your tool is one keypress away, opening in the browser at exactly the right page.
- **An MCP context server.** If the integration should be *smart* — tools and prompts the assistant can call — that's the sanctioned path, and it's genuinely useful even without any custom UI.

This is exactly the route I mapped for branchdiff-in-Zed: no extension at all, just task definitions and clickable URLs. Sometimes the right extension is a config file.

### Cursor, Windsurf, VSCodium: already done

Nothing new to build. They're VS Code-family editors pulling from Open VSX — your published extension reaches them the moment it's on that second store. One `.vsix` installs into any of them directly too (`cursor --install-extension …` works exactly like `code --install-extension …`). If your extension talks to local servers or CLIs, do test in each — forks have their own quirks — but it's QA work, not development work.

### JetBrains: a different planet, respectfully

IntelliJ, PyCharm, WebStorm and the family run on the JVM, and so do their plugins — **Kotlin or Java**, built with Gradle via the IntelliJ Platform Gradle Plugin (2.x is the current line; the old DevKit workflow is deprecated), usually starting from JetBrains' official plugin template. Publishing goes to the JetBrains Marketplace.

The trade is the inverse of Zed's: you get *full* power — plugins there are first-class citizens that can rebuild any part of the IDE's UI — in exchange for a much heavier platform. You're learning a desktop-application framework, with the debugger, the IDE setup, and the build times to match. If your day job lives in a JetBrains IDE and your idea needs real UI inside the editor, it's worth the climb. For everyone else, it's the last stop on the tour, not the first.

### Neovim: no ceremony, by design

Neovim's answer to "what's the extension system?" is "your config *is* the extension system." Plugins are Lua modules; there's no manifest, no store, no review — plugins are git repositories, installed by a plugin manager like lazy.nvim, loaded by users who opt in. Total freedom, zero hand-holding: you can do anything, including break everything, and packaging/distribution is entirely your problem. If you live in Neovim, a plugin for your own workflow can be an evening; just know you're building for the smallest (but most devoted) audience of this list.

### The comparison, at a glance

| | VS Code family | Zed | JetBrains | Neovim |
|---|---|---|---|---|
| **Language** | TypeScript/JavaScript | Rust → WASM | Kotlin/Java | Lua |
| **Custom UI** | Webviews, panels, status bar | None yet (open RFC) | Full IDE-grade UI | Full TUI |
| **Distribution** | Marketplace + Open VSX | PR to central repo | JetBrains Marketplace | Git repos |
| **Effort to first result** | An evening | An evening (non-UI) | A weekend or two | An evening |
| **Reach** | Every VS Code-based editor | Zed users | All JetBrains IDEs | Neovim users |

---

## So Which One First?

The decision is less about favorite editor and more about reach-per-effort:

- **Default answer: VS Code, then Open VSX.** One TypeScript codebase, two publish commands, and you've covered stock VS Code *plus* Cursor, Windsurf, and VSCodium — the largest developer audience on earth for extension work. Nothing else comes close on leverage.
- **If your team lives in JetBrains IDEs** and the idea needs to live inside the editor, go Kotlin and budget the learning curve — it's the only sanctioned way in.
- **If your tool's real home is a web UI**, build the thinnest VS Code bridge (embed + deep links), and for Zed don't build at all — tasks plus clickable URLs cover it today.
- **If it's just for you**, the calculus collapses: build for whatever you actually use, ship it as a `.vsix` or a config file, skip the stores entirely. Software that serves one user well is not a failure.

And whatever you pick — start embarrassingly small. One command that does one thing you actually do daily. Ship that, use it for a week, and let the extension tell you what it wants to become next. The branchdiff extension started as "start the server without typing a command." The sidebar counts, the embedded tab, the quick picks — those were all *pull*, added because daily use kept asking for them. I've never seen an extension ruined by starting too small. The big-bang ones, I've seen plenty.

---

## Wrapping Up

The gap between "my editor should do that" and "my editor does that" is shorter than it's ever looked. A manifest and one function gets you running; five surfaces cover almost every idea; a `.vsix` file is a real distribution channel even if you never touch a store; and two stores get you nearly every editor people use in 2026.

The concrete path from here:

1. **Today:** run `npx --package yo --package generator-code -- yo code`, press F5, change the sample command's message to something that makes you smile. You're now an extension developer.
2. **This week:** pick the one repetitive thing you actually do daily, and make a command for it. Add a keybinding in the manifest.
3. **When it's useful:** `vsce package` and install the `.vsix` properly — you'll feel the difference the first time it's just *there* after a restart.
4. **If the world needs it:** publish — Marketplace for VS Code, Open VSX for everything VS Code-shaped, and remember the Azure detour is a rite of passage, not a sign you're doing it wrong.

The most useful software you'll ever write might be the kind only you needed. There's exactly one way to find out.

---

## Sources and Further Reading

- [Your First Visual Studio Extension](https://code.visualstudio.com/api/get-started/your-first-extension) — official scaffolding-to-F5 walkthrough
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) — vsce, publishers, tokens, and the PAT-to-Entra transition
- [Open VSX](https://open-vsx.org) — the marketplace for VS Code-family editors
- [Zed Extension Capabilities](https://zed.dev/docs/extensions/capabilities) and the [Zed Publishing Guide](https://zed.dev/docs/extensions/publishing/publishing-guide.html) — what sandboxed extensions may do and how submissions work
- [Visual Extension API RFC (Zed discussion #53403)](https://github.com/zed-industries/zed/discussions/53403) — the still-open proposal for custom UI in Zed
- [IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/developing-plugins.html) and the [IntelliJ Platform Gradle Plugin 2.x](https://github.com/JetBrains/intellij-platform-gradle-plugin) — the JetBrains path
- [branchdiff's extension R&D notes](https://github.com/encryptioner/branchdiff-releases) — the full engineering log behind the case study in this post

---

## End:

That's all!

I hope you've found the article useful. You should try building your own extension if you haven't already — start with the one command you actually need. Feel free to share your thoughts and what you built in the comments below.

Check more on
- [Website](https://encryptioner.github.io)
- [Blogs](https://encryptioner.github.io/blogs/)
- [Linkedin](https://www.linkedin.com/in/mir-mursalin-ankur)
- [Github](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)
- [Nerddevs](https://nerddevs.com/author/ankur/)
