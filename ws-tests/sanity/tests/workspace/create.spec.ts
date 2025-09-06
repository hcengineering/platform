import { faker } from '@faker-js/faker'
import {
  generateId,
  IssuesDetailsPage,
  IssuesPage,
  LeftSideMenuPage,
  LoginPage,
  NewIssue,
  SelectWorkspacePage,
  SignInJoinPage,
  SignUpData,
  SignUpPage,
  TrackerNavigationMenuPage,
  UserProfilePage
} from '@hcengineering/tests-sanity'
import { expect, test } from '@playwright/test'

test.describe('Workspace tests', () => {
  let loginPage: LoginPage
  let signUpPage: SignUpPage
  let selectWorkspacePage: SelectWorkspacePage
  let leftSideMenuPage: LeftSideMenuPage
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let issuesPage: IssuesPage
  let userProfilePage: UserProfilePage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    signUpPage = new SignUpPage(page)
    selectWorkspacePage = new SelectWorkspacePage(page)
    leftSideMenuPage = new LeftSideMenuPage(page)
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    issuesPage = new IssuesPage(page)
    userProfilePage = new UserProfilePage(page)
  })

  test('Create a workspace with a custom name', async () => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.clickSignUp()
    await signUpPage.signUp(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await leftSideMenuPage.clickTracker()
  })

  test('Create a new issue in the workspace with a custom name', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newIssue: NewIssue = {
      title: `Issue with all parameters and attachments-${generateId()}`,
      description: 'Created issue with all parameters and attachments description',
      status: 'In Progress',
      priority: 'Urgent',
      assignee: `${newUser.lastName} ${newUser.firstName}`,
      createLabel: true,
      labels: `CREATE-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone',
      duedate: 'today'
    }
    const newWorkspaceName = `New Issue Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.clickSignUp()
    await signUpPage.signUp(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)

    await trackerNavigationMenuPage.openIssuesForProject('Default')
    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.openIssueByName(newIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.checkIssue(newIssue)
  })

  test('Check validation steps description for the create flow', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`

    await loginPage.goto()
    await loginPage.clickSignUp()

    await signUpPage.checkInfo(page, 'Required field First name')
    await signUpPage.enterFirstName(newUser.firstName)
    await signUpPage.checkInfo(page, 'Required field Last name')
    await signUpPage.enterLastName(newUser.lastName)
    await signUpPage.checkInfo(page, 'Required field Email')
    await signUpPage.enterEmail(newUser.email)
    await signUpPage.checkInfo(page, 'Required field Password')
    await signUpPage.enterPassword(newUser.password)
    await signUpPage.checkInfo(page, "Repeat password don't match Password")
    await signUpPage.enterRepeatPassword(newUser.password)
    await signUpPage.checkInfoSectionNotExist(page)
    await signUpPage.clickSignUp()
    await selectWorkspacePage.checkInfo(page, 'Required field Workspace name')
    await selectWorkspacePage.enterWorkspaceName(newWorkspaceName)
    await selectWorkspacePage.checkInfoSectionNotExist(page)
  })

  test('Create a workspace with join link', async ({ page, browser }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `Some HULY #@$ WS - ${generateId(12)}`
    await loginPage.goto()
    await loginPage.clickSignUp()
    await signUpPage.signUp(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await leftSideMenuPage.clickTracker()

    // Generate invite link

    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()

    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    try {
      await page2.goto(linkText ?? '')
      const newUser2: SignUpData = {
        firstName: `FirstName2-${generateId()}`,
        lastName: `LastName2-${generateId()}`,
        email: `sanity-email+${generateId()}@gmail.com`,
        password: '1234'
      }

      const signUpPage2 = new SignUpPage(page2)
      await signUpPage2.signUp(newUser2)

      const leftSideMenuPage2 = new LeftSideMenuPage(page2)
      await leftSideMenuPage2.clickTracker()
    } finally {
      await page2.close()
    }
  })

  test('Create a workspace with join link - existing account', async ({ page, browser }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `Some HULY #@$ WS - ${generateId(12)}`
    await loginPage.goto()
    await loginPage.clickSignUp()
    await signUpPage.signUp(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await leftSideMenuPage.clickTracker()

    // Generate invite link
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()

    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    try {
      const loginPage2 = new LoginPage(page2)
      await loginPage2.goto()
      await loginPage2.clickSignUp()

      const newUser2: SignUpData = {
        firstName: `FirstName2-${generateId()}`,
        lastName: `LastName2-${generateId()}`,
        email: `sanity-email+${generateId()}@gmail.com`,
        password: '1234'
      }

      const signUpPage2 = new SignUpPage(page2)
      await signUpPage2.signUp(newUser2)
      await page2.waitForURL((url) => {
        return url.pathname.startsWith('/login/createWorkspace')
      })

      await page2.waitForURL((url) => {
        return url.pathname.startsWith('/login/createWorkspace')
      })

      await page2.waitForURL((url) => {
        return url.pathname.startsWith('/login/createWorkspace')
      })

      // Ok we signed in, and no workspace present.
      await page2.goto(linkText ?? '')
      const joinPage = new SignInJoinPage(page2)
      await joinPage.join(newUser2)

      const leftSideMenuPage2 = new LeftSideMenuPage(page2)
      await leftSideMenuPage2.clickTracker()
    } finally {
      await page2.close()
    }
  })

  test('User can leave workspace', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const newWorkspaceName = `Some HULY #@$ WS - ${generateId(12)}`
    await loginPage.goto()
    await loginPage.clickSignUp()
    await signUpPage.signUp(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await trackerNavigationMenuPage.checkIfTrackerSidebarIsVisible()
    await userProfilePage.openProfileMenu()
    await userProfilePage.selectProfileByName(newUser.lastName + ' ' + newUser.firstName)
    await userProfilePage.clickLeaveWorkspaceButton()
    await userProfilePage.clickLeaveWorkspaceCancelButton()
    await userProfilePage.clickLeaveWorkspaceButton()
    await userProfilePage.clickLeaveWorkspaceConfirmButton()
    await expect(page.locator('form')).toContainText('Select workspace')
    await expect(page.getByText(newWorkspaceName)).toHaveCount(0)
  })
})
