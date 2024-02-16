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
    await this.inputFirstName.fill(data.firstName)
    await this.inputLastName.fill(data.lastName)
    await this.inputEmail.fill(data.email)
    await this.inputNewPassword.fill(data.password)
    await this.inputRepeatPassword.fill(data.password)
    switch (mode) {
      case 'join':
        expect(await this.buttonJoin.isEnabled()).toBe(true)
        await this.buttonJoin.click()
        break
      case 'signup':
        expect(await this.buttonSignUp.isEnabled()).toBe(true)
        await this.buttonSignUp.click()
    }
  }
}
