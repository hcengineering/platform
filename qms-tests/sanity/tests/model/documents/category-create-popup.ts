import { type Locator, type Page, expect } from '@playwright/test'
import { CalendarPage } from '../calendar-page'
import { NewCategory } from '../types'
import path from 'path'

export class CategoryCreatePopup extends CalendarPage {
  readonly page: Page
  readonly inputNewCategoryTitle: Locator
  readonly inputNewCategoryDescription: Locator
  readonly inputNewCategoryCode: Locator
  readonly inputAttachFile: Locator
  readonly buttonNewCategoryCreate: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputNewCategoryTitle = page.locator('input[placeholder="Title"]')
    this.inputNewCategoryCode = page.locator('input[placeholder="Code"]')
    this.inputNewCategoryDescription = page.locator('div.inputMsg div.tiptap')
    this.inputAttachFile = page.locator('form[id="documents:string:CreateDocumentCategory"] input[type="file"]#file')
    this.buttonNewCategoryCreate = page.locator(
      'form[id="documents:string:CreateDocumentCategory"] button[type="submit"]'
    )
  }

  async createCategory (data: NewCategory): Promise<void> {
    await this.inputNewCategoryTitle.fill(data.title)
    await this.inputNewCategoryCode.fill(data.code)
    await this.inputNewCategoryDescription.fill(data.description)

    if (data.attachFileName != null) {
      await this.inputAttachFile.setInputFiles(path.join(__dirname, `../../files/${data.attachFileName}`))
      await expect(
        this.page.locator('div[class*="attachments"] div.name', { hasText: data.attachFileName })
      ).toBeVisible()
    }

    await this.buttonNewCategoryCreate.click()
  }
}
