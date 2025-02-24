import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { NewIssue } from '../model/tracker/types'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker related issue tests', () => {
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  let trackerNavigationMenuPage: TrackerNavigationMenuPage

  test.beforeEach(async ({ page }) => {
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('New related issue', async () => {
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
    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)
    await issuesDetailsPage.moreActionOnIssue('New related issue')
    await issuesPage.fillNewIssueForm(relatedIssue)
    await issuesPage.clickButtonCreateIssue()
    await trackerNavigationMenuPage.openIssuesForProject('Default')
    await issuesPage.searchIssueByName(relatedIssue.title)
    await issuesPage.openIssueByName(relatedIssue.title)
    await issuesDetailsPage.waitDetailsOpened(relatedIssue.title)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      ...relatedIssue,
      relatedIssue: 'TSK'
    })
  })
})
