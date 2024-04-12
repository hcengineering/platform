import { expect, Locator, Page } from '@playwright/test'
import { BoardsNavigatorPage } from './boards-navigator-page'

export class BoardsDefaultPage extends BoardsNavigatorPage {
  page: Page
  readonly headerBoardDefault: Locator
  readonly headerTitle: Locator
  readonly headerDescription: Locator
  readonly kanbanCard: Locator
  readonly tooltip: Locator
  readonly tableCard: Locator
  readonly buttonShowMenu: Locator
  readonly kanbanPanel: Locator

  constructor(page: Page) {
    super(page)
    this.page = page
    this.headerBoardDefault = page.locator('div[class$="full"]')
    this.headerTitle = page.locator('span[class="ac-header__title"]', { hasText: 'Default' })
    this.headerDescription = page.locator('span[class="ac-header__description"]', { hasText: 'Default board' })
    this.kanbanCard = page.locator('[data-id$="KanbanCard"]')
    this.tooltip = page.locator('[class*="tooltip top"]')
    this.tableCard = page.locator('[data-id$="TableCard"]')
    this.buttonShowMenu = page.getByRole('button', { name: 'Show menu' })
    this.kanbanPanel = page.locator('[class^="kanban-content"]')

  }

  /**
   * This function tests header elements in default page
   */
  async validateHeader (): Promise<void> {
    await this.buttonDefault.click()
    await expect(this.headerBoardDefault).toBeVisible()
    await expect(this.headerTitle).toBeVisible()
    await expect(this.headerDescription).toBeVisible()
    await expect(this.kanbanCard).toBeVisible()
    await expect(this.tableCard).toBeVisible()
    await expect(this.buttonShowMenu).toBeVisible()
  }

  /**
   * This function tests tooltips
   */
  async verifyTooltips (): Promise<void> {
    await expect(this.kanbanCard).toBeVisible()
    await this.kanbanCard.click()
    await this.kanbanCard.hover()
    await expect(this.tooltip).toBeVisible()
    let tooltipText = await this.tooltip.textContent()
    expect(tooltipText).toContain('Kanban')
    await this.page.waitForTimeout(300)
    await expect(this.tableCard).toBeVisible()
    await this.tableCard.click()
    await this.tableCard.hover()
    tooltipText = await this.tooltip.textContent()
    expect(tooltipText).toContain('Table')
  }
}
