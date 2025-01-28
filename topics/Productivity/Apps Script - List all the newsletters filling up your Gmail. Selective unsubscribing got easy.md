# Apps Script - List all the newsletters filling up your Gmail. Selective unsubscribing got easy

<div align="center">
  <img src="https://developers.google.com/static/apps-script/images/landing-page-hero.svg" alt="google-app-script"/>
</div>

-----

Are you subscribed to many newsletters that are filling up your Gmail? You can clean up all newsletters by filtering Gmail's `unsubscribe` text. You may have known that already. And I am not writing to describe that procedure. You are intelligent enough to do that with a little googling.

## The Problem
I am writing to tell you about a special case that happened to me. I was subscribed to many newsletters I felt interesting. I used to read newsletters almost daily. However, little by little I got overwhelmed with the increasing number of subscribed newsletters.

So, I decided to filter my subscribed newsletter. I didn't want to delete old newsletters. I just wanted to list my current subscribed newsletters (which are unique). Check them a bit and unsubscribe which feels unnecessary.

## The Solution
Turns out, there is no easy way to do it from `Gmail`. So, I had to do a little code. Google has a service called [Apps Script](https://developers.google.com/apps-script). It lets you run some code. You can fetch and manipulate data from your used Google products. So, you can automate many boring manual tasks. Believe it or not, I had subscriptions to around 100 newsletters from different websites, services, and tech newsletters. I reduced my subscribed newsletters to only those that seemed appropriate.

So, Here's the instructional summary of what I did:
1. Create a new [Google Sheet](https://workspace.google.com/products/sheets/)
2. Go to `Extensions > Apps Script` of my new Google sheet
3. Write the necessary code in the code editor of Apps Script which does the following:
   - Get unique mail list senders with other necessary info like name
   - Wrote that data in an existing Google sheet
4. Save the script and give it a name
5. Go to `Run > main`, then grant permissions
6. The unique email addresses will populate your spreadsheet
7. After that, from Gmail you can unsubscribe from unwanted senders

### My code had the following parts:
1.  A `main` function that calls `_getUniqueMailingListSenders` function
2.  The `_getUniqueMailingListSenders` takes the following parameters:
    - applicable filter which will be applied to filter the Gmail
    - The column title of the Google sheet
    - A boolean parameter `clearSheet`, which declares if I want to clear my existing sheet or not
3. Inside the `_getUniqueMailingListSenders` function, it filters all the emails of my `Gmail`
4. Later, it loops through the filtered emails and adds the `From` email to a `javascript set`
5. The `from` field in Gmail filter also keeps the name of the email sender
6. So, A loop runs on `javascript set`, and regular expression gets applied to separate the name and email and save in a map
7. This could also be done in an earlier loop, but I kept it in a separate loop for simplicity.
8. The result can be checked via `Execution log` using the `console.log() of javascript`
9. However, adding that result in Google sheet is more convenient
10. So, the active sheet gets fetched (From where `Extensions > Apps Script` was called) and cleared (depending on `clearSheet` boolean parameter)
11. Then, it finds the last used column and sets the columns for emails and names dynamically after the last used column
12. It sets the column title of Google sheet (with current date info for checking later)
13. And writes each unique email address and corresponding name to the new columns

### Full Code:
```javascript
function _getUniqueMailingListSenders(
  searchOption,
  title,
  clearSheet = true,
) {
  
  // Search in Gmail to check all threads
  const threads = GmailApp.search(searchOption);

  // Use a Set to store unique senders
  const senders = new Set();
  
  // Loop through each thread
  threads.forEach(thread => {
    const messages = thread.getMessages();
    // Loop through each message in the thread
    messages.forEach(message => {
      senders.add(message.getFrom());
    });
  });
  
  const emailData = new Map();

  // Find email and sender name and save it in a map
  senders.forEach((sender) => {
    const emailMatch = sender.match(/<([^>]+)>/);
    const email = emailMatch ? emailMatch[1] : sender;
    const name = sender.replace(`<${email}>`, '').trim();

    if (!emailData.has(email)) {
      emailData.set(email, name);
    }
  });

  // Get the active sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (clearSheet) {
    sheet.clear();
  }

  // Find the last used column
  const lastColumn = sheet.getLastColumn();
  
  // Set the columns for emails and names dynamically after the last used column
  const emailColumn = lastColumn + 1;
  const nameColumn = lastColumn + 2;
  const currentDate = new Date().toLocaleDateString();

  // Add headers with the current date in the new columns
  sheet.getRange(1, emailColumn).setValue(`${title} - Email - ${currentDate}`);
  sheet.getRange(1, nameColumn).setValue(`${title} - Name - ${currentDate}`);

  // Start writing below the header
  let row = 2;
  
  // Write each unique email address and corresponding name to the new columns
  emailData.forEach((name, email) => {
    console.log(`Adding data on column (${emailColumn}, ${nameColumn}) and row ${row}: `, {email, name});
    sheet.getRange(row, emailColumn).setValue(email);
    sheet.getRange(row, nameColumn).setValue(name);
    row++;
  });
}

function main() {
  // Search for emails that belong to a mailing list
  _getUniqueMailingListSenders(
    'list:(<*>)',
    'Unique Email Sender',
    false,
  );

  // Search for emails that belong to a substack mailing list
  // _getUniqueMailingListSenders(
  //   // 'list:(<*techworldwithmilan@substack.com>)',
  //   'list:(<*.substack.com>)',
  //   'Unique Substack Email Sender',
  //   false,
  // );
}
```

## End

That's all!

I hope you've found the article useful. You should try to use `Apps Script` if you haven't already. It has many interesting use cases. Feel free to share your thoughts and experiences.

Check more on
- [Website](https://encryptioner.github.io)
- [Linkedin](https://www.linkedin.com/in/mir-mursalin-ankur)
- [Github](https://github.com/Encryptioner)
- [X (Twitter)](https://twitter.com/AnkurMursalin)

-----