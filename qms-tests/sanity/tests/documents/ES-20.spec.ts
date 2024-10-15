import { devices, test } from '@playwright/test'
import { attachScreenshot, HomepageURI, PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { prepareDocumentStep } from './common-documents-steps'
import { DocumentApprovalsPage } from '../model/documents/document-approvals-page'
import { PdfPages } from '../model/documents/pdf-pages'
import { VisualCheck } from '../model/visual-check'
import { waitForNetworIdle } from '../utils'

test.use({
  storageState: PlatformSetting,
  ...devices['Desktop Edge'],
  channel: 'msedge'
})

test.describe('@PDF. QMS. PDF Download and Preview', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test.afterEach(async ({ browser }) => {
    const contexts = browser.contexts()
    for (const context of contexts) {
      await context.close()
    }
  })

  test('TESTS-277 - @PDF Author can Generate PDF from a doc with all Reviewers and Approvers signature info displayed', async ({
    page
  }) => {
    await allure.description('Requirement\nUsers need to review the document and review status is displayed in PDF')
    await allure.tms('TESTS-277', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-277')
    const approveDocument: NewDocument = {
      template: 'HR (HR)',
      title: 'Approve document-Test',
      description: 'Approve document description-Test'
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
    await test.step('2. Add reviewers from team', async () => {
      await documentContentPage.addReviewersFromTeam()
      await documentContentPage.sendForReview()
      await documentContentPage.completeReview()
    })
    await test.step('3. Send for Approval', async () => {
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([documentDetails.owner])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_APPROVAL
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
    })

    await test.step('4. Approve document', async () => {
      await documentContentPage.confirmApproval()
    })

    await test.step('5. Check the document and status', async () => {
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
      await attachScreenshot('TESTS-277_approve_document.png', page)
    })
    await test.step('6. Show Full screen preview', async () => {
      await documentContentPage.clickDocumentThreeDots()
      const pdfPages = new PdfPages(page)
      await pdfPages.printToPdfClick()
      await waitForNetworIdle(page)
      await page.waitForTimeout(2000)
      await pdfPages.showFullScreenPdfClick()
      await page.waitForTimeout(2000)
    })

    await test.step('7. Check PDF Preview', async () => {
      const visualCheck = new VisualCheck(page)
      await visualCheck.comparePDFPreview('TESTS-277_pdf_preview')
    })

    await attachScreenshot('TESTS-277_pdf_preview.png', page)
  })
})
