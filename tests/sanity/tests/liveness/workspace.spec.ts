import { test } from '@playwright/test'
import { PlatformUser, PlatformURILiveness } from '../utils'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { CommonTrackerPage } from '../model/tracker/common-tracker-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { faker } from '@faker-js/faker'
import { UserProfilePage } from '../model/profile/user-profile-page'

test.describe('workspace test @livness ', () => {
  let loginPage: LoginPage
  let commonTrackerPage: CommonTrackerPage
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let workspaceName: string
  let selectWorkspacePage: SelectWorkspacePage
  let userProfilePage: UserProfilePage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    commonTrackerPage = new CommonTrackerPage(page)
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    selectWorkspacePage = new SelectWorkspacePage(page)
    userProfilePage = new UserProfilePage(page)
    await loginPage.goto(PlatformURILiveness)
  })

  test.beforeAll(async () => {
    const randomString = faker.lorem.word(7)
    workspaceName = 'testing-' + randomString
  })

  test('user can create a workspace', async ({ page }) => {
    await loginPage.login(PlatformUser, '1234')
    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.createWorkspace(workspaceName, false)
    await commonTrackerPage.checkIfMainPanelIsVisible()
    await trackerNavigationMenuPage.checkIfTrackerSidebarIsVisible()
  })

  test('user can leave a workspace', async ({ page }) => {
    await loginPage.goto(PlatformURILiveness)
    await loginPage.login(PlatformUser, '1234')
    await selectWorkspacePage.selectWorkspace(workspaceName)
    await commonTrackerPage.checkIfMainPanelIsVisible()
    await trackerNavigationMenuPage.checkIfTrackerSidebarIsVisible()
    await userProfilePage.openProfileMenu()
    await userProfilePage.selectProfileByName('user1 user1')
    await userProfilePage.clickLeaveWorkspaceButton()
    await userProfilePage.clickLeaveWorkspaceCancelButton()
    await userProfilePage.clickLeaveWorkspaceButton()
    await userProfilePage.clickLeaveWorkspaceConfirmButton()
    await userProfilePage.checkIfAccountIsDisabled()
  })
})
