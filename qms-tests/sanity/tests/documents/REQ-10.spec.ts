import { test } from '@playwright/test'
import {
  attachScreenshot,
  DocumentURI,
  generateId,
  getSecondPage,
  HomepageURI,
  PlatformSettingSecond,
  PlatformURI
} from '../utils'
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

  test('TESTS-402. As a non space member, I cannot see nor edit any doc from that space', async ({ page }) => {
    await allure.description(
      'Requirement\nUser is not a part of space members and cannot see or edit any document from that space'
    )
    await allure.tms('TESTS-402', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-402')
    await test.step('2. check if non member can see space', async () => {
      const folderName = faker.word.words(1)
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.clickAddFolderButton()
      await documentContentPage.fillDocumentSpaceFormManager(folderName)
      await documentContentPage.changeDocumentSpaceMembers(folderName)
      await documentContentPage.checkIfTheSpaceIsVisible(folderName, false)
      await attachScreenshot('TESTS-402_space_not_existing.png', page)
    })
  })

  test('TESTS-403. As a space member only, I cannot edit any doc from that space', async ({ page }) => {
    await allure.description(
      'Requirement\nUser is only part as a member and cannot see or edit any document from that space'
    )
    await allure.tms('TESTS-403', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-403')
    await test.step('2. check if non member edit or create a new doc in space', async () => {
      const folderName = faker.word.words(1)
      const documentContentPage = new DocumentContentPage(page)
      const completeDocument: NewDocument = {
        template: 'HR (HR)',
        title: `Complete document-${generateId()}`,
        description: `Complete document description-${generateId()}`
      }
      await documentContentPage.clickAddFolderButton()
      await documentContentPage.fillDocumentSpaceFormManager(folderName)
      await prepareDocumentStep(page, completeDocument, 1, undefined, folderName)
      await documentContentPage.checkTeamMembersReviewerCoauthorApproverNotExists()
      await attachScreenshot('TESTS-403_member_cant_edit_space.png', page)
    })
  })

  test('TESTS-404. As a space member only, I cannot create any doc from that space', async ({ page }) => {
    await allure.description('Requirement\nUser is not able to create any document from that space')
    await allure.tms('TESTS-404', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-404')
    await test.step('2. cCheck if user can not create documents as a space member', async () => {
      const folderName = faker.word.words(1)
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.clickAddFolderButton()
      await documentContentPage.createDocumentSpaceMembersToJustMember(folderName)
      await documentContentPage.checkIfEditSpaceButtonExists(folderName, false)
      await page.keyboard.press('Escape')
      await documentContentPage.checkIfUserCanSelectSpace(folderName, false)
      await attachScreenshot('TESTS-404_non_space_member_can_not_create_documents.png', page)
    })
  })

  test('TESTS-405. As a Manager space member, I can delete a doc I have previously created', async ({ page }) => {
    await allure.description('Requirement\nUser is not able to create any document from that space')
    const completeDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Complete document-${generateId()}`,
      description: `Complete document description-${generateId()}`
    }
    await allure.tms('TESTS-405', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-405')
    await test.step('2. cCheck if user can not create documents as a space member', async () => {
      const folderName = faker.word.words(1)
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.clickAddFolderButton()
      await documentContentPage.fillQuaraManager(folderName)
      // check if user can create document in space
      await prepareDocumentStep(page, completeDocument, 1, undefined, folderName)
      await documentContentPage.executeMoreActions('Delete')
    })

    await test.step('3. Check that the document status is equal to deleted status', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DELETED)
    })
    await attachScreenshot('TESTS-405_status_is_deleted.png', page)
  })

  test('TESTS-390. As a workspace admin, I can assign a user to any private space (e.g. Task, Controlled doc, Product, Training)', async ({
    page,
    browser
  }) => {
    await allure.description(
      'Requirement\nUser is not a part of space members and cannot see or edit any document from that space'
    )
    await allure.tms('TESTS-390', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-390')
    const folderName = faker.word.words(1)
    const userSecondPage = await getSecondPage(browser)
    const documentContentPage = new DocumentContentPage(page)
    const documentContentPageSecond = new DocumentContentPage(userSecondPage)
    await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()
    await test.step('2. create a new space', async () => {
      await documentContentPage.clickDocumentsSpace()
      await documentContentPage.clickOnTeamspaceOrArrow()
      await documentContentPage.fillDocumentAndSetMemberPrivate(folderName)
      await test.step('2. check if user can see space', async () => {
        await documentContentPageSecond.clickDocumentsSpace()
        await documentContentPageSecond.checkIfTheSpaceIsVisible(folderName, true)
        await attachScreenshot('TESTS-391_space_not_existing.png', userSecondPage)
      })
    })
  })
})
