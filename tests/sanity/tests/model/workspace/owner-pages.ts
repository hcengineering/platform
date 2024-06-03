import { expect, type Locator, type Page } from '@playwright/test'

export class OwnersPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  owner = (ownerName: string): Locator => this.page.getByRole('link', { name: ownerName })

  async checkIfOwnerExists (ownerName: string): Promise<void> {
    await expect(this.owner(ownerName)).toBeVisible()
  }
}
