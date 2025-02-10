import { Page, test as setup } from '@playwright/test'
import path from 'path'

import { LoginPage, PlatformURI, PlatformUser, PlatformUserSecond, setTestOptions } from '@hcengineering/tests-sanity'
import { existsSync } from 'fs'

const authFile = path.join(__dirname, '../../.auth/storage.json')
const authFileSecond = path.join(__dirname, '../../.auth/storageSecond.json')
const adminFile = path.join(__dirname, '../../.auth/adminStorage.json')

async function authenticate (page: Page, user: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page)
  await (await page.goto(`${PlatformURI}`))?.finished()
  await loginPage.login(user, password)
}

if (!existsSync(authFile)) {
  setup('auth user1', async ({ page }) => {
    await authenticate(page, PlatformUser, '1234')
    await setTestOptions(page)

    await page.context().storageState({ path: authFile })
  })
}

if (!existsSync(authFileSecond)) {
  setup('auth user2', async ({ page }) => {
    await authenticate(page, PlatformUserSecond, '1234')
    await setTestOptions(page)

    await page.context().storageState({ path: authFileSecond })
  })
}

if (!existsSync(adminFile)) {
  setup('auth admin', async ({ page }) => {
    await authenticate(page, 'admin', '1234')
    await setTestOptions(page)

    await page.context().storageState({ path: adminFile })
  })
}
