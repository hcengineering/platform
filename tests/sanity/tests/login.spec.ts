import { test, expect } from '@playwright/test'
import { PlatformUser } from './utils'
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

  test('check login with valid username and wrong password', async ({ page }) => {
    page.on('pageerror', (exception) => {
      console.log('Uncaught exception:')
      console.log(exception.message)
    })
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(PlatformUser, 'wrong_password')
    const errDiv = page.locator('div.ERROR')
    await expect(errDiv).toHaveText('Invalid credentials')
  })

  test('check login with invalid username', async ({ page }) => {
    page.on('pageerror', (exception) => {
      console.log('Uncaught exception:')
      console.log(exception.message)
    })
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('wrong_username', 'wrong_password')
    const errDiv = page.locator('div.ERROR')
    await expect(errDiv).toHaveText('Invalid credentials')
  })
})
