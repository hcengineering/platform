import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from '../common-page'
import path from 'path'

export class CommonRecruitingPage extends CommonPage {
  readonly page: Page
  readonly inputComment: Locator
  readonly buttonSendComment: Locator
  readonly textComment: Locator
  readonly inputAddAttachment: Locator
  readonly textAttachmentName: Locator
  readonly buttonCreateFirstReview: Locator
  readonly buttonMoreActions: Locator
  readonly buttonDelete: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.inputComment = page.locator('div.tiptap')
    this.buttonSendComment = page.locator('g#Send')
    this.textComment = page.locator('div.msgactivity-container p')
    this.inputAddAttachment = page.locator('div.antiSection #file')
    this.textAttachmentName = page.locator('div.name a')
    this.buttonCreateFirstReview = page.locator('span:has-text("Create review")')
    this.buttonMoreActions = page.locator('div.popupPanel-title div.buttons-group > button:nth-of-type(2)')
    this.buttonDelete = page.locator('button[class*="menuItem"] span', { hasText: 'Delete' })
  }

  async addComment (comment: string): Promise<void> {
    await this.inputComment.fill(comment)
    await this.buttonSendComment.click()
  }

  async checkCommentExist (comment: string): Promise<void> {
    await expect(await this.textComment.filter({ hasText: comment })).toBeVisible()
  }

  async addAttachments (filePath: string): Promise<void> {
    await this.inputAddAttachment.setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(await this.textAttachmentName.filter({ hasText: filePath })).toBeVisible()
  }

  async addFirstReview (reviewTitle: string, reviewDescription: string): Promise<void> {
    await this.buttonCreateFirstReview.click()
    await this.createNewReviewPopup(this.page, reviewTitle, reviewDescription)
  }

  async createNewTalentPopup (page: Page, firstName: string, lastName: string): Promise<void> {
    await page
      .locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="First name"]')
      .fill(firstName)
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="Last name"]').fill(lastName)
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] button[type="submit"]').click()
  }

  async createNewReviewPopup (page: Page, title: string, description: string): Promise<void> {
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] input[placeholder="Title"]').fill(title)
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] div.text-editor-view').fill(description)
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] button[type="submit"]').click()
  }

  async addNewTagPopup (page: Page, title: string, description: string): Promise<void> {
    await page.locator('div.popup form[id="tags:string:AddTag"] input[placeholder$="title"]').fill(title)
    await page
      .locator('div.popup form[id="tags:string:AddTag"] input[placeholder="Please type description here"]')
      .fill(description)
    await page.locator('div.popup form[id="tags:string:AddTag"] button[type="submit"]').click()
  }

  async deleteEntity (): Promise<void> {
    await this.buttonMoreActions.click()
    await this.buttonDelete.click()
    await this.pressYesDeletePopup(this.page)
  }
}
