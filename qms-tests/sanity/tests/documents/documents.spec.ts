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
import { Content, DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { DocumentCommentsPage } from '../model/documents/document-comments-page'
import { prepareDocumentStep } from './common-documents-steps'
import { DocumentApprovalsPage } from '../model/documents/document-approvals-page'
import { DocumentReleasePage } from '../model/documents/document-release-page'
import { DocumentReasonAndImpactPage } from '../model/documents/document-reason-impact-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'

test.use({
  storageState: PlatformSetting
})

test.describe('QMS. Documents tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
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
    const newContent: Content = {
      sectionTitle: `Overview-${generateId()}`,
      content: `New content-${generateId()}!!!!`
    }
    await prepareDocumentStep(page, editDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Update the created document content', async () => {
      await documentContentPage.checkDocumentTitle(editDocument.title)
      await documentContentPage.updateSectionTitle('1', newContent.sectionTitle)
      await documentContentPage.addContentToTheSection(newContent)
    })

    await test.step('3. Check the updated document information', async () => {
      await documentContentPage.checkContentForTheSection(newContent)
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
      await documentContentPage.pressYesForPopup(page)
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
    const newContentFirst: Content = {
      sectionTitle: `Overview-${generateId()}`,
      content: `New content-${generateId()}!!!!`
    }
    const messageToTitle: string = `Message to the title-${generateId()}`
    const messageToContent: string = `Message to the content-${generateId()}`

    await prepareDocumentStep(page, commentsDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add comments', async () => {
      await documentContentPage.checkDocumentTitle(commentsDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.updateSectionTitle('1', newContentFirst.sectionTitle)
      await documentContentPage.addContentToTheSection(newContentFirst)
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
      await documentContentPage.addMessageToTheSectionTitle(newContentFirst.sectionTitle, messageToTitle)
      await documentContentPage.addMessageToTheText(newContentFirst.content, messageToContent)

      await documentContentPage.buttonComments.click()

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentExist(newContentFirst.sectionTitle, 2)

      await attachScreenshot('TESTS-136_add_comments.png', page)

      await documentContentPage.completeReview()

      await documentContentPage.checkDocumentStatus(DocumentStatus.REVIEWED)
      await documentContentPage.checkCurrentRights(DocumentRights.VIEWING)
    })

    await test.step('5. Resolve the first comment', async () => {
      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.resolveComments(newContentFirst.sectionTitle, '1')

      await documentCommentsPage.checkCommentExist(newContentFirst.sectionTitle, 1)

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
    const newContentFirst: Content = {
      sectionTitle: `Overview-${generateId()}`,
      content: `New content-${generateId()}!!!!`
    }
    const messageToTitle: string = `Make Review. Message to the first title-${generateId()}`
    const replyCommentFirst = `Reply to first comment-${generateId(4)}`

    await prepareDocumentStep(page, checkPopupDocument)

    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add section and content', async () => {
      await documentContentPage.checkDocumentTitle(checkPopupDocument.title)
      await documentContentPage.updateSectionTitle('1', newContentFirst.sectionTitle)
      await documentContentPage.addContentToTheSection(newContentFirst)
    })

    await test.step('3. Add comment and check popup', async () => {
      await documentContentPage.addMessageToTheSectionTitle(newContentFirst.sectionTitle, messageToTitle, false)

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.addReplyInPopupByCommentId(1, replyCommentFirst)
      await documentCommentsPage.checkCommentInPopupById(
        1,
        newContentFirst.sectionTitle,
        author,
        messageToTitle,
        replyCommentFirst
      )

      await attachScreenshot('TESTS-161_add_comment_and_check_popup.png', page)
      await documentContentPage.closeNewMessagePopup()
    })

    await test.step('4. Add comment and check comment in the right panel', async () => {
      await documentContentPage.buttonComments.click()

      const documentCommentsPage = new DocumentCommentsPage(page)
      await documentCommentsPage.checkCommentInPanelById(
        1,
        newContentFirst.sectionTitle,
        author,
        messageToTitle,
        replyCommentFirst
      )
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
    const overviewContent: Content = {
      sectionTitle: 'Overview',
      content:
        'In this section, we explore [Medical Topic], shedding light on its key aspects, causes, symptoms, and available treatments. Gain insights into the latest advancements in [Medical Field] and discover valuable information for a better understanding of managing and addressing [Medical Condition].'
    }
    const mainContent: Content = {
      sectionTitle: 'Main',
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
      await documentContentPage.checkContentForTheSection(overviewContent)
      await documentContentPage.checkContentForTheSection(mainContent)
    })
  })
})
