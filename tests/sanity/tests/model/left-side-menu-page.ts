import { type Locator, type Page, expect } from '@playwright/test'
import { CommonPage } from './common-page'

export class LeftSideMenuPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  buttonChunter = (): Locator => this.page.locator('button[id$="ApplicationLabelChunter"]')
  buttonContacts = (): Locator => this.page.locator('button[id$="Contacts"]')
  buttonTracker = (): Locator => this.page.locator('button[id$="TrackerApplication"]')
  buttonRecruiting = (): Locator => this.page.locator('[id="app-recruit\\:string\\:RecruitApplication"]')
  buttonNotification = (): Locator => this.page.locator('button[id$="Inbox"]')
  buttonDocuments = (): Locator => this.page.locator('button[id$="document:string:DocumentApplication"]')
  buttonPlanner = (): Locator => this.page.locator('button[id$="app-time:string:Planner"]')
  buttonTeam = (): Locator => this.page.locator('button[id$="app-time:string:Team"]')
  profileButton = (): Locator => this.page.locator('#profile-button')
  inviteToWorkspaceButton = (): Locator => this.page.locator('button:has-text("Invite to workspace")')
  getInviteLinkButton = (): Locator => this.page.locator('button:has-text("Get invite link")')
  clickCloseOnInviteLinkButton = (): Locator => this.page.getByRole('button', { name: 'Close' })

  // Actions
  async openProfileMenu (): Promise<void> {
    await this.profileButton().click()
  }

  async inviteToWorkspace (): Promise<void> {
    await this.inviteToWorkspaceButton().click()
  }

  async getInviteLink (): Promise<void> {
    await this.getInviteLinkButton().click()
  }

  async clickChunter (): Promise<void> {
    await this.buttonChunter().click()
  }

  async clickContacts (): Promise<void> {
    await this.buttonContacts().click()
  }

  async clickTracker (): Promise<void> {
    await this.buttonTracker().click()
  }

  async clickNotification (): Promise<void> {
    await this.buttonNotification().click()
  }

  async clickDocuments (): Promise<void> {
    await this.buttonDocuments().click()
  }

  async clickPlanner (): Promise<void> {
    await this.buttonPlanner().click()
  }

  async clickTeam (): Promise<void> {
    await this.buttonTeam().click()
  }

  async clickRecruiting (): Promise<void> {
    await this.buttonRecruiting().click()
  }

  async clickOnCloseInvite (): Promise<void> {
    await this.clickCloseOnInviteLinkButton().click()
  }

  // Retrieve the last token from local storage
  async getLastToken (): Promise<string> {
    return await this.page.evaluate(() => localStorage.getItem('login:metadata:LastToken') ?? '')
  }

  // Set the last token in local storage on the same page
  async setLastToken (lastToken: string): Promise<void> {
    await this.page.evaluate((token) => {
      localStorage.setItem('login:metadata:LastToken', token)
    }, lastToken)
  }

  // Set the last token in local storage on any specified page
  async setLastTokenOnPage (targetPage: Page, lastToken: string): Promise<void> {
    await targetPage.evaluate((token) => {
      localStorage.setItem('login:metadata:LastToken', token)
    }, lastToken)
  }

  // Assert that the last token is not empty
  async verifyLastTokenNotEmpty (): Promise<void> {
    const lastToken = await this.getLastToken()
    expect(lastToken).not.toEqual('')
  }
}
