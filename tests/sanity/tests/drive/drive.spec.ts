import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI, uploadFile } from '../utils'
import { Drive } from '../model/drive/types'
import { faker } from '@faker-js/faker'
import { DriveLeftMenu } from '../model/drive/drive-left-menu'
import { DriveCreateEditPopup } from '../model/drive/drive-create-edit-popup'
import { DrivesPage } from '../model/drive/drive-drives-page'
import { DriveFilesPage } from '../model/drive/drive-files-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Drive tests', () => {
  let leftMenu: DriveLeftMenu
  let popupDrive: DriveCreateEditPopup
  let drivesPage: DrivesPage
  let filesPage: DriveFilesPage
  let drive: Drive

  test.beforeEach(async ({ page }) => {
    popupDrive = new DriveCreateEditPopup(page)
    leftMenu = new DriveLeftMenu(page)
    drivesPage = new DrivesPage(page)
    filesPage = new DriveFilesPage(page)
    drive = {
      name: faker.word.noun()
    }
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/drive`))?.finished()
    await leftMenu.clickCreateNewDrive()
    await popupDrive.createOrEditDrive(drive)
    await leftMenu.clickDrives()
  })

  test('Check if drive exists at drives page', async () => {
    await drivesPage.checkDriveExists(drive)
  })

  test('Create new folder, check if folder exists in drive tree', async () => {
    const folder = faker.word.noun()
    await drivesPage.createFolder(drive, folder)
    await leftMenu.checkFolderExists(drive, folder)
  })

  test('Edit drive, rename drive, check if it was renamed', async () => {
    const newDrive: Drive = {
      name: faker.word.noun()
    }
    await drivesPage.clickEditDrive(drive)
    await popupDrive.createOrEditDrive(newDrive)
    await drivesPage.checkDriveExists(newDrive)
    await drivesPage.checkDriveNotExists(drive)
  })

  test('Archive/unarchive drive, check drive archive status', async () => {
    await drivesPage.disableHideArchived()
    await drivesPage.archiveDrive(drive)
    await drivesPage.checkIsArchived(drive)
    await drivesPage.unarchiveDrive(drive)
    await drivesPage.checkIsNotArchived(drive)
  })

  test('Leave/Join drive, check if user leaved/joined drive', async () => {
    await drivesPage.leaveDrive(drive)
    await drivesPage.checkUserNotJoinedDrive(drive)
    await drivesPage.joinDrive(drive)
    await drivesPage.checkUserJoinedDrive(drive)
  })

  test('Upload/rename/delete file, check file was uploaded, renamed and deleted', async () => {
    await drivesPage.clickOnDrive(drive)
    const fileName = 'cat.jpeg'
    await uploadFile(leftMenu.page, fileName, 'Upload files')
    await filesPage.checkFileExists(fileName)
    const newFileName = 'dog.jpeg'
    await filesPage.renameFile(fileName, newFileName)
    await filesPage.checkFileExists(newFileName)
    await filesPage.deleteFile(newFileName)
    await filesPage.checkFileNotExists(newFileName)
  })
})
