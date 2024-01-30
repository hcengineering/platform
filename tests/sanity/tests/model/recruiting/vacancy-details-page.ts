import { expect, type Locator, type Page } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'
import path from 'path'

export class VacancyDetailsPage extends CommonRecruitingPage {
  readonly page: Page
  readonly inputDescription: Locator
  readonly buttonInputDescription: Locator
  readonly buttonInputLocation: Locator
  readonly inputAttachFile: Locator
  readonly buttonInputCompany: Locator
  readonly buttonInputDueDate: Locator
  readonly buttonDatePopupSave: Locator
  readonly inputComment: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputDescription = page.locator('div[class*="full"] div.tiptap')
    this.buttonInputDescription = page.locator('button > span', { hasText: 'Description' })
    this.buttonInputLocation = page.locator('button > span', { hasText: 'Location' })
    this.inputAttachFile = page.locator('div[class*="full"] input[name="file"]')
    this.buttonInputCompany = page.locator('button > div', { hasText: 'Company' })
    this.buttonInputDueDate = page.locator('button > div', { hasText: 'Due date' })
    this.buttonDatePopupSave = page.locator('div.popup button[type="submit"]')
    this.inputComment = page.locator('div.text-input div.tiptap')
  }

  async addComment (comment: string): Promise<void> {
    await this.inputComment.fill(comment)
    await this.buttonSendComment.click()
  }

  async addAttachments (filePath: string): Promise<void> {
    await this.inputAttachFile.setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textAttachmentName.first()).toHaveAttribute('download', filePath)
  }

  async addDescription (description: string): Promise<void> {
    await this.buttonInputDescription.click()
    await this.fillToSelectPopup(this.page, description)
  }

  async addLocation (location: string): Promise<void> {
    await this.buttonInputLocation.click()
    await this.fillToSelectPopup(this.page, location)
  }

  async addCompany (company: string): Promise<void> {
    await this.buttonInputCompany.click()
    await this.selectMenuItem(this.page, company)
  }

  async addDueDateToday (): Promise<void> {
    await this.buttonInputDueDate.click()
    await this.buttonDatePopupToday.click()
  }
}
