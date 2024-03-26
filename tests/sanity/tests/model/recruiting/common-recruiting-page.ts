import { expect, Locator, Page } from '@playwright/test'
import path from 'path'
import { CalendarPage } from '../calendar-page'
import { SocialLink } from './types'

export class CommonRecruitingPage extends CalendarPage {
  readonly page: Page
  readonly inputComment: Locator
  readonly buttonSendComment: Locator
  readonly textComment: Locator
  readonly inputAddAttachment: Locator
  textAttachmentName: Locator
  readonly buttonCreateFirstReview: Locator
  readonly buttonMoreActions: Locator
  readonly buttonDelete: Locator
  readonly buttonAddSocialLinks: Locator
  readonly buttonContactPhone: Locator
  readonly buttonContactEmail: Locator
  readonly inputSocialValue: Locator
  readonly buttonSocialCancel: Locator
  readonly buttonSocialSave: Locator
  readonly textActivity: Locator
  readonly buttonContactLinkedIn: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputComment = page.locator('div.text-input div.tiptap')
    this.buttonSendComment = page.locator('g#Send')
    this.textComment = page.locator('div.showMore-content p')
    this.inputAddAttachment = page.locator('div.antiSection #file')
    this.textAttachmentName = page.locator('div.attachment-container > a')
    this.buttonCreateFirstReview = page.locator('span:has-text("Create review")')
    this.buttonMoreActions = page.locator('.popupPanel-title > .flex-row-center > button >> nth=0')
    this.buttonDelete = page.locator('button[class*="menuItem"] span', { hasText: 'Delete' })
    this.buttonAddSocialLinks = page.locator('button[id="presentation:string:AddSocialLinks"]')
    this.buttonContactPhone = page.locator(
      'div[class^="popupPanel-body"] div.horizontal button[id="contact:string:Phone"]'
    )
    this.buttonContactEmail = page.locator(
      'div[class^="popupPanel-body"] div.horizontal button[id="gmail:string:Email"]'
    )
    this.inputSocialValue = page.locator('div.popup input.search')
    this.buttonSocialCancel = page.locator('div.popup button[type="button"]:not([id])')
    this.buttonSocialSave = page.locator('button#channel-ok')
    this.textActivity = page.locator('div.header')
    this.buttonContactLinkedIn = page.locator(
      'div[class^="popupPanel-body"] div.horizontal button[id="contact:string:LinkedIn"]'
    )
  }

  async addComment (comment: string): Promise<void> {
    await this.inputComment.fill(comment)
    await this.buttonSendComment.click()
  }

  async checkCommentExist (comment: string): Promise<void> {
    await expect(this.textComment.filter({ hasText: comment })).toBeVisible()
  }

  async addAttachments (filePath: string): Promise<void> {
    await this.inputAddAttachment.setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textAttachmentName.filter({ hasText: filePath }).first()).toBeVisible()
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

  async deleteEntity (): Promise<void> {
    await this.buttonMoreActions.click()
    await this.buttonDelete.click()
    await this.pressYesDeletePopup(this.page)
  }

  async addSocialLinks (link: string, linkDescription: string): Promise<void> {
    await this.buttonAddSocialLinks.click()
    await this.selectFromDropdown(this.page, link)
    await this.fillToDropdown(this.page, linkDescription)
  }

  async addSocialLink (social: SocialLink): Promise<void> {
    await this.addSocialLinks(social.type, social.value)
  }

  async checkSocialLinks (link: string, value: string): Promise<void> {
    switch (link) {
      case 'Phone':
        await expect(this.buttonContactPhone).toBeEnabled()
        await this.buttonContactPhone.click()
        await expect(this.inputSocialValue).toHaveValue(value)
        await this.buttonSocialSave.click()
        break
      case 'Email':
        await expect(this.buttonContactEmail.first()).toBeEnabled()
        await this.buttonContactEmail.first().click()
        await expect(this.inputSocialValue).toHaveValue(value)
        await this.buttonSocialSave.click()
        break
      case 'LinkedIn':
        await expect(this.buttonContactLinkedIn).toBeVisible()
        await this.buttonContactLinkedIn.click()
        await expect(this.inputSocialValue).toHaveValue(value)
        await this.buttonSocialSave.click()
        break
      default:
        throw new Error(`Unknown case ${link}`)
    }
  }

  async moreActionOn (action: string): Promise<void> {
    await this.buttonMoreActions.click()
    await this.selectFromDropdown(this.page, action)
  }

  async checkActivityExist (activity: string): Promise<void> {
    await expect(this.textActivity.filter({ hasText: activity })).toBeVisible()
  }

  async checkCannotDelete (): Promise<void> {
    await this.buttonMoreActions.click()

    await expect(this.buttonDelete).not.toBeVisible()
  }
}
