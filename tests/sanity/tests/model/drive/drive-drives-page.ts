import { expect, type Locator, type Page } from '@playwright/test'
import { ButtonDrivesContextMenu, Drive } from './types'
import { CommonPage } from '../common-page'

export class DrivesPage extends CommonPage {
  page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly buttonView = (): Locator =>
    this.page.locator('div.hulyHeader-container > .hulyHeader-buttonsGroup.before button[data-id="btn-viewOptions"]')

  readonly buttonHideArchived = (): Locator => this.page.locator('div.popup .toggle span.toggle-switch')
  readonly inputHideArchived = (): Locator => this.page.locator('div.popup .toggle input[type="checkbox"]')

  readonly cellDriveName = (driveName: string): Locator => this.page.getByRole('cell', { name: driveName }).first()

  readonly buttonContextMenu = (buttonText: ButtonDrivesContextMenu): Locator =>
    this.page.locator('div.antiPopup').getByRole('button', { name: buttonText })

  readonly popupCreateFolder = (): Locator => this.page.locator('div.popup form[id="drive:string:CreateFolder"]')

  readonly rowDrive = (driveName: string): Locator =>
    this.page.locator('tbody tr').filter({
      has: this.cellDriveName(driveName)
    })

  readonly buttonJoinDriveRow = (driveName: string): Locator =>
    this.rowDrive(driveName).locator('td').nth(2).getByRole('button', { name: 'Join' })

  readonly popupArchive = (): Locator => this.page.locator('.popup.endShow:text("archive")').first()

  readonly cellArchiveStatusYes = (driveName: string): Locator =>
    this.rowDrive(driveName).locator('td').last().locator(':text("Yes")')

  async checkDriveExists (drive: Drive): Promise<void> {
    await expect(this.cellDriveName(drive.name)).toBeVisible()
  }

  async checkDriveNotExists (drive: Drive): Promise<void> {
    await expect(this.cellDriveName(drive.name)).not.toBeVisible()
  }

  async clickButtonDriveContextMenu (drive: Drive, buttonText: ButtonDrivesContextMenu): Promise<void> {
    await this.cellDriveName(drive.name).click({ button: 'right' })
    await this.buttonContextMenu(buttonText).click()
  }

  async createFolder (drive: Drive, folderName: string): Promise<void> {
    await this.clickButtonDriveContextMenu(drive, 'Create folder')
    await this.popupCreateFolder().locator('input').fill(folderName)
    await this.popupCreateFolder().getByRole('button', { name: 'Create' }).last().click()
  }

  async clickEditDrive (drive: Drive): Promise<void> {
    await this.clickButtonDriveContextMenu(drive, 'Edit drive')
  }

  async archiveDrive (drive: Drive): Promise<void> {
    await this.clickButtonDriveContextMenu(drive, 'Archive')
    await this.popupSubmitButton().click()
    await this.popupArchive().waitFor({ state: 'detached' })
  }

  async unarchiveDrive (drive: Drive): Promise<void> {
    await this.clickButtonDriveContextMenu(drive, 'Unarchive')
    await this.popupSubmitButton().click()
    await this.popupArchive().waitFor({ state: 'detached' })
  }

  async disableHideArchived (): Promise<void> {
    await this.buttonView().click()
    await expect(this.buttonHideArchived()).toBeVisible()
    if (await this.inputHideArchived().isChecked()) {
      await this.buttonHideArchived().click()
      await expect(this.inputHideArchived()).not.toBeChecked()
    }
    await this.page.keyboard.press('Escape')
  }

  async checkIsArchived (drive: Drive): Promise<void> {
    await expect(this.cellArchiveStatusYes(drive.name)).toBeVisible()
  }

  async checkIsNotArchived (drive: Drive): Promise<void> {
    await expect(this.cellArchiveStatusYes(drive.name)).not.toBeVisible()
  }

  async leaveDrive (drive: Drive): Promise<void> {
    await this.clickButtonDriveContextMenu(drive, 'Leave')
  }

  async joinDrive (drive: Drive): Promise<void> {
    await this.clickButtonDriveContextMenu(drive, 'Join')
  }

  async checkUserJoinedDrive (drive: Drive): Promise<void> {
    await expect(this.buttonJoinDriveRow(drive.name)).not.toBeVisible()
  }

  async checkUserNotJoinedDrive (drive: Drive): Promise<void> {
    await this.buttonJoinDriveRow(drive.name).waitFor({ state: 'visible' })
  }

  async clickOnDrive (drive: Drive): Promise<void> {
    await this.cellDriveName(drive.name).locator('a').click()
  }
}
