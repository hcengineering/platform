import { test } from '@playwright/test'
import { attachScreenshot, generateId, HomepageURI, PlatformSetting, PlatformURI } from '../utils'
import { Content, DocumentDetails, DocumentRights, DocumentStatus, NewDocument } from '../model/types'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { prepareDocumentStep } from './common-documents-steps'
import { allure } from 'allure-playwright'

test.use({
  storageState: PlatformSetting
})

test.describe('QMS. Documents comparing tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/${HomepageURI}`))?.finished()
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
    const newContentFirst: Content = {
      sectionTitle: `Comparing versions. Overview-${generateId()}`,
      content: `Comparing versions. New content-${generateId()}!!!!`
    }
    const updateContentFirst: Content = {
      sectionTitle: '',
      content: `Comparing versions Updated. Updated content-${generateId()}!!!!`
    }
    const newContentSecond: Content = {
      sectionTitle: `Comparing versions. Description-${generateId()}`,
      content: `Comparing versions. New content Description-${generateId()}!!!!`
    }

    await prepareDocumentStep(page, makeReviewDocument)
    const documentContentPage = new DocumentContentPage(page)
    await test.step('2. Add section and content', async () => {
      await documentContentPage.checkDocumentTitle(makeReviewDocument.title)
      await documentContentPage.checkDocumentStatus(DocumentStatus.DRAFT)
      await documentContentPage.checkDocument(documentDetails)
      await documentContentPage.checkCurrentRights(DocumentRights.EDITING)

      await documentContentPage.updateSectionTitle('1', newContentFirst.sectionTitle)
      await documentContentPage.addContentToTheSection(newContentFirst)
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

      await documentContentPage.addContentToTheSection({
        sectionTitle: newContentFirst.sectionTitle,
        content: updateContentFirst.content
      })
      await documentContentPage.checkContentForTheSection({
        sectionTitle: newContentFirst.sectionTitle,
        content: updateContentFirst.content
      })

      await documentContentPage.addNewSection('1', 'below')
      await documentContentPage.updateSectionTitle('2', newContentSecond.sectionTitle)
      await documentContentPage.addContentToTheSection(newContentSecond)

      await documentContentPage.changeCurrentRight(DocumentRights.COMPARING)
      await documentContentPage.checkComparingTextAdded('Updated')
      await documentContentPage.checkComparingTextDeleted('New')
      await documentContentPage.checkComparingTextAdded(newContentSecond.sectionTitle)
      await documentContentPage.checkComparingTextAdded(newContentSecond.content)

      await attachScreenshot('TESTS-140_fix_reviews.png', page)
    })
  })
})
