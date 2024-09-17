import { Page, test } from '@playwright/test'
import { attachScreenshot, generateId, HomepageURI, PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { prepareDocumentStep } from './common-documents-steps'
import { DocumentApprovalsPage } from '../model/documents/document-approvals-page'
import { PdfPages } from '../model/documents/pdf-pages'
import { VisualCheck } from '../model/visual-check'

test.use({
  storageState: PlatformSetting
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

  test.skip('TESTS-272. Check PDF Preview', async ({ page }) => {
    await allure.description('Requirement\nUsers need to approve the document and check PDF preview')
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
      await page.waitForTimeout(5000)
      await pdfPages.showFullScreenPdfClick()
    })

    await test.step('6. Check PDF Preview', async () => {
      const visualCheck = new VisualCheck(page)
      await visualCheck.comparePDFPreview('TESTS-271_pdf_preview')
    })

    await attachScreenshot('TESTS-271_downloaded_document.png', page)
  })

  test.skip('TESTS-273. Check PDF Preview', async ({ page, browser }) => {
    await allure.description('Requirement\nUsers need to approve the document and check PDF preview');
    await allure.tms('TESTS-271', 'https://tracex.hc.engineering/workbench/platform/tracker/TESTS-271');
    
    const approveDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Approve document-${generateId()}`,
      description: `Approve document description-${generateId()}`
    };
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    };

    await prepareDocumentStep(page, approveDocument);
    const documentContentPage = new DocumentContentPage(page);
    
    await test.step('2. Send for Approval', async () => {
      await documentContentPage.buttonSendForApproval.click();
      await documentContentPage.fillSelectApproversForm([documentDetails.owner]);
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL);
      await documentContentPage.checkDocument({ ...documentDetails, status: DocumentStatus.IN_APPROVAL });
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING);
    });

    await test.step('3. Approve document', async () => {
      await documentContentPage.confirmApproval();
    });

    await test.step('4. Check the document and status', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.EFFECTIVE);
      await documentContentPage.checkDocument({ ...documentDetails, status: DocumentStatus.EFFECTIVE, version: 'v0.1' });
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING);

      await documentContentPage.openApprovals();
      const documentApprovalsPage = new DocumentApprovalsPage(page);
      await documentApprovalsPage.checkSuccessApproval(documentDetails.owner);
      await attachScreenshot('TESTS-271_approve_document.png', page);
    });

    await test.step('5. Download PDF', async () => {
      await documentContentPage.clickDocumentThreeDots();
      const pdfPages = new PdfPages(page);
      await pdfPages.printToPdfClick();
      
      // Wait for the iframe and log its presence
      const iframe = await page.waitForSelector('iframe[src*="PDF%20print%20preview"]', { timeout: 30000 })
        .catch(() => null);
      
      if (!iframe) {
        console.error('iframe not found');
        await attachScreenshot('TESTS-273_iframe_not_found.png', page);
        throw new Error('iframe not found');
      }

      console.log('iframe found');

      // Extract the URL from the iframe
      const iframeURL = await iframe.getAttribute('src');
      console.log('iframe URL:', iframeURL);

      if (iframeURL) {
        const newTab: Page = await browser.newPage();

        try {
          // Navigate to the URL with a longer timeout
          await newTab.goto(iframeURL, { timeout: 60000, waitUntil: 'domcontentloaded' });
          console.log('Navigation to iframe URL successful');

          await newTab.waitForTimeout(10000);

          // Use the new tab for the visual check
          const visualCheck = new VisualCheck(newTab);
          await visualCheck.compareScreenshot(null, 'TESTS-273_pdf_preview');
          
          await newTab.waitForTimeout(10000);
          
          // Close the new tab
          await newTab.close();
        } catch (error) {
          console.error('Error navigating to iframe URL:', error);
          await attachScreenshot('TESTS-273_navigation_error.png', newTab);
          await newTab.close();
          throw error;
        }
      } else {
        console.error('URL not found in iframe');
        throw new Error('URL not found in iframe');
      }
    });

    await attachScreenshot('TESTS-273_final_state.png', page);
  });
})
