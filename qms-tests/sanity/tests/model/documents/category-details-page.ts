import { type Locator, type Page, expect } from '@playwright/test'
import { CalendarPage } from '../calendar-page'
import { NewCategory, UpdateCategory } from '../types'
import path from 'path'

export class CategoryDetailsPage extends CalendarPage {
  readonly page: Page
  readonly inputCategoryTitle: Locator
  readonly inputCategoryCode: Locator
  readonly textDescription: Locator
  readonly inputAttachFile: Locator
  readonly textAttachFile: Locator
  readonly buttonMoreActions: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputCategoryTitle = page.locator('input[placeholder="documents:string:DomainTitle"]')
    this.inputCategoryCode = page.locator('input[placeholder="Category"]')
    this.textDescription = page.locator('div.grid div.tiptap')
    this.inputAttachFile = page.locator('div.grid input#file')
    this.buttonMoreActions = page.locator('.popupPanel > .hulyHeader-container button[data-id="btnMoreActions"]')
    this.textAttachFile = page.locator('div.attachment-grid-container div[class*="attachment"] div.name')
  }

  async checkTitle (categoryTitle: string): Promise<void> {
    await expect(this.inputCategoryTitle).toHaveValue(categoryTitle)
  }

  async editCategory (data: UpdateCategory): Promise<void> {
    await this.textDescription.fill(data.description)

    if (data.attachFileName != null) {
      await this.inputAttachFile.setInputFiles(path.join(__dirname, `../../files/${data.attachFileName}`))
      await expect(this.textAttachFile.filter({ hasText: data.attachFileName })).toBeVisible()
    }
  }

  async checkCategory (data: NewCategory): Promise<void> {
    await expect(this.inputCategoryTitle).toHaveValue(data.title)
    await expect(this.inputCategoryCode).toHaveValue(data.code)
    await expect(this.textDescription).toContainText(data.description)

    if (data.attachFileName != null) {
      await expect(this.textAttachFile.filter({ hasText: data.attachFileName })).toBeVisible()
    }
  }

  async executeMoreAction (action: string): Promise<void> {
    await this.buttonMoreActions.click()
    await this.selectFromDropdown(this.page, action)
    await this.pressYesDeletePopup(this.page)
  }

  async checkMoreActionNotExist (action: string): Promise<void> {
    await this.buttonMoreActions.click()
    await expect(this.page.locator('div.popup button.ap-menuItem', { hasText: action })).toBeVisible({ visible: false })
  }
}
