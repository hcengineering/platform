import { type Locator, type Page } from '@playwright/test'

export class NavigationMenuPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  // Locator methods
  readonly buttonApplications = (): Locator => this.page.locator('a[href$="candidates"]', { hasText: 'Applications' })
  readonly buttonMyApplications = (): Locator =>
    this.page.locator('a[href$="my-applications"]', { hasText: 'My applications' })

  readonly navigator = (): Locator => this.page.locator('.antiPanel-navigator')
  readonly buttonTalents = (): Locator => this.navigator().locator('a[href$="talents"]', { hasText: 'Talents' })
  readonly buttonVacancies = (): Locator => this.navigator().locator('a[href$="vacancies"]', { hasText: 'Vacancies' })
  readonly buttonCompanies = (): Locator =>
    this.navigator().locator('a[href$="organizations"]', { hasText: 'Companies' })

  // Action methods to click on each button
  async clickButtonApplications (): Promise<void> {
    await this.buttonApplications().click()
  }

  async clickButtonMyApplications (): Promise<void> {
    await this.buttonMyApplications().click()
  }

  async clickButtonTalents (): Promise<void> {
    await this.buttonTalents().click()
  }

  async clickButtonVacancies (): Promise<void> {
    await this.buttonVacancies().click()
  }

  async clickButtonCompanies (): Promise<void> {
    await this.buttonCompanies().click()
  }
}
