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

export class OwnersPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  owner = (ownerName: string): Locator => this.page.getByRole('table').getByRole('row').filter({ hasText: ownerName })
  adminRoleRow = (): Locator =>
    this.page
      .locator('.spaceRolesPanel .antiGrid-row')
      .filter({ has: this.page.locator('.antiGrid-row__header', { hasText: /^Admin$/ }) })

  addMemberButton = (): Locator => this.adminRoleRow().getByRole('button', { name: 'Members' })

  selectMember = (memberName: string): Locator => this.page.getByRole('button', { name: memberName })
  workspaceLogo = (): Locator => this.page.locator('.hulyComponent .hulyAvatar-container')
  publicTemplate = (): Locator => this.page.getByText('Public templates')
  createTemplate = (): Locator => this.page.getByRole('button', { name: 'CREATE TEMPLATE' })
  saveTemplate = (): Locator => this.page.getByRole('button', { name: 'Save template' })
  newTemplateName = (): Locator => this.page.getByPlaceholder('New template')
  templateName = (name: string): Locator => this.page.locator('span').filter({ hasText: name })
  createEnum = (): Locator => this.page.getByRole('button', { name: 'Create enum' })
  addEnum = (): Locator => this.page.locator('.buttons-group > button:nth-child(2)')
  enterEnumTitle = (): Locator => this.page.getByPlaceholder('Enum title')
  enterEnumName = (): Locator => this.page.getByPlaceholder('Enter option title')
  saveButton = (): Locator => this.page.getByRole('button', { name: 'Save' })
  createdEnum = (name: string): Locator => this.page.getByRole('button', { name: `${name} 1 option` })
  enum = (name: string): Locator => this.page.getByRole('button', { name })
  linkValidFor = (): Locator => this.page.getByRole('spinbutton')
  emailMask = (): Locator => this.page.getByRole('textbox', { name: 'Type text...' })
  noLimitToggleButton = (): Locator => this.page.locator('label span')
  avatarLarge = (): Locator => this.page.locator('.hulyAvatarSize-medium.ava-image')

  async addMember (memberName: string): Promise<void> {
    await expect(this.adminRoleRow()).toBeVisible()
    await this.addMemberButton().click()
    await this.selectMember(memberName).click()
    await this.page.keyboard.press('Escape')
    await expect(this.selectMember(memberName)).toBeVisible()
  }

  async clickOnWorkspaceLogo (): Promise<void> {
    await this.workspaceLogo().click()
  }

  async checkIfOwnerExists (ownerName: string): Promise<void> {
    await expect(this.owner(ownerName)).toBeVisible()
    await expect(this.owner(ownerName).getByRole('button', { name: 'Owner', exact: true })).toBeVisible()
  }

  async createTemplateWithName (templateName: string): Promise<void> {
    await expect(this.publicTemplate()).toBeVisible()
    await this.createTemplate().click()
    await this.newTemplateName().fill(templateName)
    await this.saveTemplate().click()
    await expect(this.templateName(templateName)).toBeVisible()
  }

  async createEnumWithName (enumTitle: string, enumName: string): Promise<void> {
    await this.createEnum().click()
    await this.enterEnumTitle().fill(enumTitle)
    await this.addEnum().click()
    await this.enterEnumName().fill(enumName)
    await this.page.keyboard.press('Enter')
    await this.saveButton().click()
    await expect(this.createdEnum(enumTitle)).toBeVisible()
    await this.createdEnum(enumTitle).click()
    await expect(this.enum(enumName)).toBeVisible()
  }

  async saveUploadedLogo (): Promise<void> {
    await this.saveButton().nth(1).click()
    await this.saveButton().nth(0).click()
  }

  async checkIfPictureIsUploaded (): Promise<void> {
    await expect(this.avatarLarge()).toBeVisible()
    await expect(this.avatarLarge()).toHaveAttribute('src')
  }
}
