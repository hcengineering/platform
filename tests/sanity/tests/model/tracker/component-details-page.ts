import { expect, type Locator, type Page } from '@playwright/test'
import { NewComponent } from './types'
import { CommonTrackerPage } from './common-tracker-page'

export class ComponentsDetailsPage extends CommonTrackerPage {
  readonly page: Page
  readonly inputComponentName: Locator
  readonly inputComponentDescription: Locator
  readonly buttonLead: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputComponentName = page.locator('div.antiEditBox input')
    this.inputComponentDescription = page.locator('div.textInput div.tiptap')
    this.buttonLead = page.locator('//span[text()="Lead"]/following-sibling::div[1]/div/button')
  }

  async editComponent (data: NewComponent): Promise<void> {
    if (data.name != null) {
      await this.inputComponentName.fill(data.name)
    }
    if (data.description != null) {
      await this.inputComponentDescription.fill(data.description)
    }
    if (data.lead != null) {
      await this.buttonLead.click()
      await this.selectMenuItem(this.page, data.lead)
    }
  }

  async checkComponent (data: NewComponent): Promise<void> {
    await expect(this.inputComponentName).toHaveValue(data.name)
    if (data.description != null) {
      await expect(this.inputComponentDescription).toHaveText(data.description)
    }
    if (data.lead != null) {
      await expect(this.buttonLead).toHaveText(data.lead)
    }
  }

  async deleteComponent (): Promise<void> {
    await this.buttonMoreActions.click()
    await this.selectFromDropdown(this.page, 'Delete')
    await this.pressYesDeletePopup(this.page)
  }
}
