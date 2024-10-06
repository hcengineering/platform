import { test } from '@playwright/test'
import { HomepageURI, PlatformSettingThird, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { DocumentContentPage } from '../model/documents/document-content-page'

test.use({
  storageState: PlatformSettingThird
})

test.describe('ISO 13485, 4.2.4 Control of documents ensure that documents of external origin are identified and their distribution controlled', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test('TESTS-389. As a non workspace owner, I cannot remove a user from workspace', async ({ page }) => {
    await allure.description(
      'Requirement\nUser is not a part of space members and cannot see or edit any document from that space'
    )
    await allure.tms('TESTS-389', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-389')
    await test.step('2. check if non member can see space', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.clickContacts()
      await documentContentPage.clickEmployee()
      await documentContentPage.selectEmployee('AQ Admin Qara')
      await documentContentPage.clickEmployeeDropdown()
      await documentContentPage.checkIfUserCanKick()
    })
  })
})
