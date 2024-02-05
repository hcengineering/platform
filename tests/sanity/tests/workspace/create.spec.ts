import { test } from '@playwright/test'
import { allure } from 'allure-playwright'
import { LoginPage } from '../model/login-page'
import { generateId } from '../utils'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { SignUpPage } from '../model/signup-page'
import { SignUpData } from '../model/common-types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'

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
})
