import { type Locator, type Page } from '@playwright/test'

export class PlanningNavigationMenuPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  readonly buttonToDoAll = (): Locator =>
    this.page.locator('button[class*="hulyNavItem-container"] span[class*="hulyNavItem-label"]', {
      hasText: 'All'
    })

  readonly buttonToDoUnplanned = (): Locator =>
    this.page.locator('button[class*="hulyNavItem-container"] span[class*="hulyNavItem-label"]', {
      hasText: 'Unplanned'
    })

  readonly buttonToDoPlanned = (): Locator =>
    this.page.locator('button[class*="hulyNavItem-container"] span[class*="hulyNavItem-label"]:text-is("Planned")')

  async clickOnButtonToDoAll(): Promise<void> {
    await this.buttonToDoAll().click()
  }

  async clickOnButtonUnplanned(): Promise<void> {
    await this.buttonToDoUnplanned().click()
  }

  async clickOnButtonToDoPlanned(): Promise<void> {
    await this.buttonToDoPlanned().click()
  }
}
