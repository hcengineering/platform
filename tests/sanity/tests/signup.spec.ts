import { test, expect } from '@playwright/test'
import { generateId, PlatformURI } from './utils'
import { allure } from 'allure-playwright'
import { SignupPage } from './model/signup-page'

test.describe('Signup tests', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Signup tests')
    await (await page.goto(`${PlatformURI}/login/signup`))?.finished()
  })

  test('signup a new user', async ({ page }) => {
    const signupPage = new SignupPage(page)
    await signupPage.signup('FirstName', 'LastName', `testemail+${generateId()}@gmail.com`, 'UniquePass!1234')

    await expect(signupPage.textError).toHaveText('Internal server error')
  })
})
