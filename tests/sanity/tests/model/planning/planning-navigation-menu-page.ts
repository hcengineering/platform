import { type Locator, type Page } from '@playwright/test'

export class PlanningNavigationMenuPage {
  readonly page: Page
  readonly buttonToDoAll: Locator
  readonly buttonToDoUnplanned: Locator
  readonly buttonToDoPlanned: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonToDoAll = page.locator('button[class*="hulyNavItem-container"] span[class*="hulyNavItem-label"]', {
      hasText: 'All'
    })
    this.buttonToDoUnplanned = page.locator('button[class*="hulyNavItem-container"] span[class*="hulyNavItem-label"]', {
      hasText: 'Unplanned'
    })
    this.buttonToDoPlanned = page.locator(
      'button[class*="hulyNavItem-container"] span[class*="hulyNavItem-label"]:text-is("Planned")'
    )
  }
}
