import { expect, type Locator, type Page } from '@playwright/test'
import { SignUpData } from './common-types'
import { CommonPage } from './common-page'

export class SignUpPage extends CommonPage {
  readonly page: Page
  readonly inputFirstName: Locator
  readonly inputLastName: Locator
  readonly inputEmail: Locator
  readonly inputNewPassword: Locator
  readonly inputRepeatPassword: Locator
  readonly buttonSignUp: Locator
  readonly buttonJoin: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.inputFirstName = page.locator('input[name="given-name"]')
    this.inputLastName = page.locator('input[name="family-name"]')
    this.inputEmail = page.locator('input[name="email"]')
    this.inputNewPassword = page.locator('//div[text()="Password"]/../input')
    this.inputRepeatPassword = page.locator('//div[text()="Repeat password"]/../input')
    this.buttonSignUp = page.locator('button', { hasText: 'Sign Up' })
    this.buttonJoin = page.locator('button', { hasText: 'Join' })
  }

  async signUp (data: SignUpData, mode: 'join' | 'signup' = 'signup'): Promise<void> {
    const { firstName, lastName, email, password } = data

    await this.inputFirstName.fill(firstName)
    await this.inputLastName.fill(lastName)
    await this.inputEmail.fill(email)
    await this.inputNewPassword.fill(password)
    await this.inputRepeatPassword.fill(password)
    const button = mode === 'join' ? this.buttonJoin : this.buttonSignUp
    expect(await button.isEnabled()).toBe(true)
    await button.click()
  }
}
