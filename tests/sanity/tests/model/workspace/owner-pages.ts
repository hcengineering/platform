import { expect, type Locator, type Page } from '@playwright/test'

export class OwnersPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  owner = (ownerName: string): Locator => this.page.getByRole('link', { name: ownerName })
  spacesAdminText = (): Locator => this.page.getByText('Admin Members')
  addMemberButton = (): Locator => this.page.getByRole('button', { name: 'Members' })
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
    await expect(this.spacesAdminText()).toBeVisible()
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
