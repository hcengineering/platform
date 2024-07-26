import { test } from '@playwright/test'
import { attachScreenshot, HomepageURI, PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'

import { faker } from '@faker-js/faker'

test.use({
  storageState: PlatformSetting
})

test.describe('ISO 13485, 4.2.4 Control of documents', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test('TESTS-298. Create a new Category from top right corner', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create a new categoryx')
    await allure.tms('TESTS-298', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-298')

    const title = faker.word.words(2)
    const description = faker.lorem.sentence(1)
    const code = faker.word.words(2)
    const leftSideMenuPage = new LeftSideMenuPage(page)

    await leftSideMenuPage.clickButtonOnTheLeft('Documents')
    await test.step('2. Create a new category', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.selectControlDocumentSubcategory('Categories')
      await documentContentPage.clickOnAddCategoryButton()
      await documentContentPage.fillCategoryForm(title, description, code)
    })

    await attachScreenshot('TESTS-298_category_created.png', page)
  })
})
