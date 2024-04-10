import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class DocumentCreateSnapshot extends CommonPage {
  readonly page: Page
  readonly popup: Locator
  readonly form: Locator
  readonly inputName: Locator
  readonly buttonCreate: Locator

  constructor(page: Page) {
    super()
    this.page = page
    this.popup = page.locator('div.popup')
    this.form = this.popup.locator('form[id="document:string:Snapshot"]')
    this.inputName = this.form.locator('input')
    this.buttonCreate = this.form.locator('button[type="submit"]')
  }

  async createDocument(name: string): Promise<void> {
    await this.inputName.fill(name)
    await this.buttonCreate.click()
  }
}
