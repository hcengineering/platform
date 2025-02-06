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

  // Skipped until we fix init workspace for tracex
  test.skip('TESTS-143. User Registration', async ({ page }) => {
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

  test('TESTS-396. Correct email and wrong password: I cannot log in ', async ({ page }) => {
    await allure.description('Requirement\nThe system should reject the wrong password')
    await allure.tms('TESTS-396', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-396')
    await test.step('1. Try to login with wrong password', async () => {
      const loginPage = new LoginPage(page)
      await loginPage.login('user1', 'wrongPassword')
      await loginPage.checkIfUserIsLoggedIn('wrong-password')
    })
    await attachScreenshot('TESTS-396_empty_fields.png', page)
  })

  test('TESTS-397. Wrong email and correct password: I cannot log in ', async ({ page }) => {
    await allure.description('Requirement\nThe system should reject the registration with wrong email')
    await allure.tms('TESTS-397', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-397')
    await test.step('1. Try to login with wrong email', async () => {
      const loginPage = new LoginPage(page)
      await loginPage.login('wrongEmail', '1234')
      await loginPage.checkIfUserIsLoggedIn('wrong-email')
    })
    await attachScreenshot('TESTS-397_empty_fields.png', page)
  })

  test('TESTS-398. Correct email and correct password: I can log in ', async ({ page }) => {
    await allure.description('Requirement\nUser is able to login with correct credentials')
    await allure.tms('TESTS-398', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-397')
    await test.step('1. Try to login with working credentials', async () => {
      const loginPage = new LoginPage(page)
      await loginPage.login('user1', '1234')
      await loginPage.checkIfUserIsLoggedIn('correct-credentials')
    })
    await attachScreenshot('TESTS-398_empty_fields.png', page)
  })
})
