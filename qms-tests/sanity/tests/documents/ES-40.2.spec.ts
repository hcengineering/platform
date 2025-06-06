import { test } from '@playwright/test'
import { PlatformUser } from '../utils'
import { LoginPage } from '../model/login-page'

test.describe('login test', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('check login', async () => {
    await loginPage.login(PlatformUser, '1234')
  })

  test('TESTS-392 - As a non workspace user account I cannot log into TraceX', async () => {
    await loginPage.login('Wrong User', 'Wrong password')
    await loginPage.checkIfErrorMessageIsShown('Account not found or the provided credentials are incorrect')
  })

  test('TESTS-396 - Correct email and wrong password: I cannot log in', async () => {
    await loginPage.login(PlatformUser, 'Wrong password')
    await loginPage.checkIfErrorMessageIsShown('Account not found or the provided credentials are incorrect')
  })

  test('TESTS-397 - Wrong email and correct password: I cannot log in', async () => {
    await loginPage.login('Wrong User', '1234')
    await loginPage.checkIfErrorMessageIsShown('Account not found or the provided credentials are incorrect')
  })
})
