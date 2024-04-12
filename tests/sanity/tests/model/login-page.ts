import { expect, type Locator, type Page } from '@playwright/test'
import { PlatformURI } from '../utils'

export class LoginPage {
  readonly page: Page
  readonly inputEmail: Locator
  readonly inputPassword: Locator
  readonly buttonLogin: Locator
  readonly linkSignUp: Locator
  readonly alrtWrongPass: string
  readonly alrtWrongAcc: string
  readonly alrtReqEmail: string
  readonly alrtReqPass: string

  constructor (page: Page) {
    this.page = page
    this.inputEmail = page.locator('input[name=email]')
    this.inputPassword = page.locator('input[name=current-password]')
    this.buttonLogin = page.locator('button', { hasText: 'Log In' })
    this.linkSignUp = page.locator('a.title', { hasText: 'Sign Up' })
    this.alrtWrongPass = 'Invalid password'
    this.alrtWrongAcc = 'Account not found'
    this.alrtReqEmail = 'Required field Email'
    this.alrtReqPass = 'Required field Password'
  }

  async goto (): Promise<void> {
    await (await this.page.goto(`${PlatformURI}/login/login`))?.finished()
  }

  async login (email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password)
    await this.isButtonLoginEnabled()
    await this.buttonLogin.click()
  }

  private async isAlertShown (msgAlert: string): Promise<void> {
    await expect.soft(this.page // Use soft assertion to check all the messages
      .getByText(msgAlert), 'Alert not shown: ' + msgAlert)
      .toBeVisible()
  }

  async fillCredentials (email: string, password: string): Promise<void> {
    await this.inputEmail.fill(email)
    await this.inputPassword.fill(password)
  }

  async isAlertWrongAccShown (): Promise<void> {
    await this.isAlertShown(this.alrtWrongAcc)
  }

  async isAlertWrongPassShown (): Promise<void> {
    await this.isAlertShown(this.alrtWrongPass)
  }

  async isAlertReqEmailShown (): Promise<void> {
    await this.isAlertShown(this.alrtReqEmail)
  }

  async isAlertReqPassShown (): Promise<void> {
    await this.isAlertShown(this.alrtReqPass)
  }

  async isButtonLoginEnabled (): Promise<void> {
    await expect(this.buttonLogin, 'Login button is not enabled').toBeEnabled()
  }

  async isButtonLoginDisabled (): Promise<void> {
    await expect(this.buttonLogin, 'Login button is not disabled').toBeDisabled()
  }
}
