import { test, expect } from '@playwright/test'
import { LoginPage } from '../model/login-page'
import { DefaultWorkspace, generateId, PlatformURI, PlatformUser } from '../utils'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { SignUpPage } from '../model/signup-page'
import { SignUpData } from '../model/common-types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { NewIssue } from '../model/tracker/types'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { SignInJoinPage } from '../model/signin-page'

test.describe('Workspace tests', () => {
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

  test('Check validation steps description for the create flow', async ({ page }) => {
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
    await signUpPage.checkInfo(page, 'Required field First name')
    await signUpPage.inputFirstName.fill(newUser.firstName)
    await signUpPage.checkInfo(page, 'Required field Last name')
    await signUpPage.inputLastName.fill(newUser.lastName)
    await signUpPage.checkInfo(page, 'Required field Email')
    await signUpPage.inputEmail.fill(newUser.email)
    await signUpPage.checkInfo(page, 'Required field Password')
    await signUpPage.inputNewPassword.fill(newUser.password)
    await signUpPage.checkInfo(page, "Repeat password don't match Password")
    await signUpPage.inputRepeatPassword.fill(newUser.password)
    await signUpPage.checkInfoSectionNotExist(page)
    await signUpPage.buttonSignUp.click()

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.checkInfo(page, 'Required field Workspace name')
    await selectWorkspacePage.buttonWorkspaceName.fill(newWorkspaceName)
    await selectWorkspacePage.checkInfoSectionNotExist(page)
  })

  test('Create a workspace with join link', async ({ page, browser }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `Some HULY #@$ WS - ${generateId(12)}`

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.linkSignUp.click()

    const signUpPage = new SignUpPage(page)
    await signUpPage.signUp(newUser)

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    // Generate invite link

    await page.click('#profile-button')
    await page.click('button:has-text("Invite to workspace")')
    await page.click('button:has-text("Get invite link")')

    const linkText = await page.locator('.antiPopup .link').textContent()

    const page2 = await browser.newPage()

    await page2.goto(linkText ?? '')

    const newUser2: SignUpData = {
      firstName: `FirstName2-${generateId()}`,
      lastName: `LastName2-${generateId()}`,
      email: `email+${generateId()}@gmail.com`,
      password: '1234'
    }

    await page2.getByRole('link', { name: 'Sign Up' }).click()
    const signUpPage2 = new SignUpPage(page2)
    await signUpPage2.signUp(newUser2, 'join')

    const leftSideMenuPage2 = new LeftSideMenuPage(page2)
    await leftSideMenuPage2.buttonTracker.click()
  })

  test('Create a workspace with join link - existing account', async ({ page, browser }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `Some HULY #@$ WS - ${generateId(12)}`

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.linkSignUp.click()

    const signUpPage = new SignUpPage(page)
    await signUpPage.signUp(newUser)

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    // Generate invite link

    await page.click('#profile-button')
    await page.click('button:has-text("Invite to workspace")')
    await page.click('button:has-text("Get invite link")')

    const linkText = await page.locator('.antiPopup .link').textContent()

    const page2 = await browser.newPage()

    const loginPage2 = new LoginPage(page2)
    await loginPage2.goto()
    await loginPage2.linkSignUp.click()

    const newUser2: SignUpData = {
      firstName: `FirstName2-${generateId()}`,
      lastName: `LastName2-${generateId()}`,
      email: `email+${generateId()}@gmail.com`,
      password: '1234'
    }

    const signUpPage2 = new SignUpPage(page2)
    await signUpPage2.signUp(newUser2)

    // Ok we signed in, and no workspace present.

    await page2.goto(linkText ?? '')

    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)

    const leftSideMenuPage2 = new LeftSideMenuPage(page2)
    await leftSideMenuPage2.buttonTracker.click()
  })

  test('Create workspace with LastToken in the localStorage', async ({ page, browser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(PlatformUser, '1234')

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.selectWorkspace(DefaultWorkspace)

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const lastToken = await page.evaluate(() => localStorage.getItem('login:metadata:LastToken') ?? '')
    expect(lastToken).not.toEqual('')

    await test.step('Check create workspace action', async () => {
      const newWorkspaceName = `Some HULY #@$ WS - ${generateId(12)}`
      const pageSecond = await browser.newPage()

      await (await pageSecond.goto(`${PlatformURI}/login/login`))?.finished()
      await pageSecond.evaluate((lastToken) => {
        localStorage.setItem('login:metadata:LastToken', lastToken)
      }, lastToken)
      await (await pageSecond.goto(`${PlatformURI}/login/createWorkspace`))?.finished()

      const selectWorkspacePageSecond = new SelectWorkspacePage(pageSecond)
      await selectWorkspacePageSecond.createWorkspace(newWorkspaceName)

      const leftSideMenuPageSecond = new LeftSideMenuPage(pageSecond)
      await leftSideMenuPageSecond.buttonTracker.click()
    })
  })
})
