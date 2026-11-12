import { type Locator, type Page, expect } from '@playwright/test'

export class PlanningNavigationMenuPage {
  readonly page: Page

  constructor (page: Page) {
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

  readonly accordionContainerToDoUnplanned = (): Locator =>
    this.page.locator('div.toDos-container div.hulyAccordionItem-container', { hasText: 'Unplanned' })

  readonly toDoPanelContainer = (): Locator => this.page.locator('div.toDos-container')

  readonly accordionContainerByName = (toDoCategoryName: string): Locator =>
    this.toDoPanelContainer().locator('div.hulyAccordionItem-container', { hasText: toDoCategoryName })

  readonly categoryProjectContainer = (category: string, project: string): Locator =>
    this.accordionContainerByName(category).locator(`div.hulyAccordionItem-container:has(button:has-text("${project}"))`)

  async clickOnButtonToDoAll (): Promise<void> {
    await this.buttonToDoAll().click()
  }

  async clickOnButtonUnplanned (): Promise<void> {
    await this.buttonToDoUnplanned().click()
  }

  async clickOnButtonToDoPlanned (): Promise<void> {
    await this.buttonToDoPlanned().click()
  }

  async compareCountersUnplannedToDos (): Promise<void> {
    const navCount = parseInt(
      await this.buttonToDoUnplanned().locator('xpath=..').locator('span.hulyNavItem-count').innerText(),
      10
    )
    const accCount = await this.accordionContainerToDoUnplanned().locator('button.hulyToDoLine-container').count()
    expect(accCount).toBe(navCount)
  }

  async checkToDoCategory (toDoName: string, category: string, project: string): Promise<void> {
    await expect(this.categoryProjectContainer(category, project).locator(`div.hulyAccordionItem-content:has-text("${toDoName}")`)).toBeVisible()
  }
}
