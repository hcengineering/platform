import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class DocumentMovePopup extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly popup = (): Locator => this.page.locator('div.popup')
  readonly buttonSelectSpace = (): Locator => this.popup().locator('button[id="space.selector"]')
  readonly buttonSubmit = (): Locator => this.popup().locator('button[type="submit"]')

  async moveToSpace (newSpace: string): Promise<void> {
    await this.buttonSelectSpace().click()
    await this.selectMenuItem(this.page, newSpace)
    await this.buttonSubmit().click()
  }
}
