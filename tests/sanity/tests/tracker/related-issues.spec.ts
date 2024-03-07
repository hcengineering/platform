import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { NewIssue } from '../model/tracker/types'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker related issue tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('New related issue', async ({ page }) => {
    const newIssue: NewIssue = {
      title: `New Issue with related issue-${generateId()}`,
      description: 'Description New Issue with related issue'
    }
    const relatedIssue: NewIssue = {
      title: `New Related issue-${generateId()}`,
      description: 'Description New Related issue',
      status: 'Done',
      priority: 'High',
      createLabel: true,
      labels: `RELATED-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '12',
      milestone: 'No Milestone',
      duedate: 'today'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.moreActionOnIssue('New related issue')

    await issuesPage.fillNewIssueForm(relatedIssue)
    await issuesPage.buttonCreateIssue.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openIssuesForProject('Default')
    await issuesPage.searchIssueByName(relatedIssue.title)
    await issuesPage.openIssueByName(relatedIssue.title)

    await issuesDetailsPage.waitDetailsOpened(relatedIssue.title)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      ...relatedIssue,
      milestone: 'Milestone',
      estimation: '1d 4h',
      relatedIssue: 'TSK'
    })
  })
})
