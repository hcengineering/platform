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
import { Content, DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { DocumentCommentsPage } from '../model/documents/document-comments-page'
import { prepareDocumentStep } from './common-documents-steps'
import { DocumentsPage } from '../model/documents/documents-page'
import { allure } from 'allure-playwright'
import { DocumentHistoryPage } from '../model/documents/document-history-page'

test.use({
  storageState: PlatformSetting
})

test.describe('QMS. Documents flow tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test('TESTS-139. Make Review', async ({ page }) => {
    await allure.description('Requirement\nUsers need to make a review for the document')
    await allure.tms('TESTS-139', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-139')
    const makeReviewDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Make Review document-${generateId()}`,
      description: `Make Review document description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    const newContentFirst: Content = {
      sectionTitle: `Make Review. Overview-${generateId()}`,
      content: `Make Review. New content-${generateId()}!!!!`
    }
    const updateContentFirst: Content = {
      sectionTitle: `Make Review Updated. Updated Overview-${generateId()}`,
      content: `Make Review Updated. Updated content-${generateId()}!!!!`
    }
    const newContentSecond: Content = {
      sectionTitle: `Make Review. Description-${generateId()}`,
      content: `Make Review. New content Description-${generateId()}!!!!`
    }
    const messageToTitle: string = `Make Review. Message to the first title-${generateId()}`
    const messageToSecondTitle: string = `Make Review. Message to the second title-${generateId()}`
    const messageToContent: string = `Make Review. Message to the content-${generateId()}`

    await prepareDocumentStep(page, makeReviewDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add section and content', async () => {
      await documentContentPage.checkDocumentTitle(makeReviewDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.updateSectionTitle('1', newContentFirst.sectionTitle)
      await documentContentPage.addContentToTheSection(newContentFirst)

      await documentContentPage.addNewSection('1', 'below')
      await documentContentPage.updateSectionTitle('2', newContentSecond.sectionTitle)
      await documentContentPage.addContentToTheSection(newContentSecond)
      await documentContentPage.checkContentForTheSection(newContentSecond)
      await attachScreenshot('TESTS-139_add_section_and_content.png', page)
    })

    await test.step('3. Send for Review', async () => {
      await documentContentPage.buttonSendForReview.click()
      await documentContentPage.fillSelectReviewersForm([documentDetails.owner])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_REVIEW)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_REVIEW
      })
      await attachScreenshot('TESTS-139_send_for_review.png', page)
    })

    await test.step('4. Add comments and Complete Review', async () => {
      await documentContentPage.addMessageToTheSectionTitle(newContentFirst.sectionTitle, messageToTitle)
      await documentContentPage.addMessageToTheText(newContentFirst.content, messageToContent)
      await documentContentPage.addMessageToTheSectionTitle(newContentSecond.sectionTitle, messageToSecondTitle)

      await documentContentPage.buttonComments.click()

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(newContentFirst.sectionTitle, 2)
      await documentCommentsPage.checkCommentExist(newContentSecond.sectionTitle, 1)

      await documentContentPage.completeReview()

      await documentContentPage.checkDocumentStatus(DocumentStatus.REVIEWED)
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
      await attachScreenshot('TESTS-139_add_comments.png', page)
    })

    await test.step('5. Update Document and fix reviews', async () => {
      await documentContentPage.buttonEditDocument.click()

      await documentContentPage.updateSectionTitle('1', updateContentFirst.sectionTitle)
      await documentContentPage.addContentToTheSection(updateContentFirst)
      await documentContentPage.checkContentForTheSection(updateContentFirst)

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(updateContentFirst.sectionTitle, 2)
      await documentCommentsPage.checkCommentExist(newContentSecond.sectionTitle, 1)
      await documentCommentsPage.resolveAllComments()

      await documentCommentsPage.checkCommentNotExist(updateContentFirst.sectionTitle)
      await documentCommentsPage.checkCommentNotExist(newContentSecond.sectionTitle)
      await attachScreenshot('TESTS-136_fix_reviews.png', page)
    })

    await test.step('6. Check document status and details', async () => {
      await documentContentPage.buttonDocumentInformation.click()
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.DRAFT,
        version: 'v0.1'
      })
      await attachScreenshot('TESTS-139_check_document.png', page)
    })
  })

  test('TESTS-141. Send for approval document after resolve comments', async ({ page, browser }) => {
    await allure.description(
      'Requirement\nUsers need to make a resolve all comments and done documents for the Effective status'
    )
    await allure.tms('TESTS-141', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-141')
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
    const newContentFirst: Content = {
      sectionTitle: `Complete document. Overview-${generateId()}`,
      content: `Complete document. New content-${generateId()}!!!!`
    }
    const updateContentFirst: Content = {
      sectionTitle: `Complete document Updated. Updated Overview-${generateId()}`,
      content: `Complete document Updated. Updated content-${generateId()}!!!!`
    }
    const newContentSecond: Content = {
      sectionTitle: `Complete document. Description-${generateId()}`,
      content: `Complete document. New content Description-${generateId()}!!!!`
    }
    const messageToTitle: string = `Complete document. Message to the first title-${generateId()}`
    const messageToContent: string = `Complete document. Message to the content-${generateId()}`

    await prepareDocumentStep(page, completeDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add section and content', async () => {
      await documentContentPage.checkDocumentTitle(completeDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.updateSectionTitle('1', newContentFirst.sectionTitle)
      await documentContentPage.addContentToTheSection(newContentFirst)

      await documentContentPage.addNewSection('1', 'below')
      await documentContentPage.updateSectionTitle('2', newContentSecond.sectionTitle)
      await documentContentPage.addContentToTheSection(newContentSecond)
      await attachScreenshot('TESTS-141_add_section_and_content.png', page)
    })

    await test.step('3. Send for Review', async () => {
      await documentContentPage.buttonSendForReview.click()
      await documentContentPage.fillSelectReviewersForm([reviewer])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_REVIEW)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_REVIEW
      })
      await attachScreenshot('TESTS-141_send_for_review.png', page)
    })

    await test.step('4. As author add comments to the first section', async () => {
      await documentContentPage.addMessageToTheSectionTitle(newContentFirst.sectionTitle, messageToTitle)
      await documentContentPage.addMessageToTheText(newContentFirst.content, messageToContent)

      await documentContentPage.buttonComments.click()

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(newContentFirst.sectionTitle, 2)
      await documentCommentsPage.checkCommentCanBeResolved(newContentFirst.sectionTitle, 1)
      await documentCommentsPage.checkCommentCanBeResolved(newContentFirst.sectionTitle, 2)
      await attachScreenshot('TESTS-141_author_add_comments.png', page)
    })

    await test.step('5. As reviewer add comments to the second section and Complete Review', async () => {
      await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()

      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openDocument(completeDocument.title)

      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.addMessageToTheSectionTitle(newContentSecond.sectionTitle, messageToTitle)
      await documentContentPageSecond.addMessageToTheText(newContentSecond.content, messageToContent)

      await documentContentPageSecond.buttonComments.click()

      const documentCommentsPageSecond = new DocumentCommentsPage(userSecondPage)
      await documentCommentsPageSecond.checkCommentExist(newContentSecond.sectionTitle, 2)
      await documentCommentsPageSecond.checkCommentCanBeResolved(newContentSecond.sectionTitle, 3)
      await documentCommentsPageSecond.checkCommentCanBeResolved(newContentSecond.sectionTitle, 4)

      // // TODO uncomment after fix https://front.hc.engineering/workbench/platform/tracker/EZQMS-552
      // await documentCommentsPageSecond.checkCommentCanNotBeResolved(newContentFirst.sectionTitle, 1)
      // await documentCommentsPageSecond.checkCommentCanNotBeResolved(newContentFirst.sectionTitle, 2)

      await documentContentPageSecond.completeReview()

      await documentContentPageSecond.checkDocumentStatus(DocumentStatus.REVIEWED)
      await documentContentPageSecond.checkCurrentRights(DocumentRights.VIEWING)
      await attachScreenshot('TESTS-141_reviewer_add_comments.png', page)
    })

    await test.step('6. Update Document and fix reviews', async () => {
      await documentContentPage.buttonEditDocument.click()

      await documentContentPage.updateSectionTitle('1', updateContentFirst.sectionTitle)
      await documentContentPage.addContentToTheSection(updateContentFirst)
      await documentContentPage.checkContentForTheSection(updateContentFirst)

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(updateContentFirst.sectionTitle, 2)
      await documentCommentsPage.resolveAllComments()

      await documentCommentsPage.checkCommentNotExist(updateContentFirst.sectionTitle)
      await attachScreenshot('TESTS-141_fix_reviews.png', page)

      await documentContentPage.buttonDocumentInformation.click()
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.DRAFT,
        version: 'v0.1'
      })
      await attachScreenshot('TESTS-141_check_document.png', page)
    })

    await test.step('7. Send for Approval', async () => {
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

    await test.step('8. Approve document', async () => {
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openDocument(completeDocument.title)

      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.confirmApproval()

      await documentContentPageSecond.buttonDocumentInformation.click()
      await documentContentPageSecond.checkDocumentStatus(DocumentStatus.EFFECTIVE)
      await documentContentPageSecond.checkDocument({
        ...documentDetails,
        status: DocumentStatus.EFFECTIVE,
        version: 'v0.1'
      })
      await documentContentPageSecond.checkCurrentRights(DocumentRights.VIEWING)

      await attachScreenshot('TESTS-141_approve_document.png', page)
    })

    await test.step('9. Check document', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.EFFECTIVE)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.EFFECTIVE,
        version: 'v0.1'
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)

      await attachScreenshot('TESTS-141_check_document.png', page)
    })

    await test.step('10. Check History tab', async () => {
      await documentContentPage.buttonHistoryTab.click()

      const documentHistoryPage = new DocumentHistoryPage(page)
      await documentHistoryPage.checkHistoryEventExist('New document creation')
      await attachScreenshot('TESTS-141_check_history_tab.png', page)
    })
  })
})
