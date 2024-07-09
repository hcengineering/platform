import { expect, test } from '@playwright/test'
import { attachScreenshot, generateId, PlatformURI, randomString } from '../utils'
import { allure } from 'allure-playwright'
import { UserSignUp } from '../model/types'
import { LoginPage } from '../model/login-page'
import { SignupPage } from '../model/signup-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'

test.describe('Registration tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}`))?.finished()
  })

  test('TESTS-143. User Registration', async ({ page }) => {
    await allure.description('Requirement\nUsers need to register with the system')
    await allure.tms('TESTS-143', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-143')
    await allure.description('User Registration')
    const workspaceName = `workspace-${generateId(4)}`

    const signUpUserData: UserSignUp = {
      firstName: randomString(),
      lastName: randomString(),
      email: `${randomString()}@gmail.com`,
      password: '1234'
    }

    await test.step('1. Registration', async () => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.buttonSignUp.click()

      const signupPage = new SignupPage(page)
      await signupPage.signup(signUpUserData)

      await attachScreenshot('TESTS-143_registration.png', page)

      await signupPage.buttonSignUp.click()
    })

    await test.step('2. Create workspace', async () => {
      const selectWorkspacePage = new SelectWorkspacePage(page)
      await selectWorkspacePage.createWorkspace(workspaceName)

      await attachScreenshot('TESTS-143_create_workspace.png', page)

      await selectWorkspacePage.buttonCreateWorkspace.click()

      const leftSideMenuPage = new LeftSideMenuPage(page)
      await leftSideMenuPage.buttonDocuments.waitFor({ state: 'visible' })
      await expect(leftSideMenuPage.buttonDocuments).toBeVisible()
    })
  })

  test('TESTS-144. Negative - Duplicate Email', async ({ page }) => {
    await allure.description('Requirement\nThe system should reject the registration with an email that already exists')
    await allure.tms('TESTS-144', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-144')
    const signUpUserData: UserSignUp = {
      firstName: randomString(),
      lastName: randomString(),
      email: 'user1',
      password: '1234'
    }

    await test.step('1. Attempt to register a user with an email that already exists', async () => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.buttonSignUp.click()

      const signupPage = new SignupPage(page)
      await signupPage.signup(signUpUserData)
      await signupPage.buttonSignUp.click()

      await expect(signupPage.textError).toHaveText('Account already exists')
    })
    await attachScreenshot('TESTS-144_duplicate_email.png', page)
  })
})
