import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { IssuesPage } from '../model/tracker/issues-page'
import { NewIssue } from '../model/tracker/types'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker duplicate issue tests', () => {
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage

  test.beforeEach(async ({ page }) => {
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create duplicate issues with the same title', async () => {
    const generatedId = generateId()

    const firstIssue: NewIssue = {
      title: `Duplicate issue-${generatedId}`,
      description: 'First Duplicate issue'
    }
    const secondIssue: NewIssue = {
      title: `Duplicate issue-${generatedId}`,
      description: 'Second Duplicate issue'
    }
    await trackerNavigationMenuPage.openIssuesForProject('Default')
    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(firstIssue)
    // TODO need to delete if issue created successfully
    await trackerNavigationMenuPage.openTemplateForProject('Default')
    await trackerNavigationMenuPage.openIssuesForProject('Default')

    await issuesPage.searchIssueByName(firstIssue.title)
    const firstIssueId = await issuesPage.getIssueId(firstIssue.title)

    await issuesPage.createNewIssue(secondIssue)
    // TODO need to delete if issue created successfully
    await trackerNavigationMenuPage.openTemplateForProject('Default')
    await trackerNavigationMenuPage.openIssuesForProject('Default')
    await issuesPage.searchIssueByName(secondIssue.title)

    await issuesPage.checkIssuesCount(secondIssue.title, 2, 30)

    const secondIssueId = await issuesPage.getIssueId(secondIssue.title, 0)

    expect(firstIssueId).not.toEqual(secondIssueId)
    await issuesPage.checkIssuesCount(firstIssue.title, 2, 30)

    await test.step('Update the first issue title', async () => {
      const newIssueTitle = `Duplicate Update issue-${generateId()}`
      await issuesPage.openIssueById(firstIssueId)
      await issuesDetailsPage.inputTitle().fill(newIssueTitle)
      await issuesDetailsPage.checkIssue({
        ...firstIssue,
        title: newIssueTitle
      })
    })

    await test.step('Check that the second issue title still the same', async () => {
      await trackerNavigationMenuPage.openIssuesForProject('Default')

      await issuesPage.searchIssueByName(secondIssue.title)
      await issuesPage.openIssueById(secondIssueId)
      await issuesDetailsPage.checkIssue({
        ...secondIssue
      })
    })
  })
})
