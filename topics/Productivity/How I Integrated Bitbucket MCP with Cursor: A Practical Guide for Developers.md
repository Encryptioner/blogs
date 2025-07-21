# Integrating Bitbucket MCP with Cursor: A Practical Guide for Developers

As developers, we all want our workflows to be smooth and efficient. Managing repositories, reviewing pull requests, and keeping track of changes can get tedious—especially when it means switching between your editor and browser. Recently, I set up the Bitbucket MCP (Model Context Protocol) server with Cursor IDE, and it’s made these tasks much more convenient. Here’s a practical guide based on my experience, with tips that apply even if you use other tools.

## Why Integrate Bitbucket MCP with Cursor?

The main benefit is reducing context switching. With Bitbucket MCP, you can:
- List and manage repositories
- Create, review, and approve pull requests
- Access commit history and diffs
- Adjust repository settings

All from within Cursor, so you spend more time coding and less time navigating web UIs.

## What You’ll Need
- Cursor IDE
- Node.js v16 or higher
- Bitbucket account with repository access
- Bitbucket Repository Access Token (not an app password)

## Step-by-Step Setup

### 1. Install the Bitbucket MCP Server
In your project directory, run:
```bash
pnpm install -D bitbucket-mcp
```
You can use `npm` if you prefer.

### 2. Configure MCP
Create a `.cursor/mcp.json` file in your project root. Example:
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

### 3. Get a Bitbucket Access Token
Follow [this guide](https://support.atlassian.com/bitbucket-cloud/docs/create-a-repository-access-token/) to generate a token. Make sure it has **Read/Write** permissions for repositories and pull requests. Use a repository access token, not an app password.

### 4. Test Your Credentials
Before moving on, it’s a good idea to verify your token. Here’s a simple Node.js script:
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
If you see your workspace name, you’re set.

### 5. Restart Cursor
Close and reopen Cursor to load the new MCP server. You should see Bitbucket MCP under Settings → Tools & Integrations → MCP Tools.

## Everyday Usage
Once set up, you can run Bitbucket commands from Cursor’s agent chat or command palette. For example:
- List repos: `/bitbucket listRepositories`
- Get repo details: `/bitbucket getRepository --workspace your-workspace --repo-slug your-repo`
- Manage pull requests: `/bitbucket getPullRequests --workspace your-workspace --repo-slug your-repo`

You can also create or approve PRs, check commit diffs, and manage branching models—all from your editor.

## Troubleshooting Tips
- **MCP server not loading?** Double-check your `.cursor/mcp.json` and environment variables.
- **Auth errors?** Make sure you’re using a repository access token (not an app password) and that it hasn’t expired.
- **Commands not recognized?** Restart Cursor and verify the MCP server is loaded.

If you want to avoid confirmation prompts for MCP tools, enable “Auto-run MCP Tools” in Cursor’s chat settings.

## Broader Lessons
Even if you use GitHub, GitLab, or another platform, the principle is the same: integrating your tools saves time and helps you stay focused. Investing a little effort in setup pays off in smoother workflows and fewer distractions.

## Final Thoughts
Integrating Bitbucket MCP with Cursor has made my daily work more efficient and less fragmented. If you’re looking to streamline your repo management, I recommend giving it a try—or finding similar integrations for your stack. The right tools should help you focus on what matters: building great software.