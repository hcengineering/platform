import { Page, test } from '@playwright/test'
import { PlatformUser } from './utils'
import { LoginPage } from './model/login-page'
import { SelectWorkspacePage } from './model/select-workspace-page'

const setPageErrorListener = (page: Page): void => {
  page.on('pageerror', (exception) => {
    console.log('Uncaught exception:')
    console.log(exception.message)
  })
}

const gotoLoginPage = async (page: Page): Promise<LoginPage> => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  return loginPage
}

test.describe('login test', () => {
  const invalidUser: string = 'WrongUserName'
  const invalidPass: string = '1111'
  const validPass: string = '1234'
  // TODO Move the valid password to the .env file or to the environment variables in IDE

  test('Check the button and messages', async ({ page }) => {
    setPageErrorListener(page)
    const loginPage = await gotoLoginPage(page)
    await loginPage.isButtonLoginDisabled()
    await loginPage.isAlertReqEmailShown()

    await loginPage.fillCredentials('1', '')
    await loginPage.isButtonLoginDisabled()
    await loginPage.isAlertReqPassShown()

    await loginPage.fillCredentials('', '2')
    await loginPage.isButtonLoginDisabled()
    await loginPage.isAlertReqEmailShown()

    await loginPage.fillCredentials('1', '2')
    await loginPage.isButtonLoginEnabled()
  })

  test('Login with invalid user name', async ({ page }) => {
    setPageErrorListener(page)
    const loginPage = await gotoLoginPage(page)
    await loginPage.login(invalidUser, validPass)

    await loginPage.isAlertWrongAccShown()
  })

  test('Login with invalid password', async ({ page }) => {
    setPageErrorListener(page)
    const loginPage = await gotoLoginPage(page)
    await loginPage.login(PlatformUser, invalidPass)

    await loginPage.isAlertWrongPassShown()
  })

  test('Login with valid credentials', async ({ page }) => {
    setPageErrorListener(page)
    const loginPage = await gotoLoginPage(page)
    await loginPage.login(PlatformUser, '1234')

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.selectWorkspace('SanityTest')
  })
})

