import { test } from '@playwright/test'
import { PlatformUser, NonExistingUser } from './utils'
import { LoginPage } from './model/login-page'
import { SelectWorkspacePage } from './model/select-workspace-page'

test.describe('login test', () => {
  test('check login with valid credentials', async ({ page }) => {
    page.on('pageerror', (exception) => {
      console.log('Uncaught exception:')
      console.log(exception.message)
    })
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(PlatformUser, '1234')

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.selectWorkspace('SanityTest')
  })

  test('check login with invalid username', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(NonExistingUser, '1234')

    //verify user wasn't navigated away from login page
    expect(loginPage.verifyURL).toBe(true)
    //verify correct error message shown
    expect(loginPage.incorrectEmailTxtVisible).toBe(true)
  })

  test('check login with invalid password', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(PlatformUser, '123456')

    //verify user wasn't navigated away from login page
    expect(loginPage.verifyURL).toBe(true)
    //verify correct error message shown
    expect(loginPage.incorrectPasswordTxtVisible).toBe(true)
  })
})
