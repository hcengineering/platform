import { IssuesPage } from './issues-page'
import { type Locator, type Page, expect } from '@playwright/test'
import path from 'path'

export class PublicLinkPopup extends IssuesPage {
  readonly page: Page
  readonly textPublicLink: Locator
  readonly buttonRevoke: Locator
  readonly buttonCopy: Locator
  readonly buttonClose: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.textPublicLink = page.locator('form[id="guest:string:PublicLink"] div.link')
    this.buttonRevoke = page.locator('form[id="guest:string:PublicLink"] button', { hasText: 'Revoke'})
    this.buttonCopy = page.locator('form[id="guest:string:PublicLink"] button', { hasText: 'Copy'})
    this.buttonClose = page.locator('form[id="guest:string:PublicLink"] button', { hasText: 'Close'})
  }

  async getPublicLink (): Promise<string> {
    const link = await this.textPublicLink.textContent()
    expect(link).toContain('http')
    return link ? link : ''
  }
}
