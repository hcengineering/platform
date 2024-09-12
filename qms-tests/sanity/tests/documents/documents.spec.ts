import { expect, test } from '@playwright/test'
import {
  attachScreenshot,
  DocumentURI,
  generateId,
  getQaraManagerPage,
  getSecondPage,
  HomepageURI,
  PlatformSetting,
  PlatformURI
} from '../utils'
import { allure } from 'allure-playwright'
import { DocumentsPage } from '../model/documents/documents-page'
import { DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { DocumentCommentsPage } from '../model/documents/document-comments-page'
import { prepareDocumentStep } from './common-documents-steps'
import { DocumentApprovalsPage } from '../model/documents/document-approvals-page'
import { DocumentReleasePage } from '../model/documents/document-release-page'
import { DocumentReasonAndImpactPage } from '../model/documents/document-reason-impact-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { DocumentHistoryPage } from '../model/documents/document-history-page'
import { faker } from '@faker-js/faker'

test.use({
  storageState: PlatformSetting
})

test.describe('QMS. Documents tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
  })

  test.afterEach(async ({ browser }) => {
    const contexts = browser.contexts()
    for (const context of contexts) {
      await context.close()
    }
  })

  test('TESTS-123. Create a document', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create a new document')
    await allure.tms('TESTS-123', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-123')
    const newDocument: NewDocument = {
      template: 'HR (HR)',
      title: `New Document-${generateId()}`,
      description: `New Document description-${generateId()}`
    }
    await prepareDocumentStep(page, newDocument)

    await test.step('2. Check document information', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.checkDocumentTitle(newDocument.title)
    })

    await attachScreenshot('TESTS-123_create_document.png', page)
  })

  test('TESTS-124. Edit document', async ({ page }) => {
    await allure.description('Requirement\nUsers need to edit the created document')
    await allure.tms('TESTS-124', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-124')
    const editDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Edit Document-${generateId()}`,
      description: `Edit Document description-${generateId()}`
    }
    const newContent = `New content-${generateId()}!!!!`
    await prepareDocumentStep(page, editDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Update the created document content', async () => {
      await documentContentPage.checkDocumentTitle(editDocument.title)
      await documentContentPage.addContent(newContent)
    })

    await test.step('3. Check the updated document information', async () => {
      await documentContentPage.checkContent(newContent)
    })

    await attachScreenshot('TESTS-124_edit_document.png', page)
  })

  test('TESTS-127. Delete Document', async ({ page }) => {
    await allure.description('Requirement\nUsers need to delete the document')
    await allure.tms('TESTS-127', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-127')
    const deleteDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Delete Document-${generateId()}`,
      description: `Delete Document description-${generateId()}`
    }
    await prepareDocumentStep(page, deleteDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Delete the document', async () => {
      await documentContentPage.checkDocumentTitle(deleteDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.executeMoreActions('Delete')
    })

    await test.step('3. Check that the document status is equal to deleted status', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.DELETED)
    })

    await attachScreenshot('TESTS-127_delete_document.png', page)
  })

  test('TESTS-125. Create child document', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create a new child document')
    await allure.tms('TESTS-125', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-125')
    const parentDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Parent Document-${generateId()}`,
      description: `Parent Document description-${generateId()}`
    }
    const childDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Child Document-${generateId()}`,
      description: `Child Document description-${generateId()}`
    }
    await prepareDocumentStep(page, parentDocument)

    await test.step('2. Create a new child document for the document from the previous step', async () => {
      const documentsPage = new DocumentsPage(page)
      await documentsPage.executeMoreActionsOnDocument(parentDocument.title, 'Create child document')
      await documentsPage.createDocument(childDocument, true)
    })

    await test.step('3. Check the child document information', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.checkDocumentTitle(childDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
    })

    await attachScreenshot('TESTS-125_create_child_document.png', page)
  })

  test('TESTS-126. Change document owner', async ({ page }) => {
    await allure.description('Requirement\nUsers need to change document owner')
    await allure.tms('TESTS-126', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-126')
    const changeDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Change document owner Document-${generateId()}`,
      description: `Change document owner Document description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    await prepareDocumentStep(page, changeDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Change document owner', async () => {
      await documentContentPage.checkDocumentTitle(changeDocument.title)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.executeMoreActions('Change document owner')
      await documentContentPage.fillChangeDocumentOwnerPopup('Dirak Kainin')
    })

    await test.step('3. Check the updated document information', async () => {
      await documentContentPage.checkDocument({
        ...documentDetails,
        owner: 'Dirak Kainin'
      })
    })
    await attachScreenshot('TESTS-126_change_document_owner.png', page)
  })

  test('TESTS-134. Send for review document', async ({ page }) => {
    await allure.description('Requirement\nUsers need to send the document for review')
    await allure.tms('TESTS-134', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-134')
    const sendForReviewDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Send for review document-${generateId()}`,
      description: `Send for review document description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    await prepareDocumentStep(page, sendForReviewDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Send the document for review', async () => {
      await documentContentPage.checkDocumentTitle(sendForReviewDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)
      await documentContentPage.buttonSendForReview.click()
      await documentContentPage.fillSelectReviewersForm(['Dirak Kainin'])
    })

    await test.step('3. Check the document status', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_REVIEW)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_REVIEW
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
    })
    await attachScreenshot('TESTS-134_send_for_review_document.png', page)
  })

  test('TESTS-135. Send for approval document', async ({ page }) => {
    await allure.description('Requirement\nUsers need to send the document for approval')
    await allure.tms('TESTS-135', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-135')
    const changeDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Send for approval document-${generateId()}`,
      description: `Send for approval document description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    await prepareDocumentStep(page, changeDocument)
    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Send the document for approval', async () => {
      await documentContentPage.checkDocumentTitle(changeDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm(['Dirak Kainin'])
    })

    await test.step('3. Check the document status', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_APPROVAL)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_APPROVAL
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
    })
    await attachScreenshot('TESTS-135_send_for_approval_document.png', page)
  })

  test('TESTS-136. Add and resolve Comments', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create new comments and resolve them')
    await allure.tms('TESTS-136', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-136')
    const commentsDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Add and Done Comments document-${generateId()}`,
      description: `Add and Done Comments document description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    const newContentFirst = `New content-${generateId()}!!!!`
    const messageToContent: string = `Message to the content-${generateId()}`

    await prepareDocumentStep(page, commentsDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add comments', async () => {
      await documentContentPage.checkDocumentTitle(commentsDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.addContent(newContentFirst)
    })

    await test.step('3. Send to Review', async () => {
      await documentContentPage.buttonSendForReview.click()
      await documentContentPage.fillSelectReviewersForm([documentDetails.owner])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_REVIEW)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_REVIEW
      })
    })

    await test.step('4. Add comments and Complete Review', async () => {
      await documentContentPage.addMessageToTheText(newContentFirst, messageToContent)

      await documentContentPage.buttonComments.click()

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(messageToContent)

      await attachScreenshot('TESTS-136_add_comments.png', page)

      await documentContentPage.completeReview()

      await documentContentPage.checkDocumentStatus(DocumentStatus.REVIEWED)
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
    })

    await test.step('5. Resolve the first comment', async () => {
      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.resolveComment(messageToContent)
      await documentCommentsPage.checkCommentDoesNotExist(messageToContent)

      await attachScreenshot('TESTS-136_add_and_done_comments.png', page)
    })

    await test.step('6. Check Edit document flow', async () => {
      await documentContentPage.buttonEditDocument.click()
      await documentContentPage.buttonDocumentInformation.click()

      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.DRAFT,
        version: 'v0.1'
      })
      await attachScreenshot('TESTS-136_check_edit_document_flow.png', page)
    })
  })

  test('TESTS-137. Approve document', async ({ page }) => {
    await allure.description('Requirement\nUsers need to approve the document')
    await allure.tms('TESTS-137', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-137')
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
      await attachScreenshot('TESTS-137_approve_document.png', page)
    })
  })

  test('TESTS-138. Reject document', async ({ page }) => {
    await allure.description('Requirement\nUsers need to reject the document')
    await allure.tms('TESTS-138', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-138')
    const rejectionReason = `Test rejection-${generateId()}`
    const rejectDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Reject document-${generateId()}`,
      description: `Reject document description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }

    await prepareDocumentStep(page, rejectDocument)
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

    await test.step('3. Reject document', async () => {
      await documentContentPage.confirmRejection(rejectionReason)
    })

    await test.step('4. Check the document and status', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.REJECTED)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.REJECTED
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
      await documentContentPage.openApprovals()
      const documentApprovalsPage = new DocumentApprovalsPage(page)
      await documentApprovalsPage.checkRejectApproval(documentDetails.owner, rejectionReason)
      await attachScreenshot('TESTS-138_reject_document.png', page)
    })
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
    const newContentFirst = `Make Review. New content-${generateId()}!!!!`
    const updateContentFirst = `Make Review Updated. Updated content-${generateId()}!!!!`
    const messageToContent: string = `Make Review. Message to the content-${generateId()}`

    await prepareDocumentStep(page, makeReviewDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add content', async () => {
      await documentContentPage.checkDocumentTitle(makeReviewDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.addContent(newContentFirst)
      await documentContentPage.checkContent(newContentFirst)
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
      await documentContentPage.addMessageToTheText(newContentFirst, messageToContent)

      await documentContentPage.buttonComments.click()

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(messageToContent)

      await documentContentPage.completeReview()

      await documentContentPage.checkDocumentStatus(DocumentStatus.REVIEWED)
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
      await attachScreenshot('TESTS-139_add_comments.png', page)
    })

    await test.step('5. Update Document and fix reviews', async () => {
      await documentContentPage.createNewDraft()

      await documentContentPage.replaceContent(updateContentFirst)
      await documentContentPage.checkContent(updateContentFirst)

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(messageToContent)
      await documentCommentsPage.resolveAllComments()

      await documentCommentsPage.checkCommentDoesNotExist(messageToContent)
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

  test('TESTS-140. Comparing several document versions', async ({ page }) => {
    await allure.description('Requirement\nUsers need to compare several document versions')
    await allure.tms('TESTS-140', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-140')
    const makeReviewDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Comparing document versions-${generateId()}`,
      description: `Comparing document versions description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    const newContentFirst = `Comparing versions. New content-${generateId()}!!!!`
    const updateContentFirst = `Comparing versions Updated. Updated content-${generateId()}!!!!`

    await prepareDocumentStep(page, makeReviewDocument)
    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add section and content', async () => {
      await documentContentPage.checkDocumentTitle(makeReviewDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.addContent(newContentFirst)
      await documentContentPage.checkContent(newContentFirst)
      await attachScreenshot('TESTS-140_add_section_and_content.png', page)
    })

    await test.step('3. Send for Review', async () => {
      await documentContentPage.buttonSendForReview.click()
      await documentContentPage.fillSelectReviewersForm([documentDetails.owner])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_REVIEW)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_REVIEW
      })
      await attachScreenshot('TESTS-140_send_for_review.png', page)
    })

    await test.step('4. Add comments and Complete Review', async () => {
      await documentContentPage.completeReview()
      await documentContentPage.checkDocumentStatus(DocumentStatus.REVIEWED)
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
      await attachScreenshot('TESTS-140_add_comments.png', page)
    })

    await test.step('5. Compare the versions with several documents', async () => {
      await documentContentPage.buttonEditDocument.click()
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.DRAFT,
        version: 'v0.1'
      })

      await documentContentPage.replaceContent(updateContentFirst)
      await documentContentPage.checkContent(updateContentFirst)

      await documentContentPage.changeCurrentRight(DocumentRights.COMPARING)
      await documentContentPage.checkComparingTextAdded('Updated')
      await documentContentPage.checkComparingTextDeleted('New')

      await attachScreenshot('TESTS-140_fix_reviews.png', page)
    })
  })

  test('TESTS-162. Approve document with delayed release', async ({ page }) => {
    await allure.description('Requirement\nUsers need to create document with delayed release')
    await allure.tms('TESTS-162', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-162')
    const approveDelayedDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Approve document with delayed release-${generateId()}`,
      description: `Approve document with delayed release description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }

    await prepareDocumentStep(page, approveDelayedDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Set delayed Release', async () => {
      await documentContentPage.buttonReleaseTab.click()

      const documentReleasePage = new DocumentReleasePage(page)
      await documentReleasePage.setEffectiveDate('in 15 minutes')
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

    await test.step('5. Check the updated document information', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.APPROVED)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.APPROVED
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)

      await documentContentPage.openApprovals()
      const documentApprovalsPage = new DocumentApprovalsPage(page)
      await documentApprovalsPage.checkSuccessApproval(documentDetails.owner)

      await attachScreenshot('TESTS-162_approve_document_delayed_release.png', page)
    })
  })

  test('TESTS-161. Check elements in the popup with the new Comment', async ({ page }) => {
    await allure.description('Requirement\nUsers need the popup with the new Comment to work correctly')
    await allure.tms('TESTS-161', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-161')
    const checkPopupDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Check comment popup elements document-${generateId()}`,
      description: `Check comment popup elements document description-${generateId()}`
    }
    const author = 'Appleseed John'
    const newContentFirst = `New content-${generateId()}!!!!`
    const messageToText: string = `Make Review. Message to the first title-${generateId()}`
    const replyCommentFirst = `Reply to first comment-${generateId(4)}`

    await prepareDocumentStep(page, checkPopupDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add section and content', async () => {
      await documentContentPage.checkDocumentTitle(checkPopupDocument.title)

      await documentContentPage.addContent(newContentFirst)
    })

    await test.step('3. Add comment and check popup', async () => {
      await documentContentPage.addMessageToTheText(newContentFirst, messageToText, false)

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.addReplyInPopupByCommentId(1, replyCommentFirst)
      await documentCommentsPage.checkCommentInPopupById(1, 'Pending', author, messageToText, replyCommentFirst)

      await attachScreenshot('TESTS-161_add_comment_and_check_popup.png', page)
      await documentContentPage.closeNewMessagePopup()
    })

    await test.step('4. Check the comment in the right panel', async () => {
      await documentContentPage.buttonComments.click()

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentInPanelById(1, 'Pending', author, messageToText, replyCommentFirst)
      await attachScreenshot('TESTS-161_add_comment_and_check_comment_in_the_right_panel.png', page)
    })
  })

  test('TESTS-155. Change document owner. QARA user changes owner from one user to another', async ({
    page,
    browser
  }) => {
    await allure.description('Requirement\nQARA manager needs to change the document owner')
    await allure.tms('TESTS-155', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-155')
    const qaraManagerPage = await getQaraManagerPage(browser)
    const newDocumentOwner = 'Dirak Kainin'
    const changeQaraDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Change document owner by QARA user Document-${generateId()}`,
      description: `Change document owner by QARA user Document description-${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    await prepareDocumentStep(page, changeQaraDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Move to effective status', async () => {
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([documentDetails.owner])

      await documentContentPage.confirmApproval()
      await documentContentPage.checkDocumentStatus(DocumentStatus.EFFECTIVE)
    })

    const documentContentPageQara = new DocumentContentPage(qaraManagerPage)
    await test.step('3. As QARA manager change the document owner', async () => {
      await (await qaraManagerPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()

      const documentsPageQara = new DocumentsPage(qaraManagerPage)
      await documentsPageQara.openDocument(changeQaraDocument.title)

      await documentContentPageQara.executeMoreActions('Change document owner')
      await documentContentPageQara.fillChangeDocumentOwnerPopupByQaraManager(newDocumentOwner)
    })

    await test.step('4. As QARA manager Check the updated document information', async () => {
      await documentContentPageQara.checkDocument({
        ...documentDetails,
        owner: newDocumentOwner,
        version: 'v0.1',
        status: DocumentStatus.EFFECTIVE
      })
      await attachScreenshot('TESTS-155_change_document_owner.png', page)
    })

    await test.step('5. As previous document owner check the document', async () => {
      await documentContentPage.checkDocument({
        ...documentDetails,
        owner: newDocumentOwner,
        version: 'v0.1',
        status: DocumentStatus.EFFECTIVE
      })
      await expect(documentContentPage.buttonDraftNewVersion).toBeVisible({ visible: false })
      await attachScreenshot('TESTS-155_previous_owner.png', page)
    })

    await test.step('6. As new document owner check the document', async () => {
      const secondPage = await getSecondPage(browser)
      await (await secondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()

      const documentsPageSecond = new DocumentsPage(secondPage)
      await documentsPageSecond.openDocument(changeQaraDocument.title)

      const documentContentPageSecond = new DocumentContentPage(secondPage)
      await expect(documentContentPageSecond.buttonDraftNewVersion).toBeVisible()
      await documentContentPageSecond.checkDocument({
        ...documentDetails,
        owner: newDocumentOwner,
        version: 'v0.1',
        status: DocumentStatus.EFFECTIVE
      })
      await attachScreenshot('TESTS-155_new_owner.png', page)
    })
  })

  test('TESTS-205. Test Reason & Impact sections', async ({ page, browser }) => {
    await allure.description('Requirement\nUsers need to add the Reason and Impact information')
    await allure.tms('TESTS-205', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-205')
    const reasonAndImpactDocument: NewDocument = {
      template: 'HR (HR)',
      title: `Test Reason and Impact section-${generateId()}`,
      description: `Test Reason and Impact section--${generateId()}`
    }
    const documentDetails: DocumentDetails = {
      type: 'HR',
      category: 'Human Resources',
      version: 'v0.1',
      status: DocumentStatus.DRAFT,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }
    await prepareDocumentStep(page, reasonAndImpactDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Update Reason and Impact sections', async () => {
      await documentContentPage.buttonReasonAndImpactTab.click()

      const documentReasonAndImpactPage = new DocumentReasonAndImpactPage(page)
      await documentReasonAndImpactPage.setReasonAndImpactData(
        'Test description',
        'Test reason',
        'Test analysis',
        'TMPL-18 HR'
      )

      await documentContentPage.buttonContentTab.click()
    })

    await test.step('3. Move to effective status', async () => {
      await documentContentPage.buttonSendForApproval.click()
      await documentContentPage.fillSelectApproversForm([documentDetails.owner])

      await documentContentPage.confirmApproval()
      await documentContentPage.checkDocumentStatus(DocumentStatus.EFFECTIVE)
    })

    await test.step('4. Check Reason and Impact sections', async () => {
      await documentContentPage.buttonReasonAndImpactTab.click()

      const documentReasonAndImpactPage = new DocumentReasonAndImpactPage(page)
      await documentReasonAndImpactPage.checkReasonAndImpactData(
        'Test description',
        'Test reason',
        'Test analysis',
        'TMPL-18 HR'
      )
    })
  })

  test('TESTS-206. Send for approval document after resolve comments', async ({ page, browser }) => {
    await allure.description(
      'Requirement\nUsers need to make a resolve all comments and done documents for the Effective status'
    )
    await allure.tms('TESTS-206', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-206')
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
    const newContentFirst = `Complete document. New content-${generateId()}!!!!`
    const updateContentFirst = `Complete document Updated. Updated content-${generateId()}!!!!`
    const newContentSecond = `Complete document. New content Description-${generateId()}!!!!`
    const messageToContent: string = `Complete document. Message to the content-${generateId()}`
    const messageToContentSecond: string = `Complete document. Message to the content-second-${generateId()}`

    await prepareDocumentStep(page, completeDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add section and content', async () => {
      await documentContentPage.checkDocumentTitle(completeDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.addContent(newContentFirst)
      await documentContentPage.addContent(newContentSecond, true, true)
      await attachScreenshot('TESTS-206_add_section_and_content.png', page)
    })

    await test.step('3. Send for Review', async () => {
      await documentContentPage.buttonSendForReview.click()
      await documentContentPage.fillSelectReviewersForm([reviewer])
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_REVIEW)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.IN_REVIEW
      })
      await attachScreenshot('TESTS-206_send_for_review.png', page)
    })

    await test.step('4. As author add a comment', async () => {
      await documentContentPage.addMessageToTheText(newContentFirst, messageToContent)

      await documentContentPage.buttonComments.click()

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(messageToContent)
      await documentCommentsPage.checkCommentCanBeResolved(messageToContent)
      await attachScreenshot('TESTS-206_author_add_comments.png', page)
    })

    await test.step('5. As a reviewer add a comment and Complete Review', async () => {
      await (await userSecondPage.goto(`${PlatformURI}/${DocumentURI}`))?.finished()

      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openDocument(completeDocument.title)

      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.addMessageToTheText(newContentSecond, messageToContentSecond)

      await documentContentPageSecond.buttonComments.click()

      const documentCommentsPageSecond = new DocumentCommentsPage(userSecondPage)
      await documentCommentsPageSecond.checkCommentExist(messageToContentSecond)
      await documentCommentsPageSecond.checkCommentCanBeResolved(messageToContentSecond)

      await documentContentPageSecond.completeReview()

      await documentContentPageSecond.checkDocumentStatus(DocumentStatus.REVIEWED)
      await documentContentPageSecond.checkCurrentRights(DocumentRights.VIEWING)
      await attachScreenshot('TESTS-206_reviewer_add_comments.png', page)
    })

    await test.step('6. Update Document and fix reviews', async () => {
      await documentContentPage.createNewDraft()

      await documentContentPage.replaceContent(updateContentFirst)

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(messageToContent)
      await documentCommentsPage.checkCommentExist(messageToContentSecond)
      await documentCommentsPage.resolveAllComments()

      await documentCommentsPage.checkCommentDoesNotExist(messageToContent)
      await documentCommentsPage.checkCommentDoesNotExist(messageToContentSecond)
      await attachScreenshot('TESTS-206_fix_reviews.png', page)

      await documentContentPage.buttonDocumentInformation.click()
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.DRAFT,
        version: 'v0.1'
      })
      await attachScreenshot('TESTS-206_check_document.png', page)
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

      await attachScreenshot('TESTS-206_approve_document.png', page)
    })

    await test.step('9. Check document', async () => {
      await documentContentPage.checkDocumentStatus(DocumentStatus.EFFECTIVE)
      await documentContentPage.checkDocument({
        ...documentDetails,
        status: DocumentStatus.EFFECTIVE,
        version: 'v0.1'
      })
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)

      await attachScreenshot('TESTS-206_check_document.png', page)
    })

    await test.step('10. Check History tab', async () => {
      await documentContentPage.buttonHistoryTab.first().click()

      const documentHistoryPage = new DocumentHistoryPage(page)
      await documentHistoryPage.checkHistoryEventExist('New document creation')
      await attachScreenshot('TESTS-206_check_history_tab.png', page)
    })
  })

  test('TESTS-352. Create a document', async ({ page }) => {
    const folderName = faker.word.words(1)
    const documentTitle = faker.word.words(2)
    await allure.description('Requirement\nUsers need to create a new document')
    await allure.tms('TESTS-352', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-352')

    const documentContentPage = new DocumentContentPage(page)
    await documentContentPage.clickAddFolderButton()
    await documentContentPage.fillDocumentSpaceForm(folderName)
    await documentContentPage.createNewDocumentInsideFolder(folderName)
    await documentContentPage.createNewDocumentFromFolder(documentTitle)

    await test.step('2. Check if document and folder exists', async () => {
      await documentContentPage.checkIfFolderExists(folderName)
      await documentContentPage.checkDocumentTitle(documentTitle)
    })

    await attachScreenshot('TESTS-352_create_document.png', page)
  })

  test('TESTS-380. As a space QARA, I can select "Custom" field in "Reason" for creating this Quality doc and it is stored in the History of Version 2 of this doc', async ({
    page
  }) => {
    const folderName = generateId(5)
    const documentTitle = generateId(5)
    const reason = generateId(5)
    await allure.description('Requirement\nUsers need to create a new document')
    await allure.tms('TESTS-380', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-380')

    const documentContentPage = new DocumentContentPage(page)
    await documentContentPage.clickAddFolderButton()
    await documentContentPage.fillDocumentSpaceForm(folderName)
    await documentContentPage.createNewDocumentInsideFolder(folderName)
    await documentContentPage.createNewDocumentFromFolder(documentTitle, true, reason)

    await test.step('2. Check if document and folder exists', async () => {
      await documentContentPage.checkIfFolderExists(folderName)
      await documentContentPage.checkDocumentTitle(documentTitle)
    })
    await documentContentPage.clickSendForApproval()
    await documentContentPage.fillSelectApproversForm(['Appleseed John'])
    await documentContentPage.confirmApproval()
    await documentContentPage.clickDraftNewVersion()
    await documentContentPage.clickHistoryTab()
    await test.step('3. Check if history version exists', async () => {
      await documentContentPage.checkIfHistoryVersionExists(reason)
    })
    await attachScreenshot('TESTS-380_create_document.png', page)
    await documentContentPage.clickLeaveFolder(folderName)
  })

  test('TESTS-214. Check old existing document content', async ({ page, browser }) => {
    await allure.description(
      'Requirement\nAs a user, I want to open my previously created document and see all its content'
    )
    await allure.tms('TESTS-214', 'https://front.hc.engineering/workbench/platform/tracker/TESTS-214')
    const existDocument: NewDocument = {
      template: 'HR (HR)',
      title: 'Existing document',
      description: 'Existing document description'
    }
    const documentDetails: DocumentDetails = {
      id: 'HR-1',
      type: 'HR',
      category: 'N/A',
      version: 'v0.0',
      status: DocumentStatus.IN_REVIEW,
      owner: 'Appleseed John',
      author: 'Appleseed John'
    }

    const overview = {
      heading: 'Overview',
      content:
        'In this section, we explore [Medical Topic], shedding light on its key aspects, causes, symptoms, and available treatments. Gain insights into the latest advancements in [Medical Field] and discover valuable information for a better understanding of managing and addressing [Medical Condition].'
    }

    const main = {
      heading: 'Main',
      content:
        '[Medical Topic] is a prevalent [medical condition/issue] affecting a significant number of individuals worldwide. This condition is characterized by [brief description of symptoms or key features]. It can arise due to [common causes or triggers], leading to [impact on health or daily life].'
    }

    await test.step('1. Open the document created sometime ago', async () => {
      const leftSideMenuPage = new LeftSideMenuPage(page)
      await leftSideMenuPage.buttonDocuments.click()

      const documentsPage = new DocumentsPage(page)
      await documentsPage.openDocument(existDocument.title)
    })

    await test.step('2. Check the document content', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.checkDocumentTitle(existDocument.title)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkDocumentStatus(DocumentStatus.IN_REVIEW)

      await expect(documentContentPage.contentLocator.locator('h1:first-child')).toHaveText(overview.heading)
      await expect(documentContentPage.contentLocator.locator('h1:first-child + p')).toHaveText(overview.content)

      await expect(documentContentPage.contentLocator.locator('h1:not(:first-child)')).toHaveText(main.heading)
      await expect(documentContentPage.contentLocator.locator('h1:not(:first-child) + p')).toHaveText(main.content)
    })
  })
})
