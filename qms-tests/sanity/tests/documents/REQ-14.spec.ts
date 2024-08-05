import { test } from '@playwright/test'
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
import { DocumentHistoryPage } from '../model/documents/document-history-page'

test.use({
  storageState: PlatformSetting
})

test.describe('QMS. Documents tests for Control of documents ISO 13485, 4.2.4 FS-150', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test.afterEach(async ({ browser }) => {
    const contexts = browser.contexts()
    for (const context of contexts) {
      await context.close()
    }
  })

  test('TESTS-384. Create a new doc version and previous one then marked to “Obsolete”', async ({ page, browser }) => {
    await allure.description('Requirement\nUsers need to create a new document and new version document')
    await allure.tms('TESTS-384', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-384')
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
    await prepareDocumentStep(page, completeDocument)

    const documentContentPage = new DocumentContentPage(page)

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

      await attachScreenshot('TEST-384_approve_document.png', page)
    })

    await test.step('4. Check document', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.EFFECTIVE)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.EFFECTIVE,
        version: 'v0.1'
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)

      await attachScreenshot('TESTS-384_check_document.png', page)
    })
    await test.step('5. Check History tab', async () => {
      await documentContentPage.buttonHistoryTab.first().click()
      const documentHistoryPage = new DocumentHistoryPage(page)
      await documentHistoryPage.checkHistoryEventExist('New document creation')
      await attachScreenshot('TESTS-384_check_history_tab.png', page)
    })
    await test.step('6. Send for Approval v0.2', async () => {
      await documentContentPage.sendForApproval(
        'Minor',
        'v0.2',
        'Reason 0.2',
        'impact 0.2',
        'v0.1',
        'v0.2',
        userSecondPage,
        completeDocument,
        documentDetails
      )
    })
    await test.step('7. Check archived status', async () => {
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPage.clickPreviousVersionHeader(userSecondPage, completeDocument, 'v0.2')
      await documentContentPage.clickPreviousVersionHeader(userSecondPage, completeDocument, 'v0.1')
      await documentContentPageSecond.checkDocument({
        ...documentDetails,
        status: DocumentStatus.ARCHIVED,
        version: 'v0.1'
      })
      await attachScreenshot('TESTS-384_archived_status.png', page)
    })
  })
})
