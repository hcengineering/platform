import { test } from '@playwright/test'
import { attachScreenshot, generateId, HomepageURI, PlatformSettingSecond, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'

import { SettingsPage } from './../model/setting-page'
import { DocumentDetails, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { faker } from '@faker-js/faker'
import { prepareDocumentStep } from './common-documents-steps'

test.use({
  storageState: PlatformSettingSecond
})

test.describe('ISO 13485, 4.2.4 Control of documents ensure that documents of external origin are identified and their distribution controlled', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test('TESTS-341. As a workspace owner, I can create roles and setup permissions', async ({ page }) => {
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

  test('TESTS-347. As a space manager, I can Create New document from the New Doc blue button', async ({ page }) => {
    await allure.description(
      'Requirement\nUser is a space manager and can create a new document from the New Doc blue button'
    )
    await allure.tms('TESTS-347', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-347')
    await test.step('2. create new document as manager role', async () => {
      const completeDocument: NewDocument = {
        template: 'HR (HR)',
        title: `Complete document-${generateId()}`,
        description: `Complete document description-${generateId()}`
      }
      const folderName = faker.word.words(1)
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.clickAddFolderButton()
      await documentContentPage.fillDocumentSpaceFormManager(folderName)
      await prepareDocumentStep(page, completeDocument)

      const documentDetails: DocumentDetails = {
        type: 'HR',
        category: 'Human Resources',
        version: 'v0.1',
        status: DocumentStatus.DRAFT,
        owner: 'Dirak Kainin',
        author: 'Dirak Kainin'
      }
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.DRAFT,
        version: 'v0.1'
      })
      await documentContentPage.clickLeaveFolder(folderName)
      await attachScreenshot('TESTS-347_manager_document_created.png', page)
    })
  })
})
