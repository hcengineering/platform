import { expect, Page, Locator } from '@playwright/test'

export class UserProfilePage {
  private readonly page: Page

  // Locators using lambda functions
  profileButton = (): Locator => this.page.locator('#profile-button')
  locationInput = (): Locator => this.page.locator('[placeholder="Location"]')
  phoneContactInput = (): Locator => this.page.locator('.search')
  phonePopupButton = (): Locator => this.page.locator('.popup button:has-text("Phone")')
  applyChangesButton = (): Locator => this.page.locator('.editor-container button:nth-child(3)')
  addSocialLinksButton = (): Locator => this.page.locator('[id="presentation:string:AddSocialLinks"]')
  selectProfile = (name: string): Locator => this.page.locator(`text=${name}`)
  leaveWorkspaceButton = (): Locator => this.page.getByRole('button', { name: 'Leave workspace' })
  leaveWorkspaceCancelButton = (): Locator => this.page.getByRole('button', { name: 'Cancel' })
  leaveWorkspaceConfirmButton = (): Locator => this.page.getByRole('button', { name: 'Ok', exact: true })
  accountDissabledMessage = (): Locator => this.page.getByRole('heading')
  changeAccount = (): Locator => this.page.getByRole('link', { name: 'Change account' })
  settings = (): Locator => this.page.getByRole('button', { name: 'Settings' })
  accountSettings = (): Locator => this.page.getByRole('button', { name: 'Account settings' })
  userAvatarMenu = (): Locator => this.page.locator('.mr-8 > .cursor-pointer')
  savaAvatarButton = (): Locator => this.page.getByRole('button', { name: 'Save' }).nth(1)
  selectWorkspace = (): Locator => this.page.getByRole('button', { name: 'Select workspace' })
  changePasswordButton = (): Locator => this.page.getByRole('button', { name: 'Change password' })
  currentPassword = (): Locator => this.page.getByPlaceholder('Enter current password')
  newPassword = (): Locator => this.page.getByPlaceholder('Enter new password')
  repeatPassword = (): Locator => this.page.getByPlaceholder('Repeat new password')
  savePassword = (): Locator => this.page.getByRole('button', { name: 'Save' })
  savedButton = (): Locator => this.page.getByRole('button', { name: 'Saved' })
  signOutButton = (): Locator => this.page.getByRole('button', { name: 'Sign out' })
  notificationsButton = (): Locator => this.page.getByRole('button', { name: 'Notifications' })

  constructor (page: Page) {
    this.page = page
  }

  async gotoProfile (workspaceUrl: string): Promise<void> {
    const response = await this.page.goto(workspaceUrl)
    if (response === null || response === undefined) {
      throw new Error(`Failed to navigate to ${workspaceUrl}`)
    }
    await response.finished()
  }

  async openProfileMenu (): Promise<void> {
    await expect(this.profileButton()).toBeVisible()
    await this.profileButton().click()
  }

  async clickSelectWorkspace (): Promise<void> {
    await this.selectWorkspace().click()
  }

  async clickSettings (): Promise<void> {
    await this.settings().click()
  }

  async clickAccountSettings (): Promise<void> {
    await this.accountSettings().click()
  }

  async openUserAvatarMenu (): Promise<void> {
    await this.userAvatarMenu().click()
  }

  async clickSavaAvatarButton (): Promise<void> {
    await this.savaAvatarButton().click()
  }

  async clickChangeAccount (): Promise<void> {
    await this.changeAccount().click()
  }

  async clickLeaveWorkspaceButton (): Promise<void> {
    await this.leaveWorkspaceButton().click()
  }

  async clickLeaveWorkspaceConfirmButton (): Promise<void> {
    await this.leaveWorkspaceConfirmButton().click()
  }

  async clickLeaveWorkspaceCancelButton (): Promise<void> {
    await this.leaveWorkspaceCancelButton().click()
  }

  async selectProfileByName (name: string): Promise<void> {
    await this.selectProfile(name).click()
    await this.page.waitForTimeout(1000)
  }

  async verifyProfilePageUrl (expectedUrl: string): Promise<void> {
    await expect(this.page).toHaveURL(expectedUrl)
  }

  async updateLocation (newLocation: string): Promise<void> {
    await this.locationInput().click()
    await this.locationInput().fill(newLocation)
  }

  async clickOnNotificationsButton (): Promise<void> {
    await this.notificationsButton().click()
  }

  async changePassword (currentPassword: string, newPassword: string): Promise<void> {
    await this.changePasswordButton().click()
    await this.currentPassword().fill(currentPassword)
    await expect(this.savePassword()).toBeDisabled()
    await this.newPassword().fill(newPassword)
    await expect(this.savePassword()).toBeDisabled()
    await this.repeatPassword().fill(newPassword)
    await this.savePassword().click()
    await expect(this.savedButton()).toBeDisabled()
  }

  async clickOnSignOutButton (): Promise<void> {
    await this.signOutButton().click()
  }

  async addOrEditPhone (): Promise<void> {
    if ((await this.phoneContactInput().count()) === 0) {
      await this.addSocialLinksButton().click()
      await this.phonePopupButton().click()
    } else {
      await this.phoneContactInput().click()
    }
    await this.phoneContactInput().fill('+1 555 333 7777')
  }

  async applyChanges (): Promise<void> {
    await this.applyChangesButton().click()
  }

  async checkIfAccountIsDisabled (): Promise<void> {
    await expect(this.accountDissabledMessage()).toContainText('Account is disabled')
  }
}
