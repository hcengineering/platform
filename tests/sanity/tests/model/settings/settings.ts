import { type Locator, type Page } from '@playwright/test'

export enum SettingsButtonType {
  AccountSettings,
  ChangePassword,
  Integrations,
  Notifications,
  Office
}

export class SettingsPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  accountSettings = (): Locator => this.page.getByRole('button', { name: 'Account settings' })
  changePassword = (): Locator => this.page.getByRole('button', { name: 'Change password' })
  integrations = (): Locator => this.page.getByRole('button', { name: 'Integrations' })
  notifications = (): Locator => this.page.getByRole('button', { name: 'Notifications' })
  office = (): Locator => this.page.getByRole('button', { name: 'Office' })

  async selectSettings (button: SettingsButtonType): Promise<void> {
    switch (button) {
      case SettingsButtonType.AccountSettings:
        await this.accountSettings().click()
        break
      case SettingsButtonType.ChangePassword:
        await this.changePassword().click()
        break
      case SettingsButtonType.Integrations:
        await this.integrations().click()
        break
      case SettingsButtonType.Notifications:
        await this.notifications().click()
        break
      case SettingsButtonType.Office:
        await this.office().click()
        break
      default:
        throw new Error('Unknown button type')
    }
  }
}
