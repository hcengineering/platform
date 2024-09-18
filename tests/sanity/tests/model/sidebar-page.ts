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
  content = (): Locator => this.sidebar().locator('.content')
  contentHeaderByTitle = (title: string): Locator => this.content().locator(`.hulyHeader-titleGroup:has-text("${title}")`)
  contentCloseButton = (): Locator => this.content().locator('.hulyHeader-container button.iconOnly').last()
  
  calendarSidebarButton = (): Locator => this.sidebar().locator('button[id$="Calendar"]')
  officeSidebarButton = (): Locator => this.sidebar().locator('button[id$="Office"]')
  chatSidebutButton = (): Locator => this.sidebar().locator('button[id$="Chat"]')
  
  verticalTabs = (): Locator => this.sidebar().locator('.tabs').locator('.container')
  verticalTabByName = (name: string): Locator => this.sidebar().locator('.tabs').locator(`.container:has-text("${name}")`)
  verticalTabCloseButton = (name: string): Locator => this.verticalTabByName(name).locator('.close-button button')
  
  // buttonOpenChannelInSidebar = 

  // Actions
  async checkIfSidebarIsOpen (needBeOpened: boolean): Promise<void> {
    if (needBeOpened) {
      await expect(this.content()).toBeVisible()
    } else {
      await expect(this.content()).toBeHidden()
    }
  }
  
  async checkIfSidebarHasVerticalTab (needBeExist: boolean, tabName: string): Promise<void> {
    if (needBeExist) {
      await expect(this.verticalTabByName(tabName)).toBeVisible()
    } else {
      await expect(this.verticalTabByName(tabName)).toBeHidden()
    }
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
    await this.verticalTabByName(tabName).click({button: 'right'})
    await this.page.locator('.popup').locator('button:has-text("Pin")').click()
  }
  
  async unpinVerticalTab (tabName: string): Promise<void> {
    await this.verticalTabByName(tabName).click({button: 'right'})
    await this.page.locator('.popup').locator('button:has-text("Unpin")').click()
  }
  
  async closeVerticalTabByRightClick (tabName: string): Promise<void> {
    await this.verticalTabByName(tabName).click({button: 'right'})
    await this.page.locator('.popup').locator('button:has-text("Close")').click()
  }
  
  async checkIfVerticalTabIsPinned (needBePinned: boolean, tabName: string): Promise<void> {
    if (needBePinned) {
      await expect(this.verticalTabCloseButton(tabName)).toBeHidden()
    } else {
      await expect(this.verticalTabCloseButton(tabName)).toBeVisible()
    }
  }
  
  async checkNumberOfVerticalTabs (count: number): Promise<void> {
    await expect(this.verticalTabs()).toHaveCount(count)
  }
  
  async checkIfSidebarTabIsOpen (type: SidebarTabTypes, tabName: string): Promise<void> {
    switch (type) {
      case 'chat':
        await expect(this.contentHeaderByTitle(tabName)).toBeVisible()
        break
      case 'office':
        await expect(this.contentHeaderByTitle('Office')).toBeVisible()
        break
      case 'calendar':
        const currentYear = new Date().getFullYear()
        await expect(this.contentHeaderByTitle(tabName)).toBeVisible()
        break
    }
  }
}
