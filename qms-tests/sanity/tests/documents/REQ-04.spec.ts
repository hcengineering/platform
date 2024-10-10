import { test, expect } from '@playwright/test'
import {
  attachScreenshot,
  DocumentURI,
  generateId,
  getSecondPage,
  HomepageURI,
  PlatformSetting,
  PlatformURI
} from '../utils'
import { allure } from 'allure-playwright'
import { DocumentsPage } from '../model/documents/documents-page'
import { DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { prepareDocumentStep } from './common-documents-steps'

import { faker } from '@faker-js/faker'

test.use({
  storageState: PlatformSetting
})

test.describe('ISO 13485, 4.2.4 Control of documents', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test('TESTS-399. Tool does not influence content: Entered text in a document does not change over time', async ({
    page,
    browser
  }) => {
    await allure.description(
      'Requirement\nUsers need to make a resolve all comments and done documents for the Effective status'
    )
    await allure.tms('TESTS-399', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-399')

    const userSecondPage = await getSecondPage(browser)
    const completeDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Complete document-${generateId()}`,
      description: `Complete document description-${generateId()}`
    }
    const reviewer = 'Dirak Kainin'
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    const newContent = faker.lorem.paragraphs(10)

    await prepareDocumentStep(page, completeDocument)
    const documentContentPage = new DocumentContentPage(page)

    await documentContentPage.addContent(newContent)

    await test.step('2. Send for Approval', async () => {
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([reviewer])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_APPROVAL,
        version: 'v0.1'
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
    })

    await test.step('3. Approve document', async () => {
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()
      await documentsPageSecond.openDocument(completeDocument.title)

      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.confirmApproval()

      await documentContentPageSecond.checkDocumentStatus(DocumentStatus.EFFECTIVE)
      await documentContentPageSecond.checkDocument({
        ...documentDetails,
        status: DocumentStatus.EFFECTIVE,
        version: 'v0.1'
      })
      await documentContentPageSecond.checkCurrentRights(DocumentRights.VIEWING)

      await attachScreenshot('TESTS-399_approve_document.png', page)
    })

    await test.step('4. Check the content of the draft matches the approved version', async () => {
      const actualText = await page.locator('.tiptap').innerText()
      const expectedText = newContent.trim().replace(/\s+/g, ' ')
      const cleanedActualText = actualText.trim().replace(/\s+/g, ' ')

      expect(cleanedActualText).toContain(expectedText)
      await attachScreenshot('TESTS-399-check_content.png', page)
    })
  })

  test('TESTS-272. @PDF Generate a PDF from an Effective doc', async ({ page, browser }) => {
    await allure.description(
      'Requirement\nUsers need to make a resolve all comments and done documents for the Effective status'
    )
    await allure.tms('TESTS-272', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-272')

    const userSecondPage = await getSecondPage(browser)
    const completeDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Complete document-${generateId()}`,
      description: `Complete document description-${generateId()}`
    }
    const reviewer = 'Dirak Kainin'
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    const newContent = faker.lorem.paragraphs(10)

    await prepareDocumentStep(page, completeDocument)
    const documentContentPage = new DocumentContentPage(page)
    await documentContentPage.addContent(newContent)

    await test.step('2. Send for Approval', async () => {
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([reviewer])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_APPROVAL,
        version: 'v0.1'
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
    })

    await test.step('3. Approve document', async () => {
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()
      await documentsPageSecond.openDocument(completeDocument.title)

      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.confirmApproval()

      await documentContentPageSecond.checkDocumentStatus(DocumentStatus.EFFECTIVE)
      await documentContentPageSecond.checkDocument({
        ...documentDetails,
        status: DocumentStatus.EFFECTIVE,
        version: 'v0.1'
      })
      await documentContentPageSecond.checkCurrentRights(DocumentRights.VIEWING)

      await attachScreenshot('TESTS-272_approve_document.png', page)
    })
  })
})
