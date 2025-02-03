import { expect, type Locator, type Page } from '@playwright/test'
import { PlatformURI } from '../utils'

export class LoginPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  inputEmail = (): Locator => this.page.locator('input[name=email]')
  inputPassword = (): Locator => this.page.locator('input[name=current-password]')
  buttonLogin = (): Locator => this.page.locator('button', { hasText: 'Log In' })
  loginWithPassword = (): Locator => this.page.locator('a', { hasText: 'Login with password' })
  linkSignUp = (): Locator => this.page.locator('a.title', { hasText: 'Sign Up' })
  invalidCredentialsMessage = (): Locator => this.page.getByText('Account not found or the provided credentials are incorrect')
  recoverLink = (): Locator => this.page.getByRole('link', { name: 'Recover' })
  passwordRecovery = (): Locator => this.page.getByText('Password recovery')
  recoveryLoginText = (): Locator => this.page.getByText('Know your password? Log In')
  recoverySignUpText = (): Locator => this.page.getByText('Do not have an account? Sign Up')
  recoveryLogin = (): Locator => this.page.getByRole('link', { name: 'Log In' })
  recoverySignUp = (): Locator => this.page.getByRole('link', { name: 'Sign Up' })

  profileButton = (): Locator => this.page.locator('#profile-button')
  popupItemButton = (hasText: string): Locator => this.page.locator('div.popup button[class*="menu"]', { hasText })

  // ACTIONS
  async goto (): Promise<void> {
    await (await this.page.goto(`${PlatformURI}/login/login`))?.finished()
  }

  async clickSignUp (): Promise<void> {
    await this.linkSignUp().click()
  }

  async clickOnRecover (): Promise<void> {
    await this.recoverLink().click()
  }

  async clickOnRecoveryLogin (): Promise<void> {
    await this.recoveryLogin().click()
  }

  async clickOnRecoverySignUp (): Promise<void> {
    await this.recoverySignUp().click()
  }

  async login (email: string, password: string): Promise<void> {
    await this.loginWithPassword().click()
    await this.inputEmail().fill(email)
    await this.inputPassword().fill(password)
    expect(await this.buttonLogin().isEnabled()).toBe(true)
    await this.buttonLogin().click()
  }

  async openProfileMenu (): Promise<void> {
    await this.profileButton().click()
  }

  // ASSERTS

  async checkIfErrorMessageIsShown (message: string): Promise<void> {
    if (message === 'wrong-credentials') {
      await expect(this.invalidCredentialsMessage()).toBeVisible()
    }
  }

  async checkIfLoginButtonIsDisabled (): Promise<void> {
    await expect(this.buttonLogin()).toBeDisabled()
  }

  async checkIfPasswordRecoveryIsVisible (): Promise<void> {
    await expect(this.passwordRecovery()).toBeVisible()
    await expect(this.recoveryLoginText()).toBeVisible()
    await expect(this.recoverySignUpText()).toBeVisible()
  }
}
