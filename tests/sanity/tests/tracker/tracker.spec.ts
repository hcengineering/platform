import { test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { PlatformSetting, fillSearch } from '../utils'
import {
  DEFAULT_STATUSES,
  ViewletSelectors,
  checkIssueDraft,
  createIssue,
  navigate,
  openIssue,
  performPanelTest,
  getIssueName
} from './tracker.utils'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { CommonTrackerPage } from '../model/tracker/common-tracker-page'
test.use({
  storageState: PlatformSetting
})

// const getIssueName = (postfix: string = generateId()): string => `issue-${postfix}`

const panelStatusMap = new Map([
  ['Issues/All', DEFAULT_STATUSES],
  ['Issues/Active', ['Todo', 'In Progress']],
  ['Issues/Backlog', ['Backlog']]
])

test.describe('Tracker tests', () => {
  test('issues-status-display', async ({ page }) => {
    await navigate(page)
    for (const status of DEFAULT_STATUSES) {
      await createIssue(page, { name: getIssueName(status), status })
    }
    for (const [panel, statuses] of panelStatusMap) {
      const pPage = panel.split('/')
      await performPanelTest(page, statuses, pPage[0], pPage[1])
    }
  })

  test('save-view-options', async ({ page }) => {
    const panels = ['Issues', 'Active', 'Backlog']
    const commonTrackerPage = new CommonTrackerPage(page)
    await navigate(page)
    for (const viewletSelector of [ViewletSelectors.Board, ViewletSelectors.Table]) {
      for (const panel of panels) {
        await commonTrackerPage.selectPanelAndViewlet(panel, viewletSelector)
        await commonTrackerPage.openViewOptionsAndSelectAssignee()
      }
      for (const panel of panels) {
        await commonTrackerPage.verifyViewOption(panel, viewletSelector)
      }
    }
  })

  test('my-issues', async ({ page }) => {
    const issuesPage = new IssuesPage(page)
    const name = getIssueName()
    await navigate(page)
    await createIssue(page, { name })
    await issuesPage.navigateToMyIssues()
    await issuesPage.searchIssueByName(name)
    await issuesPage.checkIssuePresenceInTabs(name, true)
    await openIssue(page, name)
    await issuesPage.stopTrackingIssue(name)
  })

  test('report-time-from-issue-card', async ({ page }) => {
    const issuesPage = new IssuesPage(page)
    await navigate(page) // Assume navigate is defined elsewhere
    const assignee = 'Chen Rosamund'
    const status = 'In Progress'
    const values = [2, 4, 6, 8]

    for (let i = 0; i < 5; i++) {
      const random = Math.floor(Math.random() * values.length)
      const time = values[random]
      const name = getIssueName() // Assume getIssueName is defined elsewhere

      await issuesPage.createAndOpenIssue(name, assignee, status)
      await issuesPage.reportTime(time)
      await issuesPage.verifyReportedTime(time)
    }
  })

  test('report-multiple-time-from-issue-card', async ({ page }) => {
    await navigate(page)
    const issuesPage = new IssuesPage(page)
    const assignee = 'Chen Rosamund'
    const status = 'In Progress'
    const time = 0.25
    const name = getIssueName()
    await issuesPage.createAndOpenIssue(name, assignee, status)
    await issuesPage.clickOnReportedTimeEditor()

    for (let i = 0; i < 5; i++) {
      await issuesPage.checkTotalFooter(i)
      await issuesPage.waitForTimeSpentReports()
      await issuesPage.clickAddReportButton()
      await issuesPage.waitForAddTimeReport()
      await issuesPage.checkCreateButtonDisabled()
      await issuesPage.fillSpentTime(time)
      await issuesPage.checkCreateButtonEnabled()
      await issuesPage.clickCreateButton()
      await issuesPage.checkTotalFooter(i + 1)
    }
  })

  test('report-time-from-main-view', async ({ page }) => {
    const issuesPage = new IssuesPage(page)
    await navigate(page)
    await issuesPage.navigateToIssues()
    const values = [2, 4, 6, 8]
    const assignee = 'Chen Rosamund'
    const status = 'In Progress'
    const name = getIssueName()
    await issuesPage.createAndOpenIssue(name, assignee, status)
    // await page.click('.close-button > .antiButton')
    // We need to fait for indexer to complete indexing.
    await fillSearch(page, name)
    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.waitDetailsOpened(name)
    let count = 0
    for (let j = 0; j < 5; j++) {
      const random = Math.floor(Math.random() * values.length)
      const time = values[random]
      count += time
      await page.click('text="Issues"')
      const issuesPage = new IssuesPage(page)
      await issuesPage.clickModelSelectorAll()
      await issuesPage.clickModelSelectorAll()
      await issuesPage.clickView()
      await issuesPage.clickOrdering()
      await issuesPage.selectModifiedDate()
      await issuesPage.pressEscape()
      await issuesPage.clickEstimationContainer()
      await issuesPage.waitForEstimation()
      await issuesPage.clickAddTimeReport()
      await issuesPage.waitForTimeReportAdd()
      await issuesPage.fillSpentTime(time)
      await issuesPage.expectCreateEnabled()
      await issuesPage.clickCreate()
      await issuesPage.clickOkButton()
      await issuesPage.checkEstimation(count)
    }
  })

  test('create-issue-draft', async ({ page }) => {
    const issuesPage = new IssuesPage(page)
    const issueName = 'Draft issue'
    await navigate(page)
    await issuesPage.clickIssuesIndex(2)
    await issuesPage.clickNewIssue()
    await issuesPage.clickAndFillIssueName(issueName)
    await issuesPage.clickAndFillIssueDescription(issueName)
    await issuesPage.selectStatus()
    await issuesPage.selectPriority()
    await issuesPage.clickAssignee()
    await issuesPage.setEstimation()
    await issuesPage.inputTextPlaceholderFill('1')
    await issuesPage.setDueDate('24')
    await issuesPage.pressEscapeTwice()
    await issuesPage.clickOnNewIssue()
    await checkIssueDraft(page, {
      name: issueName,
      description: issueName,
      status: 'Todo',
      priority: 'Urgent',
      assignee: 'Appleseed John',
      estimation: '1h',
      dueDate: '24'
    })
  })
})
