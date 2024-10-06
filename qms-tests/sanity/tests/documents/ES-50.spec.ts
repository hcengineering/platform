import { devices, test } from '@playwright/test'
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
import { DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { prepareDocumentStep } from './common-documents-steps'
import { DocumentApprovalsPage } from '../model/documents/document-approvals-page'
import { PdfPages } from '../model/documents/pdf-pages'
import { VisualCheck } from '../model/visual-check'
import { DocumentsPage } from '../model/documents/documents-page'

test.use({
  storageState: PlatformSetting,
  ...devices['Desktop Edge'],
  channel: 'msedge'
})

test.describe('QMS. PDF Download and Preview', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test.afterEach(async ({ browser }) => {
    const contexts = browser.contexts()
    for (const context of contexts) {
      await context.close()
    }
  })

  test('TESTS-386 - @PDF Author can Generate PDF from a doc with all Reviewers and Approvers signature info displayed', async ({
    page,
    browser
  }) => {
    await allure.description('Requirement\nUsers need to review the document and review status is displayed in PDF')
    await allure.tms('TESTS-386', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-386')
    const userSecondPage = await getSecondPage(browser)
    const approveDocument: NewDocument = {
      template: 'HR (HR)',
      title: 'This is a test document QMS TESTS-386',
      description: 'This is a test document description'
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
      await documentContentPage.addReviewersFromTeam(true)
      await documentContentPage.sendForReview()
      await documentContentPage.completeReview()
    })
    await test.step('3. Send for Approval', async () => {
      await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openDocument(approveDocument.title)
      await documentContentPageSecond.completeReview()
      await documentsPageSecond.openDocument(approveDocument.title)

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
      await attachScreenshot('TESTS-386_approve_document.png', page)
    })
    const documentsPageSecond = new DocumentsPage(userSecondPage)
    await documentsPageSecond.openDocument(approveDocument.title)

    await test.step('6. Show Full screen preview', async () => {
      const pdfPagesSecondPage = new PdfPages(userSecondPage)
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.clickDocumentThreeDots()
      await pdfPagesSecondPage.printToPdfClick()
      await userSecondPage.waitForTimeout(2000)
      await pdfPagesSecondPage.showFullScreenPdfClick()
      await userSecondPage.waitForTimeout(2000)
    })

    await test.step('7. Check PDF Preview', async () => {
      const visualCheckSecondPage = new VisualCheck(userSecondPage)
      await visualCheckSecondPage.comparePDFPreview('TESTS-386_pdf_preview')
    })

    await attachScreenshot('TESTS-386.png', page)
  })

  test('TESTS-387 - @PDF Author can Generate PDF from a doc with all Reviewers and Approvers signature info displayed', async ({
    page,
    browser
  }) => {
    await allure.description('Requirement\nUsers need to review the document and review status is displayed in PDF')
    await allure.tms('TESTS-387', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-387')
    const userSecondPage = await getSecondPage(browser)
    const approveDocument: NewDocument = {
      template: 'HR (HR)',
      title: 'This is a test for a QMS TESTS-387',
      description: 'This is a test document description'
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
      await documentContentPage.addReviewersFromTeam(false)
      await documentContentPage.addApproversFromTeam()
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([documentDetails.owner])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_APPROVAL
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
      await documentContentPage.confirmApproval()
    })
    await test.step('4. Send for Approval', async () => {
      await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openDocument(approveDocument.title)
      await documentContentPageSecond.clickApproveButtonAndFillPassword()
      //   await documentContentPageSecond.completeReview()
      await documentsPageSecond.openDocument(approveDocument.title)
    })
    await test.step('7. Show Full screen preview', async () => {
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      const pdfPagesSecondPage = new PdfPages(userSecondPage)
      await documentsPageSecond.openDocument(approveDocument.title)
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.clickDocumentThreeDots()
      await pdfPagesSecondPage.printToPdfClick()
      await userSecondPage.waitForTimeout(2000)
      await pdfPagesSecondPage.showFullScreenPdfClick()
      await userSecondPage.waitForTimeout(2000)
    })

    await test.step('8. Check PDF Preview', async () => {
      const visualCheckSecondPage = new VisualCheck(userSecondPage)
      await visualCheckSecondPage.comparePDFPreview('TESTS-387_pdf_preview')
    })
    await attachScreenshot('TESTS-387.png', page)
  })

  test('TESTS-393 - Doc Author, Reviewers, Approvers Electronic signature once doc is Effective', async ({
    page,
    browser
  }) => {
    await allure.description('Requirement\nUsers need to review the document and review status is displayed in PDF')
    await allure.tms('TESTS-393', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-393')
    const userSecondPage = await getSecondPage(browser)
    const approveDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Complete document-${generateId()}`,
      description: `Complete document description-${generateId()}`
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
      await documentContentPage.addReviewersFromTeam(false)
      await documentContentPage.addApproversFromTeam()
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([documentDetails.owner])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_APPROVAL
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
      await documentContentPage.confirmApproval()
    })
    await test.step('4. Send for Approval', async () => {
      await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openDocument(approveDocument.title)
      await documentContentPageSecond.clickApproveButton()
      await documentsPageSecond.openDocument(approveDocument.title)
    })
    await test.step('5. check if reviewers and approvers are visible', async () => {
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.clickOpenTeam()
      await documentContentPageSecond.checkIfReviewersAndApproversAreVisible()
    })

    await attachScreenshot('TESTS-393.png', page)
  })

  test('TESTS-394 - Doc Author, Reviewers, Approvers Electronic signature once doc is Effective', async ({
    page,
    browser
  }) => {
    await allure.description('Requirement\nUsers need to review the document and review status is displayed in PDF')
    await allure.tms('TESTS-394', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-394')
    const userSecondPage = await getSecondPage(browser)
    const approveDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Complete document-${generateId()}`,
      description: `Complete document description-${generateId()}`
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
      await documentContentPage.addReviewersFromTeam(false)
      await documentContentPage.addApproversFromTeam()
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([documentDetails.owner])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
      await documentContentPage.confirmApproval()
    })
    await test.step('4. Send for Approval', async () => {
      await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openDocument(approveDocument.title)
      await documentContentPageSecond.clickApproveButton()
      await documentsPageSecond.openDocument(approveDocument.title)
    })
    await test.step('5. check if reviewers and approvers are visible', async () => {
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.clickOpenTeam()
      await documentContentPageSecond.checkTheUserCantChangeReviewersAndApprovers()
    })

    await attachScreenshot('TESTS-394.png', page)
  })
})
