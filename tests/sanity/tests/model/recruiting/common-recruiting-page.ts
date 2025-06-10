import { expect, Locator, Page } from '@playwright/test'
import path from 'path'
import { CalendarPage } from '../calendar-page'
import { SocialLink } from './types'

export class CommonRecruitingPage extends CalendarPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly inputComment = (): Locator => this.page.locator('div.text-input div.tiptap')
  readonly buttonSendComment = (): Locator => this.page.locator('g#Send')
  readonly textComment = (): Locator => this.page.locator('div.showMore-content p')
  readonly inputAddAttachment = (): Locator => this.page.locator('div.antiSection #file').first()
  readonly textAttachmentName = (): Locator => this.page.locator('div.attachment-container > a')
  readonly buttonCreateFirstReview = (): Locator => this.page.locator('span:has-text("Create review")')
  readonly buttonMoreActions = (): Locator =>
    this.page.locator('.popupPanel > .hulyHeader-container > .hulyHeader-buttonsGroup.actions > button').first()

  readonly buttonDelete = (): Locator => this.page.locator('button[class*="menuItem"] span', { hasText: 'Delete' })
  readonly buttonAddSocialLinks = (): Locator =>
    this.page.locator('button[id="presentation:string:AddSocialLinks"]').last()

  readonly buttonContactPhone = (): Locator =>
    this.page.locator('div[class^="popupPanel-body"] div.horizontal button[id="contact:string:Phone"]')

  readonly buttonContactEmail = (): Locator =>
    this.page.locator('div[class^="popupPanel-body"] div.horizontal button[id="gmail:string:Email"]')

  readonly inputSocialValue = (): Locator => this.page.locator('div.popup input.search')
  readonly buttonSocialCancel = (): Locator => this.page.locator('div.popup button[type="button"]:not([id])')
  readonly buttonSocialSave = (): Locator => this.page.locator('button#channel-ok')
  readonly textActivity = (): Locator => this.page.locator('div.content')
  readonly buttonContactLinkedIn = (): Locator =>
    this.page.locator('div[class^="popupPanel-body"] div.horizontal button[id="contact:string:LinkedIn"]')

  readonly newTalentFirstName = (): Locator =>
    this.page.locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="First name"]')

  readonly newTalentLastName = (): Locator =>
    this.page.locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="Last name"]')

  readonly submitNewTalent = (): Locator =>
    this.page.locator('div.popup form[id="recruit:string:CreateTalent"] button[type="submit"]')

  readonly newReviewTitle = (): Locator =>
    this.page.locator('div.popup form[id="recruit:string:CreateReviewParams"] input[placeholder="Title"]')

  readonly title = (): Locator => this.page.locator('[placeholder="Title"]')

  readonly newReviewDescription = (): Locator =>
    this.page.locator('div.popup form[id="recruit:string:CreateReviewParams"] div.text-editor-view')

  readonly submitNewReview = (): Locator =>
    this.page.locator('div.popup form[id="recruit:string:CreateReviewParams"] button[type="submit"]')

  readonly appleseedJohnButton = (): Locator => this.page.locator('button:has-text("Appleseed John")')
  readonly chenRosamundButton = (): Locator => this.page.locator('button:has-text("Chen Rosamund")')
  readonly searchInput = (): Locator => this.page.locator('[placeholder="Search\\.\\.\\."]')
  readonly talentButton = (): Locator => this.page.locator('form button:has-text("Talent")')
  readonly createButton = (): Locator => this.page.locator('button:has-text("Create")')
  readonly reviewItemLink = (reviewId: string): Locator => this.page.locator(`tr:has-text('${reviewId}') td a`)
  readonly twoMembersButton = (): Locator => this.page.locator('button:has-text("2 members")')
  readonly chenRosamundPopupButton = (): Locator => this.page.locator('.popup button:has-text("Chen Rosamund")')

  async clickOnTitle (): Promise<void> {
    await this.title().click()
  }

  async fillTitle (title: string): Promise<void> {
    await this.title().fill(title)
  }

  async clickAppleseedJohn (): Promise<void> {
    await this.appleseedJohnButton().click()
  }

  async clickChenRosamund (): Promise<void> {
    await this.chenRosamundButton().click()
  }

  async pressEscapeInSearch (): Promise<void> {
    await this.searchInput().press('Escape')
  }

  async clickTalent (): Promise<void> {
    await this.talentButton().click()
  }

  async createApplication (): Promise<void> {
    await this.createButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
  }

  async selectReviewItem (reviewId: string): Promise<void> {
    await this.reviewItemLink(reviewId).first().click()
  }

  async clickTwoMembers (): Promise<void> {
    await this.twoMembersButton().click()
  }

  async clickChenRosamundInPopup (): Promise<void> {
    await this.chenRosamundPopupButton().click()
  }

  async addComment (comment: string): Promise<void> {
    await this.inputComment().fill(comment)
    await this.buttonSendComment().click()
  }

  async checkCommentExist (comment: string): Promise<void> {
    await expect(this.textComment().filter({ hasText: comment })).toBeVisible()
  }

  async addAttachments (filePath: string): Promise<void> {
    await this.inputAddAttachment().setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textAttachmentName().filter({ hasText: filePath }).first()).toBeVisible()
  }

  async addFirstReview (reviewTitle: string, reviewDescription: string): Promise<void> {
    await this.buttonCreateFirstReview().click()
    await this.createNewReviewPopup(this.page, reviewTitle, reviewDescription)
  }

  async createNewTalentPopup (page: Page, firstName: string, lastName: string): Promise<void> {
    await this.newTalentFirstName().fill(firstName)
    await this.newTalentLastName().fill(lastName)
    await this.submitNewTalent().click()
  }

  async createNewReviewPopup (page: Page, title: string, description: string): Promise<void> {
    await this.newReviewTitle().fill(title)
    await this.newReviewDescription().fill(description)
    await this.submitNewReview().click()
  }

  async deleteEntity (): Promise<void> {
    await this.buttonMoreActions().click()
    await this.buttonDelete().click()
    await this.pressYesDeletePopup(this.page)
  }

  async addSocialLinks (link: string, linkDescription: string): Promise<void> {
    await this.buttonAddSocialLinks().click()
    await this.selectFromDropdown(this.page, link)
    await this.fillToDropdown(this.page, linkDescription)
  }

  async addSocialLink (social: SocialLink): Promise<void> {
    await this.addSocialLinks(social.type, social.value)
  }

  async checkSocialLinks (link: string, value: string): Promise<void> {
    switch (link) {
      case 'Phone':
        await expect(this.buttonContactPhone()).toBeEnabled()
        await this.buttonContactPhone().click()
        await expect(this.inputSocialValue()).toHaveValue(value)
        await this.buttonSocialSave().click()
        break
      case 'Email':
        await expect(this.buttonContactEmail().first()).toBeEnabled()
        await this.buttonContactEmail().first().click()
        await expect(this.inputSocialValue()).toHaveValue(value)
        await this.buttonSocialSave().click()
        break
      case 'LinkedIn':
        await expect(this.buttonContactLinkedIn()).toBeVisible()
        await this.buttonContactLinkedIn().click()
        await expect(this.inputSocialValue()).toHaveValue(value)
        await this.buttonSocialSave().click()
        break
      default:
        throw new Error(`Unknown case ${link}`)
    }
  }

  async moreActionOn (action: string): Promise<void> {
    await this.buttonMoreActions().click()
    await this.selectFromDropdown(this.page, action)
  }

  async checkActivityExist (activity: string): Promise<void> {
    await expect(this.textActivity().filter({ hasText: activity })).toBeVisible()
  }

  async checkCannotDelete (): Promise<void> {
    await this.buttonMoreActions().click()

    await expect(this.buttonDelete()).not.toBeVisible()
  }
}
