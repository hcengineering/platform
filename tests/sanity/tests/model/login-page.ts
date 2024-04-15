import { expect, type Locator, type Page } from '@playwright/test'
import { PlatformURI } from '../utils'
import { SelectWorkspacePage } from './select-workspace-page'

export class LoginPage {
  readonly page: Page
  static loginRoute = '/login/login'
  readonly inputEmail: Locator
  readonly inputPassword: Locator
  readonly buttonLogin: Locator
  readonly linkSignUp: Locator

  constructor(page: Page) {
    this.page = page
    this.inputEmail = page.locator('input[name=email]')
    this.inputPassword = page.locator('input[name=current-password]')
    this.buttonLogin = page.getByRole('button', { name: 'Log In' })
    this.linkSignUp = page.getByRole('link', { name: 'Sign Up' })
  }

  async visitLoginRoute(): Promise<void> {
    await (await this.page.goto(`${PlatformURI}${LoginPage.loginRoute}`))?.finished()
  }

  async login(email: string, password: string, path?: string): Promise<void> {
    await this.inputEmail.fill(email)
    await this.inputPassword.fill(password)
    expect(await this.buttonLogin.isEnabled()).toBe(true)
    await this.buttonLogin.click()
    const selectWorkspacePage = new SelectWorkspacePage(this.page)
    await selectWorkspacePage.selectWorkspace('SanityTest')
    await this.page.context().storageState({ path })
  }
}
