import { expect, type Page } from '@playwright/test'
import { DocumentCommonPage } from './document-common-page'

export class DocumentHistoryPage extends DocumentCommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  async checkHistoryEventExist (eventDescription: string): Promise<void> {
    await expect(this.page.locator('div.root div.description', { hasText: eventDescription })).toBeVisible()
  }
}
