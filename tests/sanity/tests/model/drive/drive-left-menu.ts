import { expect, type Locator, type Page } from '@playwright/test'
import { Drive } from './types'

export class DriveLeftMenu {
  page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly leftMenu = (): Locator => this.page.locator('.antiPanel-wrap__content.hulyNavPanel-container')
  readonly buttonCreateDrive = (): Locator => this.page.locator('button#tree-drives')
  readonly buttonUploadFiles = (): Locator => this.leftMenu().getByRole('button', { name: 'Upload files' })
  readonly buttonDrives = (): Locator => this.page.getByRole('link', { name: 'Drives' }).getByRole('button')
  readonly groupHeaderDrive = (): Locator => this.page.getByRole('button', { name: 'Drive', exact: true })
  readonly treeDrives = (): Locator => this.leftMenu().locator('#navGroup-tree-drives')
  readonly buttonDriveInTree = (drive: Drive): Locator =>
    this.treeDrives().locator('.hulyNavGroup-container').getByRole('button', { name: drive.name })

  readonly driveContainer = (drive: Drive): Locator =>
    this.treeDrives()
      .locator('.hulyNavGroup-container')
      .filter({
        has: this.page.locator(':scope').getByRole('button', { name: drive.name })
      })

  readonly buttonFolderInDrive = (drive: Drive, folder: string): Locator =>
    this.driveContainer(drive).getByRole('button', { name: folder })

  async clickCreateNewDrive (): Promise<void> {
    await this.groupHeaderDrive().hover()
    await this.buttonCreateDrive().click()
  }

  async clickDrives (): Promise<void> {
    await this.buttonDrives().click()
  }

  async checkFolderExists (drive: Drive, folder: string): Promise<void> {
    await expect(this.buttonFolderInDrive(drive, folder)).toBeVisible()
  }

  async clickUploadFiles (): Promise<void> {
    await this.buttonUploadFiles().click()
  }
}
