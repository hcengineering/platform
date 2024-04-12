import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class BoardsNavigatorPage extends CommonPage {
  page: Page
  readonly textBoards: Locator
  readonly buttonLabels: Locator
  readonly buttonDefault: Locator
  readonly buttonMyBoards: Locator
  readonly buttonHelpAndSupport: Locator
  readonly buttonMyBoardsIcon: Locator
  readonly tooltipBoards: Locator
  readonly hiddenArrow: Locator
  readonly hrefDefault: Locator
  readonly threeDotsDefault: Locator
  readonly antiPopup: Locator
  readonly starred: Locator
  readonly relatedIssuesPopupMenu: Locator
  readonly cardCloseButton: Locator
  readonly okButtonRelatedIssues: Locator
  readonly settingsHeader: Locator
  readonly popupArchive: Locator
  readonly cancelButtonArchive: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.textBoards = page.locator('div[class^="antiNav-header"]', { hasText: 'Boards' })
    this.buttonLabels = page.locator('div.antiNav-element', { hasText: 'Labels' })
    this.buttonDefault = page.locator('div[class$="__dropbox"] span')
    this.buttonMyBoards = page.locator('div[class*="antiNav-element relative"] span', { hasText: 'My boards' })
    this.buttonHelpAndSupport = page.getByText('Help & Support')
    this.buttonMyBoardsIcon = page.locator('#tree-boards button.button')
    this.tooltipBoards = page.locator('div[class*="tooltip top"]')
    this.hiddenArrow = page.locator('div[class*="an-element__tool arrow"]')
    this.hrefDefault = page.locator('div[class$="__dropbox"] a')
    this.threeDotsDefault = page.locator('div.antiNav-element__dropbox div.an-element__tool svg')
    this.antiPopup = page.locator('div.antiPopup').getByRole('button')
    this.starred = page.getByText('Starred')
    this.relatedIssuesPopupMenu = page.locator('div.popup.endShow')
    this.cardCloseButton = page.locator('#card-close')
    this.okButtonRelatedIssues = page.locator('button[type="submit"]')
    this.settingsHeader = page.locator('.hulyNavPanel-header')
    this.popupArchive = page.locator('div[class*="popup endShow"]')
    this.cancelButtonArchive = page.getByRole('button', { name: 'Cancel' })
  }

  /**
   * This function validates if the buttons are visible in navigator column
   */
  async validateBoardsNavigatorMenu(): Promise<void> {
    await expect(this.textBoards).toBeVisible()
    await expect(this.buttonLabels).toBeVisible()
    await expect(this.buttonDefault).toBeVisible()
    await expect(this.buttonMyBoards).toBeVisible()
    await expect(this.buttonHelpAndSupport).toBeVisible()
  }

  /**
   * This function tests hovering over MyBoards and if hidden arrow and '+' icon is visible
   */
  async checkMyBoardsIcons (): Promise<void> {
    await this.buttonMyBoards.hover()
    await expect(this.hiddenArrow).toBeVisible()
    await expect(this.buttonMyBoardsIcon).toBeVisible()
    await this.buttonMyBoardsIcon.hover()
    await this.tooltipBoards.waitFor({ state: 'visible' })
    const tooltip = await this.tooltipBoards.textContent()
    expect(tooltip).toContain('Board')
  }

  /**
   * This function tests default button has href and its lind, and after clicking My Boards button Default button is not existing
   */
  async checkDefaultDropboxAndHref(): Promise<void> {
    await expect(this.buttonDefault).toBeVisible()
    await expect(this.hrefDefault).toHaveAttribute('href', '/workbench/sanity-ws/board/board%3Aspace%3ADefaultBoard')
    await this.buttonMyBoards.click()
    await expect(this.buttonDefault).not.toBeVisible()
  }

  /**
   * This function tests three dots of default button and popup menu elements
   */
  async checkThreeDotsOptionsDefault (): Promise<void> {
    await this.buttonDefault.hover()
    await expect(this.threeDotsDefault).toBeVisible()
    await this.threeDotsDefault.click()
    const popUpList = await this.antiPopup.allTextContents()
    expect(popUpList).toEqual([' Star ', ' Configure Related issue default projects ', ' Edit states ', ' Open ', ' Archive '])
    await this.checkStar()
    await this.checkConfigureRelatedIssueDefaultProjects()
    await this.checkEditStates()
    await this.checkOpenMenu()
    await this.checkArchiveMenu()
  }

  /**
   * This function tests star menu of popup
   */
  async checkStar (): Promise<void> {
    await this.antiPopup.filter({ hasText: 'Star' }).click()
    await expect(this.starred).toBeVisible()
    await expect(this.buttonDefault).toBeVisible()
    await this.buttonDefault.hover()
    await expect(this.threeDotsDefault).toBeVisible()
    await this.threeDotsDefault.click()
    await this.antiPopup.filter({ hasText: 'Unstar' }).click()
    await expect(this.starred).not.toBeVisible()
  }

  /**
   * This function tests Configure Related issue default projects menu of popup
   */
  async checkConfigureRelatedIssueDefaultProjects (): Promise<void> {
    await this.buttonDefault.hover()
    await this.threeDotsDefault.click()
    await this.antiPopup.filter({ hasText: 'Configure Related issue default projects' }).click()
    await expect(this.relatedIssuesPopupMenu).toBeVisible()
    await this.cardCloseButton.hover()
    await expect(this.cardCloseButton).toBeVisible()
    await this.okButtonRelatedIssues.hover()
    await expect(this.okButtonRelatedIssues).toBeVisible()
    await this.okButtonRelatedIssues.click({ force: true })
  }

  /**
   * This function tests Edit States menu of popup
   */
  async checkEditStates (): Promise<void> {
    await this.buttonDefault.hover()
    await this.threeDotsDefault.click()
    await this.antiPopup.filter({ hasText: 'Edit states' }).click()
    await expect(this.settingsHeader).toBeVisible()
    await this.page.goBack()
    await expect(this.buttonDefault).toBeVisible()
  }

  /**
   * This function tests Open menu of popup
   */
  async checkOpenMenu (): Promise<void> {
    await this.buttonDefault.hover()
    await this.threeDotsDefault.click()
    await this.antiPopup.filter({ hasText: 'Open' }).click()
    await expect(this.buttonDefault).toBeVisible()
  }

  /**
   * This function test Archive menu of popup
   */
  async checkArchiveMenu (): Promise<void> {
    await this.buttonDefault.hover()
    await this.threeDotsDefault.click()
    await this.antiPopup.filter({ hasText: 'Archive' }).click()
    await expect(this.popupArchive).toBeVisible()
    await this.cancelButtonArchive.click()
  }
}
