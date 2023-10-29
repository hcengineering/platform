import { Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class CommonTrackerPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super()
    this.page = page
  }
}
