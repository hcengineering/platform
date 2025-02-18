import { expect, type Locator, type Page } from '@playwright/test'
import { SignUpData } from './common-types'
import { CommonPage } from './common-page'

export class SignUpPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  signUpPasswordBtn = (): Locator => this.page.locator('a', { hasText: 'Sign up with password' })
  inputFirstName = (): Locator => this.page.locator('input[name="given-name"]')
  inputLastName = (): Locator => this.page.locator('input[name="family-name"]')
  inputEmail = (): Locator => this.page.locator('input[name="email"]')
  inputNewPassword = (): Locator => this.page.locator('//div[text()="Password"]/../input')
  inputRepeatPassword = (): Locator => this.page.locator('//div[text()="Repeat password"]/../input')
  buttonSignUp = (): Locator => this.page.locator('button', { hasText: 'Sign Up' })
  buttonJoin = (): Locator => this.page.locator('button', { hasText: 'Join' })

  async enterFirstName (firstName: string): Promise<void> {
    await this.inputFirstName().fill(firstName)
  }

  async enterLastName (lastName: string): Promise<void> {
    await this.inputLastName().fill(lastName)
  }

  async enterEmail (email: string): Promise<void> {
    await this.inputEmail().fill(email)
  }

  async enterPassword (password: string): Promise<void> {
    await this.inputNewPassword().fill(password)
  }

  async enterRepeatPassword (password: string): Promise<void> {
    await this.inputRepeatPassword().fill(password)
  }

  async clickSignUp (): Promise<void> {
    await this.buttonSignUp().click()
  }

  async signUpPwd (data: SignUpData, mode: 'join' | 'signup' = 'signup'): Promise<void> {
    const isOtp = await this.signUpPasswordBtn().isVisible()
    if (isOtp) {
      await this.signUpPasswordBtn().click()
    }
    await this.enterFirstName(data.firstName)
    await this.enterLastName(data.lastName)
    await this.enterEmail(data.email)
    await this.enterPassword(data.password)
    await this.enterRepeatPassword(data.password)
    switch (mode) {
      case 'join':
        expect(await this.buttonJoin().isEnabled()).toBe(true)
        await this.buttonJoin().click()
        break
      case 'signup':
        expect(await this.buttonSignUp().isEnabled()).toBe(true)
        await this.buttonSignUp().click()
    }
  }

  async checkIfSignUpButtonIsDisabled (): Promise<void> {
    await expect(this.buttonSignUp()).toBeDisabled()
  }
}
