import { test } from '@playwright/test'
import { PlatformUser } from './utils'
import { LoginPage } from './model/login-page'

test.describe('login test', () => {
  test('check login', async ({ page }) => {
    page.on('pageerror', (exception) => {
      console.log('Uncaught exception:')
      console.log(exception.message)
    })
    const loginPage = new LoginPage(page)
    await loginPage.visitLoginRoute()
    await loginPage.login(PlatformUser, '1234', '.auth.json')
  })
})
