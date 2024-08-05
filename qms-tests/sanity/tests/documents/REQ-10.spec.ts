import { test } from '@playwright/test'
import { attachScreenshot, HomepageURI, PlatformSettingSecond, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'

import { SettingsPage } from './../model/setting-page'

test.use({
  storageState: PlatformSettingSecond
})

test.describe('ISO 13485, 4.2.4 Control of documents ensure that documents of external origin are identified and their distribution controlled', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test('TESTS-341. As a workspace admin, I can create roles and setup permissions', async ({ page }) => {
    await allure.description(
      'Requirement\nUser is the owner of the workspace and can create roles and setup permissions'
    )
    await allure.tms('TESTS-341', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-341')
    await test.step('2. Check user role', async () => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.openProfileMenu()
      await settingsPage.clickSettings()
      await settingsPage.clickDefaultDocuments()
      await settingsPage.chooseRole('Manager')
      await settingsPage.checkIfPermissionsExist()
      await attachScreenshot('TESTS-341_Manager_roles.png', page)
      await settingsPage.clickDefaultDocuments()
      await settingsPage.chooseRole('QARA')
      await settingsPage.checkIfPermissionsExist()
      await attachScreenshot('TESTS-341_QARA_roles.png', page)
      await settingsPage.clickDefaultDocuments()
      await settingsPage.chooseRole('Qualified User')
      await settingsPage.checkPermissionsExistQualifyUser()
      await attachScreenshot('TESTS-341_User_roles.png', page)
    })
  })
})
