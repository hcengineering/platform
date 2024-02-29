import { type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class DocumentMovePopup extends CommonPage {
  readonly page: Page
  readonly popup: Locator
  readonly buttonSelectSpace: Locator
  readonly buttonSubmit: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.popup = page.locator('div.popup')
    this.buttonSelectSpace = this.popup.locator('button[id="space.selector"]')
    this.buttonSubmit = this.popup.locator('button[type="submit"]')
  }

  async moveToSpace (newSpace: string): Promise<void> {
    await this.buttonSelectSpace.click()
    await this.selectMenuItem(this.page, newSpace)
    await this.buttonSubmit.click()
  }
}
