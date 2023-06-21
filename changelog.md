# Changelog

## 0.6.110 (upcoming)

- UBER-526: Live reload on language changes.

  Function translate is updated to pass language, so be aware to use `$themeState.language` to properly use translation.

  ```javascript
    function translate(id:string, params: Record<string, any>, language?:string): Promise<string> {
      //...
    }
  ```

## 0.6.32

Tracker:

- Basic sprints

Workbench:

- Help Center

## 0.6.31

Core:

- Fix password change settings
- Fix settings collapse
- Allow to add multiple enum values
- Fix password change issues
- Fix minxin query

HR:

- Talant with Active/Inactive Application filter
- Improve PTO table statistics

## 0.6.30

Core:

- Allow to leave workspace
- Allow to kick employee (Only for owner)
- Browser notifications
- Allow to create employee
- Owner role for employee

HR:

- Allow to change assignee in Kanban

Tracker:

- Manual issues ordering
- Issue relations
- Issue status management

Workbench

- Use application aliases in URL

## 0.6.29

Platform:

- Object selector actions

Tracker:

- Remember view options
- My issues
- Names of parent issues
- Roadmap
- Context menus (Priority/Status/Assignee)

Chunter:

- Reactions on messages
- Priority filter
- Context menu selector for state/assignee

HR:

- Leaves schedule

Core:

- Invite link expire from 1 hour

## 0.6.28

Core:

- Show activity line last view

Tracker:

- Issue state history.
- Subissue issue popup.
- Label support

Lead:

- Lead presentation changed to number.
- Title column for leads.
- Fix New Lead action for Organization.
- Duplicate Organization detection

## 0.6.27

Platform:

- Allow to attach from clipboard
- Updating subtask project according to parent project

Leads:

- Add filters
- Added "done state" to leads popup table and customer display

Tracker:

- Attachments support
- Board view

## 0.6.26

Platform:

- Support checkboxes in markdown
- Fixes remembering of active application/page

Tracker:

- Issue preview
- Enabled issue notifications
- Show issue ID for sub-issues
- Fix board status order
- Fix project status
- Allow to filter sub issues
- Issue reference from chat
- Notifications support

Board:

- Fix tag/labels layout
- Update popups

## 0.6.25

Tracker:

- Sub issue improvements
- Issue list fixes
- Project fixes

HR:

- Rename Candidate to Talent
- Review Participants support

## 0.6.24

Platform:

- Firefox Login
- Save last filter for page
- Project issue list view
- Performance optimizations
- Organization support Members

Tracker:

- Subissues improvements
- Tracker layout and colors update

## 0.6.23

Platform:

- Fix first filter disappear
- Adjust label editors design
- Allow to define table columns order
- Fix skills/labels selection and show real usage counter
- Fix skills/labels activity
- Project selector in issue list
- Save last filter for page
- Project issue list view

HR:

- Allow to configure vacancy table

Leads:

- Fix customer table leads column

## 0.6.22

Platform:

- Fix subscribe to updates on Task create / update
- Fix popup window layouts
- Fix table two loading spinners
- Improve full text search performance
- Updare reminders layout
- Settings for Attributes
- Enumeration custom properties
- Tags/Skills popup fixes. (Sort by usage/limits/fixes.)
- Attachments:
  - Description field and context menu editor for it
  - Allow mark attachments as important
- Fix resize glitch

Chunter:

- Jump to date functionality

Tracker:

- Parent issues in new Issue dialog.
- Fix copy to clipboard

HR:

- Vacancies filters
- Applications support labels
- Archived vacancy could be opened/edited.
- Vacancy now could be extended with custom attributes.

Board:

- Update actions
- Fix cover presenter
- Check list items D&D

## 0.6.21

Platform:

- Contact filters
- Full text search improvments
- Custom fields

Board:

- Convert checklist to to card
- Card cover suport

## 0.6.20

Platform:

- Chanell editor fixes
- Update edit states layout.
- Homepage contact information added
- Filter bar fixes

HR:

- Improve Vacancy creation

Board:

- Card layout update

## 0.6.19

Platform:

- Table filters support.
- Number/String editor layout on side edit panel update
- Tag filters
- Redesign comment input field + formatting
- Allow to set particular date for reminder
- Collection presenters update
- Update EditStates/Document Viewer
- Fix telegram messages display
- Invite workspace
- Activity layout fixes

HR:

- Skill filters
- Vacancy creation fixes, chained dialogs.

Board:

- Checkist assignee support
- Add confirmation for checlist delete
- Table view for cards

Tracker:

- Basic Projects support
- Edit mode for issues

Chunter:

- Convert direct messages to channel

## 0.6.18

Platform:

- Edit channel panel update
- Table customization support
- Focus and Keyboard management (Ctrl+K, Command + K)

HR:

- Review redesign

Board:

- Add panel with text editor
- Fix adding several cards

Chunter:

- User status support
