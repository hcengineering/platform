import { type Locator, type Page } from '@playwright/test'
import { CalendarPage } from '../calendar-page'

export class DocumentCommonPage extends CalendarPage {
  readonly page: Page
  readonly inputMessageText: Locator
  readonly buttonMessageSend: Locator
  readonly buttonReleaseTab: Locator
  readonly buttonContentTab: Locator
  readonly buttonReasonAndImpactTab: Locator
  readonly buttonHistoryTab: Locator
  readonly inputPasswordConfirm: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputMessageText = page.locator('div.popup div.tiptap')
    this.buttonMessageSend = page.locator('div.popup button.primary')
    this.buttonReleaseTab = page.locator('div.tab', { hasText: 'Release' })
    this.buttonContentTab = page.locator('div.tab', { hasText: 'Content' })
    this.buttonReasonAndImpactTab = page.locator('div.tab', { hasText: 'Reason & Impact' })
    this.buttonHistoryTab = page.locator('div.tab', { hasText: 'History' })
    this.inputPasswordConfirm = page.locator('input[name="documents\\:string\\:Password"]')
  }

  async addMessage (message: string): Promise<void> {
    await this.inputMessageText.fill(message)
    await this.buttonMessageSend.click()
  }
}
