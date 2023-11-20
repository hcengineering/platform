import { expect, type Locator, type Page } from '@playwright/test'

export class SignupPage {
  readonly page: Page
  readonly inputFirstName: Locator
  readonly inputLastName: Locator
  readonly inputEmail: Locator
  readonly inputPassword: Locator
  readonly inputRepeatPassword: Locator
  readonly buttonSignup: Locator
  readonly textError: Locator

  constructor (page: Page) {
    this.page = page
    this.inputFirstName = page.locator('input[name="given-name"]')
    this.inputLastName = page.locator('input[name="family-name"]')
    this.inputEmail = page.locator('input[name="email"]')
    this.inputPassword = page.locator('input[name="new-password"]').nth(0)
    this.inputRepeatPassword = page.locator('input[name="new-password"]').nth(1)
    this.buttonSignup = page.locator('div.form-row > button', { hasText: 'Sign Up' })
    this.textError = page.locator('div.ERROR span')
  }

  async signup (firstname: string, lastname: string, email: string, password: string): Promise<void> {
    await this.inputFirstName.fill(firstname)
    await this.inputLastName.fill(lastname)
    await this.inputEmail.fill(email)
    await this.inputPassword.fill(password)
    await this.inputRepeatPassword.fill(password)
    expect(await this.buttonSignup.isEnabled()).toBe(true)
    await this.buttonSignup.click()
  }
}
