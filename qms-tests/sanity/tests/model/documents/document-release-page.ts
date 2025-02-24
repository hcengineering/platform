import { type Locator, type Page } from '@playwright/test'
import { DocumentCommonPage } from './document-common-page'

export class DocumentReleasePage extends DocumentCommonPage {
  readonly page: Page
  readonly buttonReleaseTabSelected: Locator
  readonly buttonMakeEffectiveOn: Locator
  readonly buttonDateTimeButton: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonReleaseTabSelected = page.locator('div.tab.selected', { hasText: 'Release' })
    this.buttonMakeEffectiveOn = page.locator('label[for="documents:string:EffectiveOn"]')
    this.buttonDateTimeButton = page.locator('label[for="documents:string:EffectiveOn"] button.datetime-button')
  }

  async setEffectiveDate (delayTime: string): Promise<void> {
    await this.buttonDateTimeButton.click()
    await this.fillSelectDateByShortcut(delayTime)
  }
}
