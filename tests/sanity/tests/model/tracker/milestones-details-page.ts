import { type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'

export class MilestonesDetailsPage extends CommonTrackerPage {
  readonly page: Page
  readonly inputTitle: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputTitle = page.locator('div.popupPanel-body input[type="text"]')
  }
}
