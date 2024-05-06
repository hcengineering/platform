import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'
import { NewDocument } from './types'

export class DocumentCreatePopup extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly popup = (): Locator => this.page.locator('div.popup')
  readonly form = (): Locator => this.popup().locator('form[id="document:string:CreateDocument"]')
  readonly buttonSelectSpace = (): Locator => this.form().locator('button[id="space.selector"]')
  readonly buttonSelectParent = (): Locator => this.form().locator('div[class*="title"] div > button')
  readonly buttonSelectIcon = (): Locator => this.form().locator('div[class*="horizontalBox"] button.only-icon')
  readonly inputTitle = (): Locator => this.form().locator('input')
  readonly buttonSubmit = (): Locator => this.form().locator('button[type="submit"]')

  async createDocument (data: NewDocument): Promise<void> {
    await this.inputTitle().fill(data.title)

    if (data.space != null) {
      await this.buttonSelectSpace().click()
      await this.selectMenuItem(this.page, data.space)
    }

    if (data.parentDocument != null) {
      await this.buttonSelectParent().click()
      await this.selectMenuItem(this.page, data.parentDocument)
    }

    if (data.icon != null) {
      await this.buttonSelectIcon().click()
    }

    await this.buttonSubmit().click()
  }
}
