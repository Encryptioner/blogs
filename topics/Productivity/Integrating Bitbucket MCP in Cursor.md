# Integrating Bitbucket MCP in Cursor

This guide provides step-by-step instructions for integrating the Bitbucket MCP (Model Context Protocol) server with Cursor IDE to enable seamless Bitbucket repository management directly within your development environment. This setup ensures the bitbucket mcp server works in isolation from other projects.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Overview

The Bitbucket MCP server enables Cursor to interact directly with Bitbucket repositories, allowing you to:
- List and manage repositories
- Create and manage pull requests
- View repository details and branching models
- Approve/decline pull requests
- Access commit history and diffs
- Manage repository settings

## Prerequisites

Before starting, ensure you have:

1. **Cursor IDE** installed and running
2. **Node.js** (v16 or higher) installed
3. **Bitbucket account** with appropriate permissions
4. **Bitbucket Repository Access Token** (not app password)

## Installation Steps

### Step 1: Install the Bitbucket MCP Server 

```bash
# Install the Bitbucket MCP server in the project as dev dependency
pnpm install -D bitbucket-mcp
```

### Step 2: Create MCP Configuration

Create a `.cursor/mcp.json` file in your project root:

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

### Step 3: Get Bitbucket Repository Access Token

1. Go to [Bitbucket Repository Access Token Guide](https://support.atlassian.com/bitbucket-cloud/docs/create-a-repository-access-token/)
2. Create a new repository access token with the following permissions:
   - **Repositories**: Read, Write
   - **Pull requests**: Read, Write
   - **Issues**: Read, Write (optional)
3. Copy the generated token and update it in your `.cursor/mcp.json` file

### Step 4: Test Bitbucket Credentials

- Check this code. And create a `.js` file with this code:
```javascript
#!/usr/bin/env node

/**
 * Simplest way to test bitbucket credentials
 * 
 * 1. Create a new repository access token
 * 2. Run this script
 * 3. If it fails, check the token and workspace
 * 4. If it succeeds, you're good to go
 * 
* REFERENCE: https://github.com/MatanYemini/bitbucket-mcp/blob/master/src/index.ts
 */
const axios = require('axios');

async function testBitbucketCredentials() {
  // Test with token-based authentication
  const tokenCredentials = {
    url: "https://api.bitbucket.org/2.0",
    workspace: "nerddevs",
    token: "get-it-from-https://support.atlassian.com/bitbucket-cloud/docs/create-a-repository-access-token/"
  };

  try {
    console.log('🔧 Testing Bitbucket credentials with token...');
    console.log(`URL: ${tokenCredentials.url}`);
    console.log(`Workspace: ${tokenCredentials.workspace}`);
    console.log(`Token: ${tokenCredentials.token.substring(0, 20)}...`);

    // Test basic API call to get workspace info
    const response = await axios.get(`${tokenCredentials.url}/workspaces/${tokenCredentials.workspace}`, {
      headers: {
        'Authorization': `Bearer ${tokenCredentials.token}`
      }
    });

    console.log('✅ Token-based credentials are valid!');
    console.log(`Workspace: ${response.data.name} (${response.data.slug})`);
    
    // Test repositories endpoint
    const reposResponse = await axios.get(`${tokenCredentials.url}/repositories/${tokenCredentials.workspace}`, {
      headers: {
        'Authorization': `Bearer ${tokenCredentials.token}`
      }
    });

    console.log(`Found ${reposResponse.data.size || 0} repositories`);
    
    if (reposResponse.data.values) {
      reposResponse.data.values.slice(0, 3).forEach(repo => {
        console.log(`  - ${repo.name} (${repo.slug})`);
      });
    }

  } catch (error) {
    console.error('❌ Token credentials test failed:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBitbucketCredentials();

```

- Update the `tokenCredentials` file with your credentials:

```javascript
const tokenCredentials = {
  url: "https://api.bitbucket.org/2.0",
  workspace: "your-workspace-name", // Only the workspace name, not URL
  token: "your-repository-access-token"
};
```

- Run the test script to verify your credentials:

```bash
node scripts/test-bitbucket-credentials.js
```

**Expected Output:**
```
🔧 Testing Bitbucket credentials with token...
URL: https://api.bitbucket.org/2.0
Workspace: your-workspace
Token: your-token-substring...
✅ Token-based credentials are valid!
Workspace: Your Workspace Name (your-workspace)
Found X repositories
  - repo-name-1 (repo-slug-1)
  - repo-name-2 (repo-slug-2)
  - repo-name-3 (repo-slug-3)
```

### Step 5: Restart Cursor

1. Close Cursor completely
2. Reopen Cursor
3. Open your project
4. Verify Bitbucket MCP server is loaded in Settings → Tools & Integrations → MCP Tools

## Usage Examples

### Usage in Agent Chat
- You can ask about bitbucket mcp tools in AI agent chat
- You can ask for AI agent overview about a specific PR of a repo
- You can ask to check latest commit and compare the changes with review comment

### Basic Repository Operations

```bash
# List all repositories in your workspace
/bitbucket listRepositories

# Get details for a specific repository
/bitbucket getRepository --workspace your-workspace --repo-slug your-repo-name

# List pull requests
/bitbucket getPullRequests --workspace your-workspace --repo-slug your-repo-name
```

### Pull Request Management

```bash
# Create a new pull request
/bitbucket createPullRequest \
  --workspace your-workspace \
  --repo-slug your-repo-name \
  --title "Feature: Add new functionality" \
  --description "This PR adds new features to improve user experience" \
  --source-branch feature/new-feature \
  --target-branch main

# Approve a pull request
/bitbucket approvePullRequest \
  --workspace your-workspace \
  --repo-slug your-repo-name \
  --pull-request-id 123

# Get pull request details
/bitbucket getPullRequest \
  --workspace your-workspace \
  --repo-slug your-repo-name \
  --pull-request-id 123
```

### Branching Model Management

```bash
# Get repository branching model
/bitbucket getRepositoryBranchingModel \
  --workspace your-workspace \
  --repo-slug your-repo-name

# Update branching model settings
/bitbucket updateRepositoryBranchingModelSettings \
  --workspace your-workspace \
  --repo-slug your-repo-name \
  --development-name develop \
  --production-enabled true \
  --production-name main
```

## Troubleshooting

### Common Issues

#### MCP Server Not Loading

**Problem**: Bitbucket MCP server doesn't appear in Cursor settings.

**Solution**:
1. Verify the `.cursor/mcp.json` file exists and is properly formatted
2. Check that all environment variables are set correctly
3. Ensure the `bitbucket-mcp` package is installed: `pnpm list bitbucket-mcp`
4. Restart Cursor completely
5. Check the Cursor logs for any error messages

#### Authentication Errors

**Problem**: Getting authentication errors when using Bitbucket commands.

**Solution**:
1. Verify your Bitbucket repository access token is correct and not expired
2. Ensure your token has the necessary permissions (Repositories: Read/Write, Pull requests: Read/Write)
3. Check that your workspace name is correct (only the name, not the full URL)
4. Run the test script to verify credentials: `node scripts/test-bitbucket-credentials.js`
5. Try regenerating your repository access token

#### MCP Tools Access Confirmation

**Problem**: While running `mcp tools` from agent chat panel of `cursor`, it asks for confirmation every time.

**Solution**:
1. Go to Cursor Settings → Chat → Auto-Run → MCP Tools
2. Enable "Auto-run MCP Tools" to avoid confirmation prompts

#### Command Not Found

**Problem**: `/bitbucket` commands are not recognized.

**Solution**:
1. Reopen Cursor completely
2. Check that the MCP server is loaded in Settings → Tools & Integrations → MCP Tools
3. Verify the test script works with the same environment variables as your `mcp.json` file
4. Ensure your bitbucket token has necessary permissions (Repositories & Pull Requests: Read/Write)

#### Test Script Fails

**Problem**: The test script shows authentication errors.

**Solution**:
1. Double-check your workspace name (should be just the name, not the full URL)
2. Verify your repository access token is valid and not expired
3. Ensure the token has the correct permissions
4. Check that you're using a repository access token, not an app password

### Debug Mode

If you need to debug the MCP server, you can add debug logging:

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "npx",
      "env": {
        "BITBUCKET_URL": "https://api.bitbucket.org/2.0",
        "BITBUCKET_TOKEN": "your-token",
        "BITBUCKET_WORKSPACE": "your-workspace",
        "DEBUG": "mcp:*"
      },
      "args": ["bitbucket-mcp"]
    }
  }
}
```

## Resources

- [Official MCP Documentation](https://modelcontextprotocol.io/)
- [Cursor MCP Guide](https://docs.cursor.com/context/mcp)
- [Bitbucket API Documentation](https://developer.atlassian.com/cloud/bitbucket/rest/)
- [Repository Access Token Guide](https://support.atlassian.com/bitbucket-cloud/docs/create-a-repository-access-token/)
- [Used Unofficial Bitbucket MCP Server](https://github.com/MatanYemini/bitbucket-mcp)
- [Other Unofficial Bitbucket MCP Server](https://playbooks.com/mcp/bitbucket)

---

*This guide is based on the Bitbucket MCP server and Cursor IDE integration. For the latest updates, refer to the official documentation.*

