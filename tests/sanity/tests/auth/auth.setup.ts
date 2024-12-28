import { test as setup, Page } from '@playwright/test'
import path from 'path'

import { PlatformUser, PlatformUserSecond, PlatformWs, PlatformURI, setTestOptions } from '../utils'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'

const authFile = path.join(__dirname, '../../.auth/storage.json')
const authFileSecond = path.join(__dirname, '../../.auth/storageSecond.json')

async function authenticate (page: Page, user: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page)
  await (await page.goto(`${PlatformURI}`))?.finished()
  await loginPage.login(user, password)
  const swp = new SelectWorkspacePage(page)
  await swp.selectWorkspace(PlatformWs)
  await page.waitForURL((url) => {
    return url.pathname.startsWith(`/workbench/${PlatformWs}/`)
  })
}

setup('auth user1', async ({ page }) => {
  await authenticate(page, PlatformUser, '1234')
  await setTestOptions(page)

  await page.context().storageState({ path: authFile })
})

setup('auth user2', async ({ page }) => {
  await authenticate(page, PlatformUserSecond, '1234')
  await setTestOptions(page)

  await page.context().storageState({ path: authFileSecond })
})
