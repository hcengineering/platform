import { test } from '@playwright/test'
import { allure } from 'allure-playwright'
import { LoginPage } from '../model/login-page'
import { generateId } from '../utils'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { SignUpPage } from '../model/signup-page'
import { SignUpData } from '../model/common-types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { NewIssue } from '../model/tracker/types'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'

test.describe('Workspace tests', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Workspace tests')
  })

  test('Create a workspace with a custom name', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.linkSignUp.click()

    const signUpPage = new SignUpPage(page)
    await signUpPage.signUp(newUser)

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.buttonCreateWorkspace.click()
    await selectWorkspacePage.createWorkspace(newWorkspaceName)

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()
  })

  test('Create a new issue in the workspace with a custom name', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newIssue: NewIssue = {
      title: `Issue with all parameters and attachments-${generateId()}`,
      description: 'Created issue with all parameters and attachments description',
      status: 'In progress',
      priority: 'Urgent',
      assignee: `${newUser.lastName} ${newUser.firstName}`,
      createLabel: true,
      labels: `CREATE-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone',
      duedate: 'today',
      filePath: 'cat.jpeg'
    }
    const newWorkspaceName = `New Issue Name - ${generateId(2)}`

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.linkSignUp.click()

    const signUpPage = new SignUpPage(page)
    await signUpPage.signUp(newUser)

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.buttonCreateWorkspace.click()
    await selectWorkspacePage.createWorkspace(newWorkspaceName)

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openIssuesForProject('Default')

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
  })
})
