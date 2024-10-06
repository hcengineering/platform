import { test } from '@playwright/test'
import { attachScreenshot, generateId, HomepageURI, PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'

import { faker } from '@faker-js/faker'
import { SettingsPage } from '../model/setting-page'

test.use({
  storageState: PlatformSetting
})

test.describe('ISO 13485, 4.2.4 Control of documents', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test.afterEach(async ({ browser }) => {
    const contexts = browser.contexts()
    for (const context of contexts) {
      await context.close()
    }
  })

  test('TESTS-298. Create a new Category from top right corner', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create a new category')
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
      await documentContentPage.expectCategoryCreated(title, code)
    })

    await attachScreenshot('TESTS-298_category_created.png', page)
  })

  test('TESTS-381. As a workspace user, I can create a new space and label it External Doc', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create a new space')
    await allure.tms('TESTS-381', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-381')
    const leftSideMenuPage = new LeftSideMenuPage(page)
    const folderName = generateId(5)

    await leftSideMenuPage.clickButtonOnTheLeft('Documents')
    await test.step('2. Create a new document space', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.clickAddFolderButton()
      await documentContentPage.fillDocumentSpaceForm(folderName)
      await documentContentPage.checkSpaceFormIsCreated(folderName)
      await documentContentPage.clickLeaveFolder(folderName)
    })

    await attachScreenshot('TESTS-381_document_space_created.png', page)
  })

  test('TESTS-406. As a space member only, I cannot delete any doc from that space', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create a new space')
    await allure.tms('TESTS-406', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-406')
    const leftSideMenuPage = new LeftSideMenuPage(page)
    const folderName = generateId(5)

    await leftSideMenuPage.clickButtonOnTheLeft('Documents')
    await test.step('2. Create a new document space', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.clickAddFolderButton()
      await documentContentPage.fillDocumentAndSetMember(folderName)
      await documentContentPage.checkIfUserCanCreateDocument(folderName)
    })

    await attachScreenshot('TESTS-406_user_cant_see_workspace.png', page)
  })

  test('TESTS-342. As a workspace owner, I can create roles and setup permissions', async ({ page }) => {
    await allure.description(
      'Requirement\nUser is the owner of the workspace and can create roles and setup permissions'
    )
    await allure.tms('TESTS-342', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-342')
    await test.step('2. Check user role', async () => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.openProfileMenu()
      await settingsPage.clickSettings()
      await settingsPage.clickDefaultDocuments()
      await settingsPage.chooseRole('Manager')
      await settingsPage.checkIfPermissionsExist()
      await settingsPage.checkIfAddUpdateDocumentOwnerPermissionIsDisabled()
      await attachScreenshot('TESTS-342_Manager_roles.png', page)
      await settingsPage.clickDefaultDocuments()
      await settingsPage.chooseRole('QARA')
      await settingsPage.checkIfPermissionsExist()
      await settingsPage.checkIfAddUpdateDocumentOwnerPermissionIsDisabled()
      await attachScreenshot('TESTS-342_QARA_roles.png', page)
      await settingsPage.clickDefaultDocuments()
      await settingsPage.chooseRole('Qualified User')
      await settingsPage.checkPermissionsExistQualifyUser()
      await settingsPage.checkIfAddUpdateDocumentOwnerPermissionIsDisabled()
      await attachScreenshot('TESTS-342_User_roles.png', page)
    })
  })
})
