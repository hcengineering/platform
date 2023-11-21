import { test } from '@playwright/test'
import { generateId, PlatformURI } from './utils'
import { allure } from 'allure-playwright'
import { SignupPage } from './model/signup-page'
import { SelectWorkspacePage } from './model/select-workspace-page'

test.describe('Signup tests', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Signup tests')
    await (await page.goto(`${PlatformURI}/login/signup`))?.finished()
  })

  test('signup a new user', async ({ page }) => {
    const signupPage = new SignupPage(page)
    await signupPage.signup('FirstName', 'LastName', `testemail+${generateId()}@gmail.com`, 'UniquePass!1234')

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.buttonCreateWorkspace.click()
    await selectWorkspacePage.createWorkspace(`test-${generateId()}`)

    await selectWorkspacePage.checkError(page, 'Account not found')
  })
})
