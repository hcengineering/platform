import { test } from '@playwright/test'
import { generateId, PlatformURI, PlatformUser, PlatformUserSecond } from '../utils'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { allure } from 'allure-playwright'
import { LoginPage } from '../model/login-page'
import { NewIssue } from '../model/tracker/types'
import { IssuesPage } from '../model/tracker/issues-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'

test.describe('Collaborative test for issue', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Collaborative test')
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
  })

  test('Issues can be assigned to another users', async ({ browser }) => {
    const userFirstContext = await browser.newContext()
    const userSecondContext = await browser.newContext()

    const userFirstPage = await userFirstContext.newPage()
    const userSecondPage = await userSecondContext.newPage()

    // create issue
    const loginPage = new LoginPage(userFirstPage)
    await loginPage.goto()
    await loginPage.login(PlatformUser, '1234')

    const selectWorkspacePage = new SelectWorkspacePage(userFirstPage)
    await selectWorkspacePage.selectWorkspace('sanity-ws')

    const newIssue: NewIssue = {
      title: `Collaborative test for issue-${generateId()}`,
      description: 'Collaborative test for issue',
      status: 'Backlog',
      priority: 'Urgent',
      assignee: 'Appleseed John',
      createLabel: true,
      labels: `CREATE-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone',
      duedate: 'today',
      filePath: 'cat.jpeg'
    }

    const leftSideMenuPage = new LeftSideMenuPage(userFirstPage)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(userFirstPage)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(newIssue)

    // check by another user
    const loginPageSecond = new LoginPage(userSecondPage)
    await loginPageSecond.goto()
    await loginPageSecond.login(PlatformUserSecond, '1234')

    const selectWorkspacePageSecond = new SelectWorkspacePage(userSecondPage)
    await selectWorkspacePageSecond.selectWorkspace('sanity-ws')

    const leftSideMenuPageSecond = new LeftSideMenuPage(userSecondPage)
    await leftSideMenuPageSecond.buttonTracker.click()

    const issuesPageSecond = new IssuesPage(userSecondPage)
    await issuesPageSecond.modelSelectorAll.click()
    await issuesPageSecond.searchIssueByName(newIssue.title)
    await issuesPageSecond.openIssueByName(newIssue.title)

    const issuesDetailsPageSecond = new IssuesDetailsPage(userSecondPage)
    await issuesDetailsPageSecond.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
  })
})
