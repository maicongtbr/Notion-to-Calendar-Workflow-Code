## Notion to calendar workflow code
This is a improved version of [Thomas Franks](https://thomasjfrank.com/) code to sync Notion and Google Calendar using Pipedream's workflow.

[Click here](https://thomasjfrank.com/notion-google-calendar-sync/) to see her full tutorial.

## How to use
Just paste the code in the "Code" section of "Notion_Settings" sep in Pipedream's workflow.

## Improvements
New Notion pages will no more trigger an error when: 
- The Date property is not defined.
- The End Date property is not defined (Sets the end date 2 hours forward).
- The Notion page is an all day event.