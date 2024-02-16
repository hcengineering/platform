import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'
import { SignUpData } from './common-types'

export class SignInJoinPage extends CommonPage {
  readonly page: Page
  readonly inputEmail: Locator
  readonly inputPassword: Locator
  readonly buttonJoin: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.inputEmail = page.locator('input[name="email"]')
    this.inputPassword = page.locator('//div[text()="Password"]/../input')
    this.buttonJoin = page.locator('button', { hasText: 'Join' })
  }

  async join (data: Pick<SignUpData, 'email' | 'password'>): Promise<void> {
    await this.inputEmail.fill(data.email)
    await this.inputPassword.fill(data.password)
    expect(await this.buttonJoin.isEnabled()).toBe(true)
    await this.buttonJoin.click()
  }
}
