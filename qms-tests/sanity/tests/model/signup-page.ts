import { type Locator, type Page } from '@playwright/test'
import { UserSignUp } from './types'

export class SignupPage {
  readonly page: Page
  readonly inputFirstName: Locator
  readonly inputLastName: Locator
  readonly inputEmail: Locator
  readonly inputNewPassword: Locator
  readonly inputRepeatNewPassword: Locator
  readonly buttonSignUp: Locator
  readonly textError: Locator

  constructor (page: Page) {
    this.page = page
    this.inputFirstName = page.locator('input[name="given-name"]')
    this.inputLastName = page.locator('input[name="family-name"]')
    this.inputEmail = page.locator('input[name="email"]')
    this.inputNewPassword = page.locator('input[name="new-password"]').nth(0)
    this.inputRepeatNewPassword = page.locator('input[name="new-password"]').nth(1)
    this.buttonSignUp = page.locator('div.send button')
    this.textError = page.locator('div.ERROR > span')
  }

  async signupPwd (userData: UserSignUp): Promise<void> {
    await this.inputFirstName.fill(userData.firstName)
    await this.inputLastName.fill(userData.lastName)
    await this.inputEmail.fill(userData.email)
    await this.inputNewPassword.fill(userData.password)
    await this.inputRepeatNewPassword.fill(userData.password)
  }
}
