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

## Deep Dive: How MCP Works (and How the Cursor and Bitbucket MCP Server Uses It)

To really understand the power of this integration, it helps to know what’s happening under the hood.

### What is MCP?
MCP stands for Model Context Protocol. It’s an open protocol designed to let tools (like editors, IDEs, or AI agents) communicate with code hosts (like GitHub, GitLab, Bitbucket, etc.) in a standardized way. Instead of every tool building its own custom integration for each code host, MCP defines a common set of commands and data structures for things like repositories, pull requests, branches, and commits.

Think of MCP as a universal translator for developer tools. It lets your editor ask questions (“What pull requests are open?”) or take actions (“Create a new branch”) in a way that works across different platforms, as long as there’s an MCP server for that platform.

### How Does the Bitbucket MCP Server Leverage MCP?
The Bitbucket MCP server is an implementation of this protocol, acting as a bridge between Cursor and Bitbucket’s API. Here’s how it works in practice:

1. **Command Flow**: When you run a Bitbucket command in Cursor (like listing repositories or creating a pull request), Cursor sends a standardized MCP request to the Bitbucket MCP server.
2. **Translation Layer**: The MCP server receives this request and translates it into the appropriate Bitbucket API call, handling authentication and formatting as needed.
3. **Data Exchange**: The server fetches the data from Bitbucket, then converts the response back into the MCP format so Cursor can display it in a consistent way, regardless of the underlying code host.
4. **Authentication**: The MCP server uses your Bitbucket repository access token to authenticate API requests securely, so you never have to expose your credentials directly to Cursor or other tools.

This architecture means you get a seamless, unified experience in your editor, while the heavy lifting of talking to Bitbucket’s API is handled by the MCP server. It also makes it easier for new tools and platforms to integrate in the future—just implement the MCP protocol, and you’re good to go.

In summary, MCP is the glue that connects your editor to your code host, and the Bitbucket MCP server is the translator that makes it all work smoothly for Bitbucket users.

### How AI Chat Agents of Cursor Leverage MCP

One of the most powerful aspects of MCP is how it enables AI chat agents (like those in Cursor) to interact with your repositories in a smart, automated way. Here’s how it works:

- **User Request**: You ask the AI agent to do something—like review a pull request, summarize recent changes, or list open issues.
- **MCP Command Generation**: The agent formulates a standardized MCP command based on your request (for example, "get pull request details").
- **Data Retrieval**: The MCP server fetches the relevant data from Bitbucket, translates it into the MCP format, and returns it to the agent.
- **AI Processing**: The agent analyzes the structured data—such as code diffs, comments, or commit history—and generates a human-friendly summary, review, or action.
- **Action or Insight**: The agent presents its findings to you (e.g., a PR review summary, a list of suggested changes, or even automates a merge if you approve).

Because MCP provides a consistent, structured interface, the AI agent doesn’t need to know the details of Bitbucket’s API. This makes it much easier to build powerful, context-aware automation and insights directly into your development workflow, regardless of which code host you use.

## Broader Lessons
Even if you use GitHub, GitLab, or another platform, the principle is the same: integrating your tools saves time and helps you stay focused. Investing a little effort in setup pays off in smoother workflows and fewer distractions.

## Final Thoughts
Integrating Bitbucket MCP with Cursor has made my daily work more efficient and less fragmented. If you’re looking to streamline your repo management, I recommend giving it a try—or finding similar integrations for your stack. The right tools should help you focus on what matters: building great software.

## End

That's all!

I hope you've found the article useful. You should try to use `Apps Script` if you haven't already. It has many interesting use cases. Feel free to share your thoughts and experiences.

Check more on
- [Website](https://encryptioner.github.io)
- [Linkedin](https://www.linkedin.com/in/mir-mursalin-ankur)
- [Github](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)
