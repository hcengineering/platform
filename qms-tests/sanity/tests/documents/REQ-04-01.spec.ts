import { test } from '@playwright/test'
import { attachScreenshot, generateId, HomepageURI, PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { prepareDocumentStep } from './common-documents-steps'
import { DocumentApprovalsPage } from '../model/documents/document-approvals-page'
import { PdfPages } from '../model/documents/pdf-pages'

test.use({
  storageState: PlatformSetting
})

test.describe('QMS. PDF Download', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test.afterEach(async ({ browser }) => {
    const contexts = browser.contexts()
    for (const context of contexts) {
      await context.close()
    }
  })

  test('TESTS-271. Download PDF', async ({ page }) => {
    await allure.description('Requirement\nUsers need to approve the document')
    await allure.tms('TESTS-271', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-271')
    const approveDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Approve document-${generateId()}`,
      description: `Approve document description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }

    await prepareDocumentStep(page, approveDocument)
    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Send for Approval', async () => {
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([documentDetails.owner])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_APPROVAL
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
    })

    await test.step('3. Approve document', async () => {
      await documentContentPage.confirmApproval()
    })

    await test.step('4. Check the document and status', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.EFFECTIVE)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.EFFECTIVE,
        version: 'v0.1'
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)

      await documentContentPage.openApprovals()
      const documentApprovalsPage = new DocumentApprovalsPage(page)
      await documentApprovalsPage.checkSuccessApproval(documentDetails.owner)
      await attachScreenshot('TESTS-271_approve_document.png', page)
    })
    await test.step('5. Download PDF', async () => {
      await documentContentPage.clickDocumentThreeDots()
      const pdfPages = new PdfPages(page)
      await pdfPages.printToPdfClick()
      await pdfPages.downloadAndVerifyPdf()
    })
    await attachScreenshot('TESTS-271_ddownloaded_document.png', page)
  })
})
