import { type Locator, type Page } from '@playwright/test'

export class ApplicationsDetailsPage {
  readonly page: Page
  readonly inputCommentMessage: Locator

  constructor (page: Page) {
    this.page = page
    this.inputCommentMessage = page.locator('div.tiptap')
  }
}
