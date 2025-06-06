import { expect, Locator, Page } from '@playwright/test'
import { CommonPage } from './common-page'

export type SidebarTabTypes = 'calendar' | 'office' | 'chat'

export class SidebarPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  sidebar = (): Locator => this.page.locator('#sidebar')
  content = (): Locator => this.sidebar().locator('.sidebar-content')
  contentHeaderByTitle = (title: string): Locator =>
    this.content().locator(`.hulyHeader-titleGroup:has-text("${title}")`)

  contentCloseButton = (): Locator => this.content().locator('.hulyHeader-container button.iconOnly').last()

  calendarSidebarButton = (): Locator => this.sidebar().locator('button[id$="Calendar"]')
  officeSidebarButton = (): Locator => this.sidebar().locator('button[id$="Office"]')
  chatSidebarButton = (): Locator => this.sidebar().locator('button[id$="Chat"]')

  verticalTabs = (): Locator => this.sidebar().locator('.tabs').locator('.container')
  verticalTabByName = (name: string): Locator =>
    this.sidebar().locator('.tabs').locator(`.container:has-text("${name}")`)

  verticalTabCloseButton = (name: string): Locator => this.verticalTabByName(name).locator('.close-button button')
  currentYear = new Date().getFullYear().toString()

  plannerSidebarNextDayButton = (): Locator =>
    this.sidebar().locator('.hulyHeader-buttonsGroup').getByRole('button').last()

  // buttonOpenChannelInSidebar =

  // Actions
  async checkIfSidebarIsOpen (isOpen: boolean): Promise<void> {
    await expect(this.content()).toBeVisible({ visible: isOpen, timeout: 1000 })
  }

  async checkIfSidebarHasVerticalTab (isExist: boolean, tabName: string): Promise<void> {
    await expect(this.verticalTabByName(tabName)).toBeVisible({ visible: isExist, timeout: 1000 })
  }

  async clickVerticalTab (tabName: string): Promise<void> {
    await this.verticalTabByName(tabName).click()
  }

  async closeVerticalTabByCloseButton (tabName: string): Promise<void> {
    await this.verticalTabCloseButton(tabName).click()
  }

  async closeOpenedVerticalTab (): Promise<void> {
    await this.contentCloseButton().click()
  }

  async pinVerticalTab (tabName: string): Promise<void> {
    await this.verticalTabByName(tabName).click({ button: 'right' })
    await this.page.locator('.popup').locator('button:has-text("Pin")').click()
  }

  async unpinVerticalTab (tabName: string): Promise<void> {
    await this.verticalTabByName(tabName).click({ button: 'right' })
    await this.page.locator('.popup').locator('button:has-text("Unpin")').click()
  }

  async closeVerticalTabByRightClick (tabName: string): Promise<void> {
    await this.verticalTabByName(tabName).click({ button: 'right' })
    await this.page.locator('.popup').locator('button:has-text("Close")').click()
  }

  async checkIfVerticalTabIsPinned (needBePinned: boolean, tabName: string): Promise<void> {
    await expect(this.verticalTabCloseButton(tabName)).toBeVisible({ visible: !needBePinned })
  }

  async checkNumberOfVerticalTabs (count: number): Promise<void> {
    await expect(this.verticalTabs()).toHaveCount(count)
  }

  async checkIfPlanerSidebarTabIsOpen (isExist: boolean): Promise<void> {
    await expect(this.contentHeaderByTitle(this.currentYear)).toBeVisible({ visible: isExist })
  }

  async checkIfChatSidebarTabIsOpen (isExist: boolean, channelName: string): Promise<void> {
    await expect(this.contentHeaderByTitle(channelName)).toBeVisible({ visible: isExist, timeout: 1000 })
  }

  async checkIfOfficeSidebarTabIsOpen (isExist: boolean, channelName: string): Promise<void> {
    await expect(this.contentHeaderByTitle('Office')).toBeVisible({ visible: isExist })
  }

  async checkIfSidebarPageButtonIsExist (isExist: boolean, type: SidebarTabTypes): Promise<void> {
    switch (type) {
      case 'chat':
        await expect(this.chatSidebarButton()).toBeVisible({ visible: isExist })
        break
      case 'office':
        await expect(this.officeSidebarButton()).toBeVisible({ visible: isExist })
        break
      case 'calendar':
        await expect(this.calendarSidebarButton()).toBeVisible({ visible: isExist })
        break
    }
  }

  async clickSidebarPageButton (type: SidebarTabTypes): Promise<void> {
    switch (type) {
      case 'chat':
        await this.chatSidebarButton().click()
        break
      case 'office':
        await this.officeSidebarButton().click()
        break
      case 'calendar':
        await this.calendarSidebarButton().click()
        break
    }
  }
}
