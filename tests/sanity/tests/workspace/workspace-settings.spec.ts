import { SignUpData } from '../model/common-types'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { SignUpPage } from '../model/signup-page'
import { test } from '@playwright/test'
import { generateId } from '../utils'
import { UserProfilePage } from '../model/profile/user-profile-page'
import { ButtonType, WorkspaceSettingsPage } from '../model/workspace/workspace-settings-page'
import { OwnersPage } from '../model/workspace/owner-pages'
import { faker } from '@faker-js/faker'

test.describe('Workspace tests', () => {
  let loginPage: LoginPage
  let signUpPage: SignUpPage
  let selectWorkspacePage: SelectWorkspacePage
  let userProfilePage: UserProfilePage
  let workspaceSettingsPage: WorkspaceSettingsPage
  let ownersPage: OwnersPage
  let newUser: SignUpData

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    signUpPage = new SignUpPage(page)
    selectWorkspacePage = new SelectWorkspacePage(page)
    userProfilePage = new UserProfilePage(page)
    workspaceSettingsPage = new WorkspaceSettingsPage(page)
    ownersPage = new OwnersPage(page)
  })

  test('User the owner is showing inside the owner tab', async ({ page }) => {
    newUser = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUp(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await workspaceSettingsPage.selectWorkspaceSettingsTab(ButtonType.Owners)
    await ownersPage.checkIfOwnerExists(newUser.firstName)
  })
})
