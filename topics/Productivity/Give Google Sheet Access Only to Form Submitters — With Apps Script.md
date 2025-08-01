
# Give Google Sheet Access Only to Form Submitters — With Apps Script

As a senior software engineer, I've seen teams across companies rely on **Google Forms + Sheets** for quick data collection — feedback surveys, attendance tracking, event registration, you name it.

But here’s a common issue that comes up:
**How do you restrict access to the Google Sheet so only the people who submitted the form can view it?**

Google Forms doesn't offer this natively (which is honestly surprising given how common this need is). But with a little Apps Script magic, you can make it happen.

---

## The Problem

Let's say you're running a private beta program. You collect sign-ups via Google Form. Now you want only those who signed up (and no one else) to see the list.

Manually adding viewers to the Sheet? Not scalable.
Leaving it public? Not secure.
The goal:

* Give **view access only** to people who submit the form.
* Remove access from people who are no longer in the list.
* Keep certain admin/owner access always intact.

---

## The Approach

We hook into [Google Apps Script](https://developers.google.com/apps-script) and:

1. Read the email column from the sheet.
2. Add new emails as viewers.
3. Remove emails who shouldn't have access anymore.
4. Always preserve admin users (like yourself).

Here's the battle-tested script I've used in my projects:

```js
function updateSheetSharing() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheets()[0]; // First sheet

  // update this column according to your sheet
  const emailColumnIndex = 2; // Column B = 2
  const startRow = 2; // Header on row 1

  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) {
    return;
  }

  const ownerEmails = ['admin@gmail.com']; // Add your admin email(s)

  const emails = sheet.getRange(startRow, emailColumnIndex, lastRow - startRow + 1)
    .getValues()
    .flat()
    .filter(email => email && typeof email === 'string' && email.includes('@'));

  const uniqueEmails = [...new Set(emails.map(email => email.trim()))];
  const currentViewers = spreadsheet.getViewers().map(user => user.getEmail());

  // Add new viewers
  for (const email of uniqueEmails) {
    if (ownerEmails.includes(email) || currentViewers.includes(email)) {
      continue;
    }

    try {
      spreadsheet.addViewer(email);
    } catch (e) {
      Logger.log(`Failed to add ${email}: ${e}`);
    }
  }

  // Remove viewers not on the list
  for (const email of currentViewers) {
    if (ownerEmails.includes(email) || uniqueEmails.includes(email)) {
      continue;
    }

    try {
      spreadsheet.removeViewer(email);
    } catch (e) {
      Logger.log(`Failed to remove ${email}: ${e}`);
    }
  }
}
```

---

## Deployment Tips

* **Trigger it on Form Submit**:
  Go to **Triggers → Add Trigger** → Choose `updateSheetSharing` → Event: `On form submit`. See [Google's trigger documentation](https://developers.google.com/apps-script/guides/triggers) for more details.

* **Avoid Too Many Writes**:
  If your form gets hundreds of submissions daily, consider adding debounce logic or batching updates periodically.

* **Error Handling**:
  Some domains may block sharing or throw quota errors — log and monitor failures via `Logger`.

* **Security Reminder**:
  Never share sheet access based on user input *unless you validate the email* (i.e., restrict form to logged-in users and auto-capture email).

* **"Google hasn't verified this app" Warning**:
  You'll likely see this warning when first running the script. This happens because Apps Script is accessing sensitive Google services (Sheets, Drive) and requesting OAuth scopes that Google considers sensitive.

  **Solution for Personal/Internal Use:**
  When you see the warning screen:
  1. Click "Advanced" at the bottom
  2. Click "Go to [your project name] (unsafe)"
  3. Accept the permissions manually for your account

  This is safe for personal scripts or internal organizational use. The warning appears because Google hasn't reviewed your specific script, but you can authorize it yourself.

* **Domain Restrictions**:
  Some organizations block external sharing entirely. If you're in a corporate environment, check with your IT team about Google Workspace sharing policies.

* **Quota Limits**:
  Apps Script has daily quotas for API calls. For high-volume forms, monitor your usage in the Apps Script dashboard under "Quotas" to avoid hitting limits. Check [Google's quota limits](https://developers.google.com/apps-script/guides/services/quotas) for current limits.

* **Testing in Development**:
  Test the script on a copy of your sheet first. Create a test form and sheet to verify everything works before deploying to production.

* **Execution Time Limits**:
  Apps Script has a maximum execution time of 6 minutes per invocation. If your script processes a large number of emails, it might timeout. For high-volume scenarios, consider batching operations or using time-based triggers instead of form submission triggers. See [Google's execution limits](https://developers.google.com/apps-script/guides/services/quotas#current_limitations) for detailed information.

* **Monitoring Executions**:
  After setting up triggers, you can monitor their execution in the Apps Script dashboard:
  - Go to **Executions** in the left sidebar
  - See a list of all recent trigger runs with timestamps
  - Check execution status (success/failed)
  - Click on any execution to view detailed logs
  - Failed executions show error messages and stack traces
  - Successful runs show "Execution completed" status

  This is crucial for debugging. If your script isn't working as expected, check the Executions menu first to see if triggers are firing and what errors might be occurring.
  
---

## Deep Dive: How Google Handles Millions of Triggers

Ever wonder how Google manages Apps Script triggers for millions of users worldwide? Here's what's happening behind the scenes:

### Google's Trigger Infrastructure

**Event-Driven Architecture**: Google uses a sophisticated event-driven system where every Google Workspace action (form submission, sheet edit, time-based events) generates events that flow through their infrastructure.

**Distributed Processing**: When you submit a form, Google's systems:
1. Detect the form submission event
2. Route it to the appropriate Apps Script project
3. Execute your script in a sandboxed environment
4. Handle the response and any side effects (like sharing permissions)

**Scalability Challenges**: Google processes billions of events daily across:
- Form submissions
- Sheet modifications  
- Time-based triggers
- Calendar events
- Email triggers

### Why the 6-Minute Limit?

The execution time limit isn't arbitrary. Google's infrastructure needs to:
- **Resource Management**: Prevent runaway scripts from consuming excessive resources
- **Fair Usage**: Ensure all users get reasonable access to computing resources
- **Cost Control**: Apps Script runs on Google's infrastructure, and they need to manage operational costs
- **Reliability**: Shorter execution times mean faster recovery from failures

### Event Processing Pipeline

```
Form Submission → Event Queue → Trigger Router → Script Execution → Result Handler
```

1. **Event Queue**: Google maintains massive queues of events waiting to be processed
2. **Trigger Router**: Routes events to the correct Apps Script projects
3. **Script Execution**: Runs your code in isolated containers
4. **Result Handler**: Processes the output and applies changes (like sharing permissions)

### Why Triggers Sometimes Fail

**Rate Limiting**: Google implements sophisticated rate limiting to prevent abuse and ensure fair resource distribution.

**Resource Contention**: During peak hours, the system might be under higher load, causing occasional delays or failures.

**Network Issues**: Between Google's internal services (Forms → Sheets → Apps Script), network hiccups can cause temporary failures.

**Quota Management**: Google tracks usage across all services to prevent any single user from overwhelming the system.

### The Magic of "Eventually Consistent"

Google's systems are designed for "eventual consistency" - meaning:
- Your trigger might not fire immediately
- There might be a few seconds delay
- But the system guarantees it will eventually process your event

This design allows Google to handle massive scale while maintaining reliability.

---

## Why I Use This

I’ve used this in social group's data collection, closed feedback loops, and classroom setups. It works beautifully when:

* You want lightweight access control without complex infrastructure
* You trust the form submitters (or validate their identity)
* You don't want to set up a whole database + auth system
* You need something that "just works" without ongoing maintenance

It's not enterprise-grade security — but for small teams and quick workflows, it's a surprisingly robust solution that I've seen work reliably in production.

---

## Final Thoughts

Apps Script has a *quiet superpower*: It brings automation to everyday Google tools that teams already use daily.

What I love about this approach is its simplicity. With just \~50 lines of code, you can build a simple access control system that feels like it was always meant to be there — tailored to your specific workflow.


And that's why I still reach for Apps Script for glue code like this — it's the Swiss Army knife of Google Workspace automation.

---

Feel free to adapt this script for your own use case. If you're dealing with something more complex (like edit permissions, or syncing to multiple sheets), you'll want to add further checks — but this core pattern will get you a long way.


## End

That's all!

I hope you've found the article useful. You should try to use `Apps Script` if you haven't already. It has many interesting use cases. Feel free to share your thoughts and experiences.

Check more on
- [Website](https://encryptioner.github.io)
- [Linkedin](https://www.linkedin.com/in/mir-mursalin-ankur)
- [Github](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)
- [Nerddevs](https://nerddevs.com/)

-----