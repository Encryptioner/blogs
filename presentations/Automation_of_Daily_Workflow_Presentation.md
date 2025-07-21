## Slide 1: Title Slide

# Automation of Daily Workflow
## Streamlining Development with Smart Tools

**Presented by:** Ankur Mursalin  
**Lead Software Engineer, Nerddevs**

*"The best automation is the one you don't notice—until it's gone."*

---

## Slide 2: The Challenge

# 🎯 The Challenge

**What's killing our productivity?**

- **Context Switching**: Moving between tools kills productivity
- **Manual Tasks**: Repetitive operations waste time  
- **Access Control**: Managing permissions manually is error-prone
- **Workflow Fragmentation**: Tools don't talk to each other

*"We spend more time managing tools than using them effectively"*

---

## Slide 3: Solution Overview

# 🛠️ Two Powerful Solutions

**1. [Google Apps Script](https://dev.to/mir_mursalin_ankur/give-google-sheet-access-only-to-form-submitters-with-apps-script-1anh)**  
Automated access control for Google Forms + Sheets

**2. [Bitbucket MCP with Cursor](https://dev.to/mir_mursalin_ankur/integrating-bitbucket-mcp-with-cursor-a-practical-guide-for-developers-1e5b)**  
Unified repository management

*Both solutions focus on eliminating manual work and reducing context switching*

---

## Slide 4: Google Apps Script - The Problem

# 🛠️ Solution 1: Google Apps Script

## The Problem

**Google Forms → Google Sheets Workflow**

- ✅ Forms collect data efficiently
- ✅ Sheets store data securely  
- ❌ **Manual permission management doesn't scale**
- ❌ **No automatic access control for form submitters**

**Real-world scenario:** Private beta program with 100+ signups

---

## Slide 5: Google Apps Script - The Solution

# Google Apps Script Solution

```javascript
function updateSheetSharing() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const emails = sheet.getRange(startRow, emailColumnIndex, lastRow - startRow + 1)
    .getValues()
    .flat()
    .filter(email => email && email.includes('@'));

  // Add new viewers automatically
  // Remove old viewers  
  // Preserve admin access
}
```

**Triggers on form submission - zero manual work!**

---

## Slide 6: Google Apps Script - Benefits

# Google Apps Script Benefits

✅ **Zero Manual Work**: Triggers on form submission  
✅ **Secure**: Only form submitters get access  
✅ **Scalable**: Handles hundreds of submissions  
✅ **Reliable**: Built-in error handling  

**Reference:** [Google Apps Script Documentation](https://developers.google.com/apps-script)

---

## Slide 7: Bitbucket MCP - The Problem

# 🔧 Solution 2: Bitbucket MCP with Cursor

## The Problem

**Fragmented Development Workflow**

- ❌ Switching between editor and browser for repo tasks
- ❌ Manual PR reviews and approvals  
- ❌ Context switching kills productivity
- ❌ No unified interface for repository management

**"Why can't I manage my repos from my editor?"**

---

## Slide 8: Bitbucket MCP - The Solution

# Bitbucket MCP Solution

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "npx",
      "env": {
        "BITBUCKET_TOKEN": "your-token",
        "BITBUCKET_WORKSPACE": "your-workspace"
      },
      "args": ["bitbucket-mcp"]
    }
  }
}
```

**Unified interface for repository management**

---

## Slide 9: Bitbucket MCP - Benefits

# Bitbucket MCP Benefits

✅ **Unified Interface**: Manage repos from within Cursor  
✅ **AI-Powered**: AI agents can review PRs automatically  
✅ **Standardized**: MCP protocol works across platforms  
✅ **Time-Saving**: No more context switching  

**References:**  
- [Bitbucket MCP Package](https://npmjs.com/package/bitbucket-mcp)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Cursor IDE](https://cursor.com)

---

## Slide 10: Implementation Strategy

# 🚀 Implementation Strategy

## Phase 1: Quick Wins

**Google Apps Script Setup:**
- Install script in Google Sheet
- Configure triggers for form submissions
- Test with small group

**Bitbucket MCP Setup:**
- Install `bitbucket-mcp` package
- Configure `.cursor/mcp.json`
- Test basic repo operations

---

## Slide 11: Implementation Strategy (Cont.)

# Implementation Strategy

## Phase 2: Optimization

**Error Handling & Monitoring:**
- Check error logs for Apps Script failures
- Monitor MCP execution logs

**Workflow Integration:**
- Create custom MCP commands
- Optimize Apps Script performance
- Document processes for team

---

## Slide 12: Challenges

# 📊 Challenges

## 1. Google App Script
- Which trigger option to follow
- Which event to handle
- Failure in handling manual update of sheet

## 2. Bitbucket MCP
- Choosing the right mcp server
- Picking up right authentication strategy 
- Validating the activity of mcp server

**"Challenges are what make life interesting and overcoming them is what makes life meaningful."**

---

## Slide 13: Key Takeaways

# 🎯 Key Takeaways

- Begin with one automation
- Reduce cognitive load
- Explore for easing your dev life

**"Automation isn't about replacing humans—it's about amplifying human potential."**

---

## Slide 14: The Bottom Line

# 🎉 The Bottom Line

By automating repetitive tasks, we free up time for:
- **Creative Problem Solving**
- **Strategic Thinking**
- **Team Collaboration**
- **Innovation**

**Start with one automation today. Your future self will thank you.**

---

## Slide 15: Resources & References

# 📚 Resources & References

## Technical Documentation
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Bitbucket MCP Package](https://npmjs.com/package/bitbucket-mcp)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Cursor IDE](https://cursor.com)

## Author's Articles
- [Give Google Sheet Access Only to Form Submitters — With Apps Script](https://dev.to/mir_mursalin_ankur/give-google-sheet-access-only-to-form-submitters-with-apps-script-1anh)
- [Integrating Bitbucket MCP with Cursor: A Practical Guide](https://dev.to/mir_mursalin_ankur/integrating-bitbucket-mcp-with-cursor-a-practical-guide-for-developers-1e5b)

## Connect with Author
- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [linkedin.com/in/mir-mursalin-ankur](https://linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [github.com/Encryptioner](https://github.com/Encryptioner)
- **Twitter**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)

---

## Slide 16: Thank You

# Thank You!

**Questions & Discussion**

- Please share your thoughts
