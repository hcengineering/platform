import { type Locator, type Page } from '@playwright/test'
import { Drive } from './types'

export class DriveCreateEditPopup {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly popup = (): Locator => this.page.locator('div.popup')
  readonly form = (): Locator => this.popup().locator('form[id^="drive:string:"]')
  readonly buttonSelectSpaceType = (): Locator => this.form().locator('div.antiGrid-row:has-text("Space type") button')
  readonly inputName = (): Locator => this.form().locator('div.antiGrid-row:has-text("Name") input')
  readonly inputDescription = (): Locator => this.form().locator('div.antiGrid-row:has-text("Description") input')
  readonly buttonSelectOwners = (): Locator => this.form().locator('div.antiGrid-row:has-text("Owners") button')
  readonly togglePrivate = (): Locator =>
    this.form().locator('div.antiGrid-row:has-text("Make private") .toggle-switch')

  readonly buttonSelectMembers = (): Locator => this.form().locator('div.antiGrid-row:has-text("Members") button')
  readonly buttonSubmit = (): Locator => this.form().locator('button[type="submit"]')

  async createOrEditDrive (drive: Drive): Promise<void> {
    await this.inputName().fill(drive.name)
    await this.buttonSubmit().click()
  }
}
