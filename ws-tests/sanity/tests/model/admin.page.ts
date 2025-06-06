import { PlatformURI } from '@hcengineering/tests-sanity'
import { type Page } from '@playwright/test'

export class AdminPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  // ACTIONS
  async gotoAdmin (): Promise<void> {
    await (await this.page.goto(`${PlatformURI}/login/admin`))?.finished()
  }
}
