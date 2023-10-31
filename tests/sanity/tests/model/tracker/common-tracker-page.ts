import { Page } from '@playwright/test'
import { CalendarPage } from '../calendar-page'

export class CommonTrackerPage extends CalendarPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }
}
