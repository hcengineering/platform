import { SignUpData } from '../model/common-types'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { SignUpPage } from '../model/signup-page'
import * as text from '../text/issueOnboardingText'
import { test } from '@playwright/test'
import { generateId, checkTextChunksVisibility, uploadFile } from '../utils'
import { NotificationPage } from '../model/notification-page'
import { UserProfilePage } from '../model/profile/user-profile-page'
import { ApiEndpoint } from '../API/Api'

test.describe.skip('Workspace tests', () => {
  let loginPage: LoginPage
  let signUpPage: SignUpPage
  let selectWorkspacePage: SelectWorkspacePage
  let leftSideMenuPage: LeftSideMenuPage
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  let notificationPage: NotificationPage
  let userProfilePage: UserProfilePage
  let api: ApiEndpoint

  test.beforeEach(async ({ page, request }) => {
    loginPage = new LoginPage(page)
    signUpPage = new SignUpPage(page)
    selectWorkspacePage = new SelectWorkspacePage(page)
    leftSideMenuPage = new LeftSideMenuPage(page)
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    notificationPage = new NotificationPage(page)
    userProfilePage = new UserProfilePage(page)
    api = new ApiEndpoint(request)
  })
  test('Create a workspace from onboarding', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.clickSignUp()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await leftSideMenuPage.clickTracker()
    await issuesPage.checkIssuesCount('Hello and Welcome to Huly! 🌟', 1)
    await issuesPage.checkIssuesCount('Todos and Time Blocking 🗓️', 1)
    await issuesPage.checkIssuesCount('Navigating Huly: Three Efficient Ways', 1)
    await issuesPage.checkIssuesCount('Connect GitHub with Huly (', 1)
    await issuesPage.checkIssuesCount('✨ProTip: Mouse over this', 1)
    await issuesPage.checkIssuesCount('Customize views with Display', 1)

    await issuesPage.openIssueById('HI-1')
  })

  test('check the content of the onboarding tracker', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.clickSignUp()
    await signUpPage.signUpPwd(newUser)

    await selectWorkspacePage.createWorkspace(newWorkspaceName)

    await leftSideMenuPage.clickTracker()
    await issuesPage.openIssueById('HI-1')
    await checkTextChunksVisibility(page, text.helloAndWelcomeToHuly)
    await issuesDetailsPage.clickCloseIssueButton()

    await issuesPage.openIssueById('HI-2')
    await checkTextChunksVisibility(page, text.toolsAndTimeBlocking)
    await issuesDetailsPage.clickCloseIssueButton()

    await issuesPage.openIssueById('HI-3')
    await checkTextChunksVisibility(page, text.navigationHully)
    await issuesDetailsPage.clickCloseIssueButton()

    await issuesPage.openIssueById('HI-4')
    await checkTextChunksVisibility(page, text.connectToGithub)
    await issuesDetailsPage.clickCloseIssueButton()

    await issuesPage.openIssueById('HI-5')
    await checkTextChunksVisibility(page, text.proTip)
    await issuesDetailsPage.clickCloseIssueButton()

    await issuesPage.openIssueById('HI-6')
    await checkTextChunksVisibility(page, text.customizeViewsAndDisplay)
  })

  test('check the content of the notification', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.clickSignUp()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await leftSideMenuPage.clickNotification()
    await notificationPage.clickOnNotification('HI-1')
    await checkTextChunksVisibility(page, text.helloAndWelcomeToHuly)
  })

  test('User is able to upload pictures', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await leftSideMenuPage.buttonTracker().click()
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await userProfilePage.clickAccountSettings()
    await userProfilePage.openUserAvatarMenu()
    await uploadFile(page, 'Testingo.png')
    await userProfilePage.clickSavaAvatarButton()
  })

  test('User is able to change workspace', async ({ page }) => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    const newWorkspaceName2 = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await api.createWorkspaceWithLogin(newWorkspaceName2, newUser.email, '1234')
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await userProfilePage.clickSelectWorkspace()
    await selectWorkspacePage.selectWorkspace(newWorkspaceName2)
    await selectWorkspacePage.clickCreateWorkspaceLogo()
    await selectWorkspacePage.checkIfWorkspaceExists(newWorkspaceName2)
  })

  test('User is able to change password', async () => {
    const newUser: SignUpData = {
      firstName: `FirstName-${generateId()}`,
      lastName: `LastName-${generateId()}`,
      email: `sanity-email+${generateId()}@gmail.com`,
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    const newWorkspaceName2 = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await userProfilePage.changePassword('1234', '4321')
    await userProfilePage.clickOnSignOutButton()
    await loginPage.login(newUser.email, '4321')
    await selectWorkspacePage.selectWorkspace(newWorkspaceName2)
    await selectWorkspacePage.clickCreateWorkspaceLogo()
    await selectWorkspacePage.checkIfWorkspaceExists(newWorkspaceName2)
  })
})
