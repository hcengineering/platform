import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'
import { SignUpData } from './common-types'

export class SignInJoinPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  inputEmail = (): Locator => this.page.locator('input[name="email"]')
  inputPassword = (): Locator => this.page.locator('//div[text()="Password"]/../input')
  buttonJoin = (): Locator => this.page.locator('button', { hasText: 'Join' })

  async join (data: Pick<SignUpData, 'email' | 'password'>): Promise<void> {
    await this.buttonJoin().click()
    await this.inputEmail().fill(data.email)
    await this.inputPassword().fill(data.password)
    expect(await this.buttonJoin().isEnabled()).toBe(true)
    await this.buttonJoin().click()
  }
}
