import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewIssue } from '../model/tracker/types'

test.use({
  storageState: PlatformSetting
})

test.describe('mention-grants — closed issue access', () => {
  let trackerNav: TrackerNavigationMenuPage
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage

  test.beforeEach(async ({ page }) => {
    trackerNav = new TrackerNavigationMenuPage(page)
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('mentioned user remains a Collaborator after the issue is moved to Done', async ({ page }) => {
    const issue: NewIssue = {
      title: `V2 closed-issue mention-grant-${generateId()}`,
      description: 'Mention a user, then close the issue; the mention-grant must persist.'
    }

    // Navigate to the Default project's issues list and show all issues.
    // openIssuesForProject + clickModelSelectorAll mirrors the pattern used
    // by issues-duplicate.spec.ts and attachments.spec.ts.
    await trackerNav.openIssuesForProject('Default')
    await issuesPage.clickModelSelectorAll()

    await issuesPage.createNewIssue(issue)
    await issuesPage.searchIssueByName(issue.title)
    await issuesPage.openIssueByName(issue.title)

    // Mention a user via the real mention picker (Dirak Kainin is the seed
    // contact used by the existing mentions.spec.ts:37). addMentions() opens
    // the @-popup and selects the match — addComment() would only send literal
    // text and would NOT create a reference node.
    await issuesDetailsPage.addMentions('Dirak Kainin')

    // Move the issue to Done. editIssue accepts a partial Issue; the status
    // field clicks the status button and selects from the dropdown.
    await issuesDetailsPage.editIssue({ status: 'Done' })

    // Reload and confirm the mentioned user is listed under Collaborators.
    // The issue author ('Appleseed John') and the mentioned user ('Dirak Kainin')
    // must both be present — this mirrors the assertion in mentions.spec.ts:40.
    await page.reload()
    await issuesDetailsPage.checkCollaborators(['Appleseed John', 'Dirak Kainin'])
  })
})

// TODO (V2b): add a guest storage state and assert the issue is visible +
// commentable from the guest's own session. The above test covers the
// server-side grant (Collaborator record exists) which is the actual
// regression risk; the guest-perspective UI walk needs a second authenticated
// Playwright storage state.
