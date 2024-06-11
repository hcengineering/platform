import { test } from '@playwright/test'
import { PlatformURI, generateTestData } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { ApiEndpoint } from '../API/Api'
import { LoginPage } from '../model/login-page'
import { createNewIssueData, prepareNewIssueWithOpenStep } from '../tracker/common-steps'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { InboxPage } from '../model/inbox.ts/inbox-page'

test.describe('Inbox tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let loginPage: LoginPage
  let issuesDetailsPage: IssuesDetailsPage
  let inboxPage: InboxPage
  let api: ApiEndpoint
  let data: { workspaceName: string, userName: string, firstName: string, lastName: string, channelName: string }

  test.beforeEach(async ({ page, request }) => {
    data = generateTestData()
    leftSideMenuPage = new LeftSideMenuPage(page)
    loginPage = new LoginPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    inboxPage = new InboxPage(page)
    api = new ApiEndpoint(request)
    await api.createAccount(data.userName, '1234', data.firstName, data.lastName)
    await api.createWorkspaceWithLogin(data.workspaceName, data.userName, '1234')
    await (await page.goto(`${PlatformURI}`))?.finished()
    await loginPage.login(data.userName, '1234')
    await (await page.goto(`${PlatformURI}/workbench/${data.workspaceName}`))?.finished()
  })

  test('User is able to create a task, assign a himself and see it inside the inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
    await page.waitForTimeout(1000)
  })

  test('User is able to create a task, assign a himself and open it from inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
    await inboxPage.clickOnTask(newIssue.title)
    await inboxPage.clickLeftSidePanelOpen()
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
  })

  test.skip('User is able to create a task, assign a himself and close it from inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)

    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
    await inboxPage.clickOnTask(newIssue.title)
    await inboxPage.clickLeftSidePanelOpen()
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await inboxPage.clickCloseLeftSidePanel()
    // ADD ASSERT ONCE THE ISSUE IS FIXED
  })
})
