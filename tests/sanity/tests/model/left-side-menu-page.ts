//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { expect, type Locator, type Page } from '@playwright/test'
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
  buttonNotification = (): Locator => this.page.locator('button[id$="app-notification:string:Inbox"]')
  buttonDocuments = (): Locator => this.page.locator('button[id$="document:string:DocumentApplication"]')
  buttonPlanner = (): Locator => this.page.locator('button[id$="app-time:string:Planner"]')
  buttonTeam = (): Locator => this.page.locator('button[id$="app-time:string:Team"]')
  profileButton = (): Locator => this.page.locator('#profile-button')
  inviteToWorkspaceButton = (): Locator => this.page.locator('button:has-text("Invite to workspace")')
  getInviteLinkButton = (): Locator => this.page.locator('button:has-text("Get invite link")')
  inviteLink = (): Locator => this.page.getByTestId('invite-link')
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

  /** Read the generated invitation URL after checking that it is ready and valid. */
  async readInviteLink (): Promise<string> {
    const link = this.inviteLink()
    await expect(link).toBeVisible()
    await expect(link).toHaveText(/^https?:\/\/.+\/login\/join\?.*inviteId=\d+/)
    return ((await link.textContent()) ?? '').trim()
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
}
