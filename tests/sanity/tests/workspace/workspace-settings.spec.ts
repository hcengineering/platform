import { SignUpData } from '../model/common-types'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { SignUpPage } from '../model/signup-page'
import { test } from '@playwright/test'
import { generateId, uploadFile } from '../utils'
import { UserProfilePage } from '../model/profile/user-profile-page'
import { ButtonType, WorkspaceSettingsPage } from '../model/workspace/workspace-settings-page'
import { OwnersPage } from '../model/workspace/owner-pages'
import { faker } from '@faker-js/faker'
import { ClassesPage } from '../model/workspace/classes-pages'

test.describe('Workspace tests', () => {
  let loginPage: LoginPage
  let signUpPage: SignUpPage
  let selectWorkspacePage: SelectWorkspacePage
  let userProfilePage: UserProfilePage
  let workspaceSettingsPage: WorkspaceSettingsPage
  let ownersPage: OwnersPage
  let newUser: SignUpData
  let classesPage: ClassesPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    signUpPage = new SignUpPage(page)
    selectWorkspacePage = new SelectWorkspacePage(page)
    userProfilePage = new UserProfilePage(page)
    workspaceSettingsPage = new WorkspaceSettingsPage(page)
    ownersPage = new OwnersPage(page)
    classesPage = new ClassesPage(page)
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
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await workspaceSettingsPage.selectWorkspaceSettingsTab(ButtonType.Owners)
    await ownersPage.checkIfOwnerExists(newUser.firstName)
  })

  test('User is able to set himself as an spaces admin', async ({ page }) => {
    newUser = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await workspaceSettingsPage.selectWorkspaceSettingsTab(ButtonType.Spaces)
    await ownersPage.addMember(newUser.firstName)
  })

  test('User is able to change workspace picture', async ({ page }) => {
    newUser = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await workspaceSettingsPage.selectWorkspaceSettingsTab(ButtonType.General)
    await ownersPage.clickOnWorkspaceLogo()
    await uploadFile(page, 'cat3.jpeg')
    await ownersPage.saveUploadedLogo()
    await ownersPage.checkIfPictureIsUploaded()
  })

  test('User is able to create template', async ({ page }) => {
    newUser = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    const newTemplateName = faker.word.words(2)
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await workspaceSettingsPage.selectWorkspaceSettingsTab(ButtonType.TextTemplate)
    await ownersPage.createTemplateWithName(newTemplateName)
  })

  test('User is able to see all the classes', async ({ page }) => {
    newUser = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await workspaceSettingsPage.selectWorkspaceSettingsTab(ButtonType.Classes)
    await classesPage.checkIfClassesExists()
  })

  test('User is able to create Enum', async ({ page }) => {
    newUser = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    const enumTitle = faker.word.words(2)
    const enumName = faker.word.words(2)
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await workspaceSettingsPage.selectWorkspaceSettingsTab(ButtonType.Enums)
    await ownersPage.createEnumWithName(enumTitle, enumName)
  })

  // Seems that there is currently a bug
  test.skip('User is able to create Enums', async ({ page }) => {
    newUser = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const newWorkspaceName = `New Workspace Name - ${generateId(2)}`
    const enumTitle = faker.word.words(2)
    const enumName = faker.word.words(2)
    await loginPage.goto()
    await loginPage.linkSignUp().click()
    await signUpPage.signUpPwd(newUser)
    await selectWorkspacePage.createWorkspace(newWorkspaceName)
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await workspaceSettingsPage.selectWorkspaceSettingsTab(ButtonType.InviteSettings)
    await ownersPage.createEnumWithName(enumTitle, enumName)
  })
})
