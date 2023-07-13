# Changelog

## 0.6.112 (upcoming)

## 0.6.111

- UBER-524: cleaned CSS, UI fixes. by @SasLord in https://github.com/hcengineering/anticrm/pull/3491
- UBER-535 by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3486
- Fix create event time by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3493
- TSK-336: mobile UI adaptation by @SasLord in https://github.com/hcengineering/anticrm/pull/3492
- UBER-581 by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3494
- ATS-9: update states once template updates by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3496

## 0.6.110

- UBER-498: replace component shortcut by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3441
- UBER-428: displaying tooltips with a delay by @SasLord in https://github.com/hcengineering/anticrm/pull/3442
- UBER-477: Uberflow dependencies by @haiodo in https://github.com/hcengineering/anticrm/pull/3440
- Enable build cache by @haiodo in https://github.com/hcengineering/anticrm/pull/3446
- UBER-526/UBER-523 by @haiodo in https://github.com/hcengineering/anticrm/pull/3447
- UBER-505: Fix resolve errors in console by @haiodo in https://github.com/hcengineering/anticrm/pull/3449
- UBER-525: fixed popup logic placement for top by @SasLord in https://github.com/hcengineering/anticrm/pull/3448
- UBER-528: Fix navigation in embedded mode by @haiodo in https://github.com/hcengineering/anticrm/pull/3450
- Fix build script by @haiodo in https://github.com/hcengineering/anticrm/pull/3451
- UBER-504: correct display of optional presenters by @SasLord in https://github.com/hcengineering/anticrm/pull/3452
- UBER-520: Fix images drag & drop by @haiodo in https://github.com/hcengineering/anticrm/pull/3453
- TSK-1575 by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3455
- UBER-491 by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3456
- UBER-507: Process undefined in ProjectPresenter and MilestonePresenter by @wazsone in https://github.com/hcengineering/anticrm/pull/3458
- UBER-472 by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3457
- UBER-513: Fix desktop app navigation by @haiodo in https://github.com/hcengineering/anticrm/pull/3459
- UBER-472: don't update when it's not needed by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3460
- UBER-504: fix presenters on ListItem. Add DeviceSizes. by @SasLord in https://github.com/hcengineering/anticrm/pull/3463
- Not open docx preview by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3462
- UBER-462: prevent creating existing enum value and disable the button in that case by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3465
- UBER-538: update ListView layout. Subissues, related issues. by @SasLord in https://github.com/hcengineering/anticrm/pull/3467
- UBER-536: Fix test stability by @haiodo in https://github.com/hcengineering/anticrm/pull/3466
- Publish request module by @haiodo in https://github.com/hcengineering/anticrm/pull/3468
- QFix Notification selection by @haiodo in https://github.com/hcengineering/anticrm/pull/3469
- channels_dropdown_qfix by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3470
- UBER-473: show icon for department by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3472
- UBER-537: review support in inbox by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3471
- UBER-509: do not update list of unread right after reading by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3461
- Fix gmail error by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3473
- Fix multiple channels by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3474
- UBER-538: fixed ListView and KanbanView. by @SasLord in https://github.com/hcengineering/anticrm/pull/3475
- fix label by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3476
- UBER-413: Allow extensible navigator model by @haiodo in https://github.com/hcengineering/anticrm/pull/3477
- UBER-556: add migration for icons with typo in it by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3478
- UBER-560: filter out current transaction and get mixin by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3480
- Add the ability to restrict adding / removing attachments by @s0gorelkov in https://github.com/hcengineering/anticrm/pull/3479
- UBER-298: Add readonly users option to the UserBoxItems component by @wazsone in https://github.com/hcengineering/anticrm/pull/3481
- Bump versions properly by @haiodo in https://github.com/hcengineering/anticrm/pull/3483
- UBER-142: update buttons. Cleaning CSS. by @SasLord in https://github.com/hcengineering/anticrm/pull/3482
- UBER-573,-574: updated button styles, fixed ListView by @SasLord in https://github.com/hcengineering/anticrm/pull/3484
- UBER-572: fixed overflow for emoji. by @SasLord in https://github.com/hcengineering/anticrm/pull/3485
- Publish rpc by @BykhovDenis in https://github.com/hcengineering/anticrm/pull/3487
- UBER-554: show messages with error and allow resending by @ThetaDR in https://github.com/hcengineering/anticrm/pull/3488

  Function translate is updated to pass language, so be aware to use `$themeState.language` to properly use translation.

  ```javascript
  function translate(id: string, params: Record<string, any>, language?: string): Promise<string> {
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
