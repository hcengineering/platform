import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class TeamPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  appHeader = (): Locator => this.page.locator('div.hulyNavPanel-header', { hasText: 'Team Planner' })
  buttonTeam = (name: string): Locator =>
    this.page.locator('div#navGroup-projects-planning button.hulyNavItem-container', { hasText: name })

  buttonNextDay = (): Locator =>
    this.page.locator('div.hulyComponent div.hulyHeader-container .actions button[data-id="btnNext"]')

  getItemByText = (column: string, title: string): Locator =>
    this.page.locator('div.hulyComponent div.item', { hasText: column }).locator('div.item', { hasText: title })

  async checkTeamPageIsOpened (): Promise<void> {
    await expect(this.appHeader()).toBeVisible()
  }

  async selectTeam (name: string): Promise<void> {
    await this.buttonTeam(name).click()
  }
}
