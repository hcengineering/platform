import { type Locator, type Page } from '@playwright/test'

export class GitHubIntegrationPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  addButton = (): Locator => this.page.getByRole('button', { name: 'Add' }).nth(3)
  reAuthorizeButton = (): Locator => this.page.getByRole('button', { name: 'Re-authorize Huly GitHub App' })
  usernameField = (): Locator => this.page.getByLabel('Username or email address')
  passwordField = (): Locator => this.page.getByLabel('Password')
  signInButton = (): Locator => this.page.getByRole('button', { name: 'Sign in', exact: true })
  authorizeButton = (): Locator => this.page.getByRole('button', { name: 'Authorize Huly GitHub Staging' })
  githubRepositoriesLink = (): Locator => this.page.getByText('Github Repositories')
  installGithubAppButton = (): Locator => this.page.getByRole('button', { name: 'Install Github App' })
  installButton = (): Locator => this.page.getByRole('button', { name: 'Install' })
  okButton = (index: number = 0): Locator => this.page.getByRole('button', { name: 'Ok' }).nth(index)
  configureButton = (): Locator => this.page.getByRole('button', { name: 'Configure' })
  uninstallButton = (): Locator => this.page.getByRole('button', { name: 'Uninstall' })
  yourGithubAccountLink = (): Locator => this.page.getByText('Your Github account')

  async authorizeGitHub (): Promise<void> {
    await this.addButton().click({ force: true })
    const page1Promise = this.page.waitForEvent('popup')
    await this.reAuthorizeButton().click()
    const page1 = await page1Promise
    await page1.getByLabel('Username or email address').click()
    await page1.getByLabel('Username or email address').fill('testing.huly@gmail.com')
    await page1.getByLabel('Password').click()
    await page1.getByLabel('Password').fill('Smagadu1989!')
    await page1.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page1.getByRole('button', { name: 'Authorize Huly GitHub Staging' }).click()
  }

  async installGitHubApp (): Promise<void> {
    await this.githubRepositoriesLink().click()
    const page2Promise = this.page.waitForEvent('popup')
    await this.installGithubAppButton().click()
    const page2 = await page2Promise
    await page2.getByRole('button', { name: 'Install' }).click()
  }

  async completeGitHubIntegration (): Promise<void> {
    await this.okButton().click()
    await this.configureButton().click()
    await this.githubRepositoriesLink().click()
    await this.uninstallButton().click()
    await this.okButton(1).click()
    await this.yourGithubAccountLink().click()
    await this.okButton().click()
  }
}
