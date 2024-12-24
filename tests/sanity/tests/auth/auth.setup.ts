import { test as setup } from '@playwright/test'
import path from 'path'

import { PlatformUser, PlatformUserSecond, PlatformWs, PlatformURI } from '../utils'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'

const authFile = path.join(__dirname, '../../.auth/storage.json')
const authFileSecond = path.join(__dirname, '../../.auth/storageSecond.json')

setup('auth user1', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await (await page.goto(`${PlatformURI}`))?.finished()
  await loginPage.login(PlatformUser, '1234')
  const swp = new SelectWorkspacePage(page)
  await swp.selectWorkspace(PlatformWs)

  await page.context().storageState({ path: authFile })
})

setup('auth user2', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await (await page.goto(`${PlatformURI}`))?.finished()
  await loginPage.login(PlatformUserSecond, '1234')
  const swp = new SelectWorkspacePage(page)
  await swp.selectWorkspace(PlatformWs)

  await page.context().storageState({ path: authFileSecond })
})
