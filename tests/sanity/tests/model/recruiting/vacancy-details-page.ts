import { expect, type Locator, type Page } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'
import path from 'path'

export class VacancyDetailsPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly inputDescription = (): Locator => this.page.locator('div[class*="full"] div.tiptap')
  readonly buttonInputDescription = (): Locator => this.page.locator('button > span', { hasText: 'Description' })
  readonly buttonInputLocation = (): Locator => this.page.locator('button > span', { hasText: 'Location' })
  readonly inputAttachFile = (): Locator => this.page.locator('div[class*="full"] input[name="file"]#fileInput')
  readonly buttonInputCompany = (): Locator => this.page.locator('button > div', { hasText: 'Company' })
  readonly buttonInputDueDate = (): Locator => this.page.locator('button > div', { hasText: 'Due date' })
  readonly buttonDatePopupSave = (): Locator => this.page.locator('div.popup button[type="submit"]')
  readonly inputComment = (): Locator => this.page.locator('div.text-input div.tiptap')

  async addComment (comment: string): Promise<void> {
    await this.inputComment().fill(comment)
    await this.buttonSendComment().click()
  }

  async addAttachments (filePath: string): Promise<void> {
    await this.inputAttachFile().setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textAttachmentName().first()).toHaveAttribute('download', filePath)
  }

  async addDescription (description: string): Promise<void> {
    await this.buttonInputDescription().click()
    await this.fillToSelectPopup(this.page, description)
  }

  async addLocation (location: string): Promise<void> {
    await this.buttonInputLocation().click()
    await this.fillToSelectPopup(this.page, location)
  }

  async addCompany (company: string): Promise<void> {
    await this.buttonInputCompany().click()
    await this.selectMenuItem(this.page, company)
  }

  async addDueDateToday (): Promise<void> {
    await this.buttonInputDueDate().click()
    await this.clickButtonDatePopupToday()
  }

  async fillInputDescription (description: string): Promise<void> {
    await this.inputDescription().fill(description)
  }

  async checkIfVacancyInputComentIsVisible (): Promise<void> {
    await expect(this.inputComment()).toBeVisible()
  }

  async checkIfInputDescriptionHasText (description: string): Promise<void> {
    await expect(this.inputDescription()).toHaveText(description)
  }
}
