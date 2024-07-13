import { type Locator, type Page } from '@playwright/test'

export class LeftSideMenuPage {
  readonly page: Page
  readonly buttonPlanning: Locator
  readonly buttonTeam: Locator
  readonly buttonDocuments: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonPlanning = page.locator('button[id$="Planning"]')
    this.buttonTeam = page.locator('button[id$="Team"]')
    this.buttonDocuments = page.locator('button[id$="documents:string:DocumentApplication"]')
  }
}
