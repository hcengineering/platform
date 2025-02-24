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
    this.buttonDocuments = page.locator('[id$="app-documents\\:string\\:DocumentApplication"]')
  }

  async clickButtonOnTheLeft (buttonName: 'Planning' | 'Team' | 'Documents'): Promise<void> {
    switch (buttonName) {
      case 'Planning':
        await this.buttonPlanning.click()
        break
      case 'Team':
        await this.buttonTeam.click()
        break
      case 'Documents':
        await this.buttonDocuments.click()
        break
      default:
        throw new Error('Unknown button')
    }
  }
}
