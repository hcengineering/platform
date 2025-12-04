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

test.describe('ISO 13485, 4.2.4 Control of documents, ensure that the current revision status of and changes to documents are identified', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test.afterEach(async ({ browser }) => {
    const contexts = browser.contexts()
    for (const context of contexts) {
      await context.close()
    }
  })

  test('TESTS-325. Create a Several documents with Minor & Major versions', async ({ page, browser }) => {
    await allure.description(
      'Requirement\nUsers need to make a resolve all comments and done documents for the Effective status'
    )
    await allure.tms('TESTS-325', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-325')
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
      version: 'v1.0',
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
        version: 'v1.0'
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
        version: 'v1.0'
      })
      await documentContentPageSecond.checkCurrentRights(DocumentRights.VIEWING)

      await attachScreenshot('TESTS-325_approve_document.png', page)
    })

    await test.step('4. Check document', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.EFFECTIVE)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.EFFECTIVE,
        version: 'v1.0'
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)

      await attachScreenshot('TESTS-325_check_document.png', page)
    })
    await test.step('5. Check History tab', async () => {
      await documentContentPage.buttonHistoryTab.first().click()
      const documentHistoryPage = new DocumentHistoryPage(page)
      await documentHistoryPage.checkHistoryEventExist('New document creation')
      await attachScreenshot('TESTS-325_check_history_tab.png', page)
    })
    await test.step('6. Send for Approval v1.1', async () => {
      await documentContentPage.sendForApproval(
        'Minor',
        'v1.1',
        'Reason 1.1',
        'impact 1.1',
        'v1.0',
        'v1.1',
        userSecondPage,
        completeDocument,
        documentDetails
      )
    })

    await test.step('7. Send for Approval minor v1.2', async () => {
      await documentContentPage.sendForApproval(
        'Minor',
        'v1.2',
        'Reason 1.2',
        'impact 1.2',
        'v1.1',
        'v1.2',
        userSecondPage,
        completeDocument,
        documentDetails
      )
    })

    await test.step('8. Send for Approval major v2.0', async () => {
      await documentContentPage.sendForApproval(
        'Major',
        'v2.0',
        'Reason 2.0',
        'impact 2.0',
        'v1.2',
        'v2.0',
        userSecondPage,
        completeDocument,
        documentDetails
      )
    })

    await test.step('9. Send for Approval major v3.0', async () => {
      await documentContentPage.sendForApproval(
        'Major',
        'v3.0',
        'Reason 3.0',
        'impact 3.0',
        'v2.0',
        'v3.0',
        userSecondPage,
        completeDocument,
        documentDetails
      )
    })

    await test.step('10. Send for Approval minor v3.1', async () => {
      await documentContentPage.sendForApproval(
        'Minor',
        'v3.1',
        'Reason 3.1',
        'impact 3.1',
        'v3.0',
        'v3.1',
        userSecondPage,
        completeDocument,
        documentDetails
      )
    })

    await test.step('11. Send for Approval minor v3.2', async () => {
      await documentContentPage.sendForApproval(
        'Minor',
        'v3.2',
        'Reason 3.2',
        'impact 3.2',
        'v3.1',
        'v3.2',
        userSecondPage,
        completeDocument,
        documentDetails
      )
    })

    await test.step('12. Send for Approval minor v3.3', async () => {
      await documentContentPage.sendForApproval(
        'Minor',
        'v3.3',
        'Reason 3.3',
        'impact 3.3',
        'v3.2',
        'v3.3',
        userSecondPage,
        completeDocument,
        documentDetails
      )
    })
  })
})
