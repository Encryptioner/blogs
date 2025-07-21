# How I Integrated Bitbucket MCP with Cursor: A Practical Guide for Developers

As someone who juggles multiple repositories and loves a streamlined workflow, I’m always on the lookout for tools that make my life easier. Recently, I integrated the Bitbucket MCP (Model Context Protocol) server with Cursor IDE, and it’s been a game-changer for managing Bitbucket repos directly from my editor. If you’re a developer who values efficiency and hates context-switching, this guide is for you.

## Why Bitbucket MCP + Cursor?

Let’s face it: jumping between browser tabs and your IDE to manage pull requests, branches, or repo settings is a productivity killer. The Bitbucket MCP server bridges this gap, letting you:
- List and manage repositories
- Create, review, and approve pull requests
- Access commit history and diffs
- Tweak repo settings—all without leaving Cursor

It’s like having your own Bitbucket command center, right inside your coding environment.

## What You’ll Need

Before you dive in, make sure you have:
- Cursor IDE installed (it’s worth it, trust me)
- Node.js v16+ (for running the MCP server)
- A Bitbucket account with repo access
- A Bitbucket Repository Access Token (not an app password—this is important!)

## Step-by-Step: Setting It Up

### 1. Install the Bitbucket MCP Server

In your project directory, run:
```bash
pnpm install -D bitbucket-mcp
```
I prefer `pnpm` for its speed, but `npm` works too.

### 2. Configure MCP

Create a `.cursor/mcp.json` in your project root:
```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "npx",
      "env": {
        "BITBUCKET_URL": "https://api.bitbucket.org/2.0",
        "BITBUCKET_TOKEN": "your-repository-access-token",
        "BITBUCKET_WORKSPACE": "your-workspace"
      },
      "args": ["bitbucket-mcp"]
    }
  }
}
```
Replace the placeholders with your actual token and workspace name (not the URL).

### 3. Get Your Bitbucket Access Token

Follow [this guide](https://support.atlassian.com/bitbucket-cloud/docs/create-a-repository-access-token/) to generate a token. Make sure it has **Read/Write** permissions for repositories and pull requests. Don’t use an app password—it won’t work.

### 4. Test Your Credentials

Before you go further, verify your token works. I use a simple Node.js script for this:

```javascript
const axios = require('axios');
const tokenCredentials = {
  url: "https://api.bitbucket.org/2.0",
  workspace: "your-workspace",
  token: "your-repository-access-token"
};

(async () => {
  try {
    const res = await axios.get(`${tokenCredentials.url}/workspaces/${tokenCredentials.workspace}`, {
      headers: { 'Authorization': `Bearer ${tokenCredentials.token}` }
    });
    console.log('Token is valid! Workspace:', res.data.name);
  } catch (e) {
    console.error('Token test failed:', e.response?.status, e.response?.statusText);
  }
})();
```
Save it as `scripts/test-bitbucket-credentials.js` and run:
```bash
node scripts/test-bitbucket-credentials.js
```
If you see your workspace name, you’re good to go.

### 5. Restart Cursor

Close and reopen Cursor to load the new MCP server. You should see Bitbucket MCP under Settings → Tools & Integrations → MCP Tools.

## Everyday Usage

Now, you can run Bitbucket commands right from Cursor’s agent chat or command palette. For example:
- List repos: `/bitbucket listRepositories`
- Get repo details: `/bitbucket getRepository --workspace your-workspace --repo-slug your-repo`
- Manage pull requests: `/bitbucket getPullRequests --workspace your-workspace --repo-slug your-repo`

You can even create or approve PRs, check commit diffs, and manage branching models—all without leaving your IDE.

## Troubleshooting Tips

- **MCP server not loading?** Double-check your `.cursor/mcp.json` and environment variables.
- **Auth errors?** Make sure you’re using a repository access token (not an app password) and that it hasn’t expired.
- **Commands not recognized?** Restart Cursor and verify the MCP server is loaded.

If you want to avoid confirmation prompts for MCP tools, enable “Auto-run MCP Tools” in Cursor’s chat settings.

## Final Thoughts

Integrating Bitbucket MCP with Cursor has genuinely improved my workflow. No more tab-hopping, no more copy-pasting tokens, just seamless repo management where I code. If you hit any snags, the [official docs](https://modelcontextprotocol.io/) and [Bitbucket API docs](https://developer.atlassian.com/cloud/bitbucket/rest/) are solid resources.

Give it a try—you might wonder how you ever worked without it.

---

## End

That's all!

I hope you've found the article useful. You should try to use `Apps Script` if you haven't already. It has many interesting use cases. Feel free to share your thoughts and experiences.

Check more on
- [Website](https://encryptioner.github.io)
- [Linkedin](https://www.linkedin.com/in/mir-mursalin-ankur)
- [Github](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)

-----