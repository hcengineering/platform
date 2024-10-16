import { expect, type Locator, type Page } from '@playwright/test'
import { PlatformURI } from '../utils'

export class LoginPage {
  readonly page: Page
  readonly inputEmail: Locator
  readonly inputPassword: Locator
  readonly buttonLogin: Locator
  readonly buttonSignUp: Locator
  readonly loginWithPassword: Locator
  readonly invalidPasswordMessage: Locator
  readonly accountNotFoundMessage: Locator
  constructor (page: Page) {
    this.page = page
    this.inputEmail = page.locator('input[name=email]')
    this.inputPassword = page.locator('input[name=current-password]')
    this.buttonLogin = page.locator('button', { hasText: 'Log In' })
    this.buttonSignUp = page.locator('a.title', { hasText: 'Sign Up' })
    this.loginWithPassword = page.locator('a', { hasText: 'Login with password' })
    this.invalidPasswordMessage = page.getByText('Invalid password')
    this.accountNotFoundMessage = page.getByText('Account not found')
  }

  async goto (): Promise<void> {
    await (await this.page.goto(`${PlatformURI}/login/login`))?.finished()
  }

  async login (email: string, password: string): Promise<void> {
    await this.inputEmail.fill(email)
    await this.inputPassword.fill(password)
    expect(await this.buttonLogin.isEnabled()).toBe(true)
    await this.buttonLogin.click()
  }

  async checkIfErrorMessageIsShown (message: string): Promise<void> {
    if (message === 'Invalid password') {
      await expect(this.invalidPasswordMessage).toContainText(message)
    }
    if (message === 'Account not found') {
      await expect(this.accountNotFoundMessage).toContainText(message)
    }
  }

  async clickOnLoginWithPassword (): Promise<void> {
    await this.loginWithPassword.click()
  }

  async checkIfUserIsLoggedIn (credentials: string): Promise<void> {
    if (credentials === 'wrong-password') {
      await expect(this.buttonLogin).toBeVisible()
      await expect(this.page.getByText('Invalid password')).toBeVisible()
    }

    if (credentials === 'wrong-email') {
      await expect(this.buttonLogin).toBeVisible()
      await expect(this.page.getByText('Account not found')).toBeVisible()
    }
    if (credentials === 'correct-credentials') {
      await expect(this.page.getByText('SanityTest')).toBeVisible()
    }
  }
}
