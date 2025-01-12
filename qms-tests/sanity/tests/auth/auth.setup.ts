import { test as setup, Page } from '@playwright/test'
import path from 'path'

import { PlatformUser, PlatformUserSecond, PlatformUserThird, PlatformUserQara, PlatformWs, PlatformURI, setTestOptions } from '../utils'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'

const authFile = path.join(__dirname, '../../.auth/storage.json')
const authFileSecond = path.join(__dirname, '../../.auth/storageSecond.json')
const authFileThird = path.join(__dirname, '../../.auth/storageThird.json')
const authFileQARA = path.join(__dirname, '../../.auth/storageQaraManager.json')

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

setup('auth user3', async ({ page }) => {
  await authenticate(page, PlatformUserThird, '1234')
  await setTestOptions(page)

  await page.context().storageState({ path: authFileThird })
})

setup('auth qara', async ({ page }) => {
  await authenticate(page, PlatformUserQara, '1234')
  await setTestOptions(page)

  await page.context().storageState({ path: authFileQARA })
})
