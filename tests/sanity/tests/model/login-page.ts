import { expect, type Locator, type Page } from '@playwright/test'
import { PlatformURI } from '../utils'

export class LoginPage {
  readonly page: Page
  readonly inputEmail: Locator
  readonly inputPassword: Locator
  readonly buttonLogin: Locator
  readonly linkSignUp: Locator
  readonly incorrectEmailTxt: Locator
  readonly incorrectPasswordTxt: Locator

  constructor(page: Page) {
    this.page = page
    this.inputEmail = page.locator('input[name=email]')
    this.inputPassword = page.locator('input[name=current-password]')
    this.buttonLogin = page.locator('button', { hasText: 'Log In' })
    this.linkSignUp = page.locator('a.title', { hasText: 'Sign Up' })
    this.incorrectEmailTxt = page.locator('a.text-sm', { hasText: 'Account not found' })
    this.incorrectPasswordTxt = page.locator('a.text-sm', { hasText: 'Invalid password' })
  }

  async goto(): Promise<void> {
    await (await this.page.goto(`${PlatformURI}/login/login`))?.finished()
  }

  async login(email: string, password: string): Promise<void> {
    await this.inputEmail.fill(email)
    await this.inputPassword.fill(password)
    expect(await this.buttonLogin.isEnabled()).toBe(true)
    await this.buttonLogin.click()
  }

  async incorrectEmailTxtVisible() {
    const incorrectEmailTxt = this.incorrectEmailTxt
    return await incorrectEmailTxt.isVisible()
  }

  async incorrectPasswordTxtVisible() {
    const incorrectPasswordTxt = this.incorrectPasswordTxt
    return await incorrectPasswordTxt.isVisible()
  }

  async verifyURL() {
    await expect(this.page).toHaveURL(/login/)
  }
}
