import { expect, type Locator, type Page } from '@playwright/test'
import { ButtonFilesContextMenu } from './types'
import { CommonPage } from '../common-page'

export class DriveFilesPage extends CommonPage {
  page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly leftMenu = (): Locator => this.page.locator('.antiPanel-wrap__content.hulyNavPanel-container')
  readonly buttonConfirmUpload = (): Locator => this.page.locator('.popup button').last()
  readonly linkFile = (fileName: string): Locator => this.page.locator(`td:has(span:text-is("${fileName}")) a`).first()
  readonly buttonContextMenu = (buttonText: ButtonFilesContextMenu): Locator =>
    this.page.locator('div.antiPopup').getByRole('button', { name: buttonText })

  async checkFileExists (fileName: string): Promise<void> {
    await expect(this.linkFile(fileName)).toBeVisible()
  }

  async checkFileNotExists (fileName: string): Promise<void> {
    await expect(this.linkFile(fileName)).not.toBeVisible()
  }

  async clickFilesContextMenu (fileName: string, buttonText: ButtonFilesContextMenu): Promise<void> {
    await this.linkFile(fileName).click({ button: 'right' })
    await this.buttonContextMenu(buttonText).click()
  }

  async renameFile (fileName: string, newFileName: string): Promise<void> {
    await this.clickFilesContextMenu(fileName, 'Rename')
    await this.page.locator('.popup input').fill(newFileName)
    await this.pressYesForPopup(this.page)
  }

  async deleteFile (fileName: string): Promise<void> {
    await this.clickFilesContextMenu(fileName, 'Delete')
    await this.pressYesForPopup(this.page)
  }
}
