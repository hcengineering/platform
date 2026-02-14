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
  buttonSubmit = (): Locator => this.page.locator('button[data-id="join-form-submit"]')
  buttonToggle = (): Locator => this.page.locator('button[data-id="join-form-toggle"]')
  buttonJoinWithThisAccount = (): Locator => this.page.locator('button[data-id="join-with-this-account"]')
  buttonUseDifferentAccount = (): Locator => this.page.locator('button[data-id="join-use-different-account"]')

  async join (data: Pick<SignUpData, 'email' | 'password'>): Promise<void> {
    const submitBtn = this.buttonSubmit()
    const toggleBtn = this.buttonToggle()
    const joinWithAccountBtn = this.buttonJoinWithThisAccount()

    if (await joinWithAccountBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.buttonUseDifferentAccount().click()
    }

    const submitText = await submitBtn.textContent().catch(() => '')
    if (submitText != null && submitText.toLowerCase().includes('sign up')) {
      await toggleBtn.click()
    }
    await this.inputEmail().fill(data.email)
    await this.inputPassword().fill(data.password)
    await expect(this.buttonSubmit()).toBeEnabled()
    await this.buttonSubmit().click()
  }
}
