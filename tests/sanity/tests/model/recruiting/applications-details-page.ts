import { expect, type Locator, type Page } from '@playwright/test'
import path from 'path'
import { CommonPage } from '../common-page'

export class ApplicationsDetailsPage extends CommonPage {
  readonly page: Page
  readonly inputCommentComment: Locator
  readonly buttonSendComment: Locator
  readonly textComment: Locator
  readonly inputAddAttachment: Locator
  readonly textAttachmentName: Locator
  readonly buttonCreateFirstReview: Locator
  readonly buttonChangeStatusDone: Locator
  readonly textApplicationId: Locator
  readonly buttonMoreActions: Locator
  readonly buttonDelete: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.inputCommentComment = page.locator('div.tiptap')
    this.buttonSendComment = page.locator('g#Send')
    this.textComment = page.locator('div.msgactivity-container p')
    this.inputAddAttachment = page.locator('div.antiSection #file')
    this.textAttachmentName = page.locator('div.name a')
    this.buttonCreateFirstReview = page.locator('span:has-text("Create review")')
    this.buttonChangeStatusDone = page.locator('div[class*="aside-grid"] > div:nth-of-type(2) > button')
    this.textApplicationId = page.locator('div.popupPanel-title div.title-wrapper > span')
    this.buttonMoreActions = page.locator('div.popupPanel-title div.buttons-group > button:nth-of-type(2)')
    this.buttonDelete = page.locator('button[class*="menuItem"] span', { hasText: 'Delete' })
  }

  async addComment (comment: string): Promise<void> {
    await this.inputCommentComment.fill(comment)
    await this.buttonSendComment.click()
  }

  async checkCommentExist (comment: string): Promise<void> {
    await expect(await this.textComment.filter({ hasText: comment })).toBeVisible()
  }

  async addAttachments (filePath: string): Promise<void> {
    await this.inputAddAttachment.setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(await this.textAttachmentName.filter({ hasText: filePath })).toBeVisible()
  }

  async addFirstReview (): Promise<void> {
    await this.buttonCreateFirstReview.click()
    await this.createNewReviewPopup(this.page, 'First Review', 'First review description')
  }

  async changeDoneStatus (status: string): Promise<void> {
    await this.buttonChangeStatusDone.click()
    await this.selectFromDropdown(this.page, status)
  }

  async getApplicationId (): Promise<string> {
    const applicationId = await this.textApplicationId.textContent()
    expect(applicationId !== null).toBeTruthy()
    return applicationId != null ? applicationId : ''
  }

  async deleteApplication (): Promise<void> {
    await this.buttonMoreActions.click()
    await this.buttonDelete.click()
    await this.pressYesDeletePopup(this.page)
  }
}
