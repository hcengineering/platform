import { expect, type Locator, type Page } from '@playwright/test'
import { NewComponent } from './types'
import { CommonTrackerPage } from './common-tracker-page'

export class ComponentsPage extends CommonTrackerPage {
  readonly page: Page
  readonly buttonNewComponent: Locator
  readonly inputNewComponentModalComponentName: Locator
  readonly inputNewComponentModalComponentDescription: Locator
  readonly buttonNewComponentModalComponentLead: Locator
  readonly buttonNewComponentModalComponentCreate: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonNewComponent = page.locator('button[type="submit"] span', { hasText: 'Component' })
    this.inputNewComponentModalComponentName = page.locator('form[id="tracker:string:NewComponent"] input')
    this.inputNewComponentModalComponentDescription = page.locator('form[id="tracker:string:NewComponent"] div.tiptap')
    this.buttonNewComponentModalComponentLead = page.locator(
      'form[id="tracker:string:NewComponent"] div.antiCard-pool button[type="button"]'
    )
    this.buttonNewComponentModalComponentCreate = page.locator(
      'form[id="tracker:string:NewComponent"] button[type="submit"]'
    )
  }

  async createNewComponent (data: NewComponent): Promise<void> {
    await this.buttonNewComponent.click()
    await this.inputNewComponentModalComponentName.fill(data.name)
    if (data.description != null) {
      await this.inputNewComponentModalComponentDescription.fill(data.description)
    }
    if (data.lead != null) {
      await this.buttonNewComponentModalComponentLead.click()
      await this.selectMenuItem(this.page, data.lead)
    }
    await this.buttonNewComponentModalComponentCreate.click()
  }

  async openComponentByName (componentName: string): Promise<void> {
    await this.page.locator('div.row a', { hasText: componentName }).click()
  }

  async checkComponentNotExist (componentName: string): Promise<void> {
    await expect(this.page.locator('div.row a', { hasText: componentName })).toHaveCount(0)
  }
}
