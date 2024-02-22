import { test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NewIssue } from '../model/tracker/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'

test.use({
  storageState: PlatformSetting
})
test.describe('Relations', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Mark as blocked by', async ({ page }) => {
    const firstIssue: NewIssue = {
      title: `First. Mark as blocked by-${generateId()}`,
      description: 'First. Mark as blocked by'
    }
    const secondIssue: NewIssue = {
      title: `Second. Mark as blocked by-${generateId()}`,
      description: 'Second. Mark as blocked by'
    }
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()

    await issuesPage.createNewIssue(secondIssue)
    await issuesPage.searchIssueByName(secondIssue.title)
    const secondIssueId = await issuesPage.getIssueId(secondIssue.title)

    await issuesPage.createNewIssue(firstIssue)
    await issuesPage.searchIssueByName(firstIssue.title)
    const firstIssueId = await issuesPage.getIssueId(firstIssue.title)
    await issuesPage.openIssueByName(firstIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await test.step('Set blocked by and check issue description', async () => {
      await issuesDetailsPage.waitDetailsOpened(firstIssue.title)
      await issuesDetailsPage.moreActionOnIssueWithSecondLevel('Relations', 'Mark as blocked by...')
      await issuesDetailsPage.fillSearchForIssueModal(secondIssue.title)

      await issuesDetailsPage.checkIssue({
        ...firstIssue,
        blockedBy: secondIssueId
      })
    })

    await test.step('Check the second issue description', async () => {
      const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
      await trackerNavigationMenuPage.openIssuesForProject('Default')

      await issuesPage.searchIssueByName(secondIssue.title)
      await issuesPage.openIssueByName(secondIssue.title)

      await issuesDetailsPage.waitDetailsOpened(secondIssue.title)
      await issuesDetailsPage.checkIssue({
        ...secondIssue,
        blocks: firstIssueId
      })
    })
  })
})
