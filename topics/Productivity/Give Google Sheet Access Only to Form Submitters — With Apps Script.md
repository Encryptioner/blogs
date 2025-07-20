
# Give Google Sheet Access Only to Form Submitters — With Apps Script

As a senior software engineer, I've often seen internal teams at companies rely on **Google Forms + Sheets** for quick data collection — feedback surveys, attendance, registration, you name it.

But here’s a common issue that comes up:
**How do you restrict access to the Google Sheet so only the people who submitted the form can view it?**

Google Forms doesn’t offer this natively. But with a little Apps Script magic, you can make it happen.

---

## The Problem

Let’s say you’re running a private beta program. You collect sign-ups via Google Form. Now you want only those who signed up (and no one else) to see the list.

Manually adding viewers to the Sheet? Not scalable.
Leaving it public? Not secure.
The goal:

* Give **view access only** to people who submit the form.
* Remove access from people who are no longer in the list.
* Keep certain admin/owner access always intact.

---

## The Approach

We hook into Google Apps Script and:

1. Read the email column from the sheet.
2. Add new emails as viewers.
3. Remove emails who shouldn't have access anymore.
4. Always preserve admin users (like yourself).

Here’s the full working script that I use:

```js
function updateSheetSharing() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheets()[0]; // First sheet

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
  Go to **Triggers → Add Trigger** → Choose `updateSheetSharing` → Event: `On form submit`.

* **Avoid Too Many Writes**:
  If your form gets hundreds of submissions daily, consider adding debounce logic or batching updates periodically.

* **Error Handling**:
  Some domains may block sharing or throw quota errors — log and monitor failures via `Logger`.

* **Security Reminder**:
  Never share sheet access based on user input *unless you validate the email* (i.e., restrict form to logged-in users and auto-capture email).

---

## Why I Use This

I’ve used this in social group's data collection, closed feedback loops, and classroom setups. It works beautifully when:

* You want lightweight access control.
* You trust the form submitters.
* You don’t want to set up a whole database + auth system.

It’s not enterprise-grade security — but for small teams and quick workflows, it’s a great solution.

---

## Final Thoughts

Apps Script has a *quiet superpower*: It brings automation to everyday Google tools.

With just \~50 lines of code, you can build a simple access control system — tailored to your workflow.

And that’s why I still reach for Apps Script for glue code like this.

---

Feel free to adapt this script for your own use case. If you're dealing with something more complex (like edit permissions, or syncing to multiple sheets), you’ll want to add further checks — but this core pattern will get you a long way.


## End

That's all!

I hope you've found the article useful. You should try to use `Apps Script` if you haven't already. It has many interesting use cases. Feel free to share your thoughts and experiences.

Check more on
- [Website](https://encryptioner.github.io)
- [Linkedin](https://www.linkedin.com/in/mir-mursalin-ankur)
- [Github](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)

-----