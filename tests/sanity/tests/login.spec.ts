import { test } from '@playwright/test'
import { PlatformUser } from './utils'
import { LoginPage } from './model/login-page'
import { SelectWorkspacePage } from './model/select-workspace-page'

test.describe('login test', () => {
  test('check login', async ({ page }) => {
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
})
