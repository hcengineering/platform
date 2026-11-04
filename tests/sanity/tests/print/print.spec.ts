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

import { expect, test } from '@playwright/test'
import { readFile } from 'fs/promises'
import path from 'path'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { CommonPage } from '../model/common-page'
import { DriveCreateEditPopup } from '../model/drive/drive-create-edit-popup'
import { DrivesPage } from '../model/drive/drive-drives-page'
import { DriveFilesPage } from '../model/drive/drive-files-page'
import { DriveLeftMenu } from '../model/drive/drive-left-menu'
import type { Drive } from '../model/drive/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { PrintPage } from '../model/print-page'
import { generateId, PlatformSetting, PlatformURI, PlatformWs } from '../utils'
import {
  createPrintCard,
  createPrintDocument,
  createPrintNotification,
  PRINT_CARD_CLASS,
  waitForPrintContent
} from './print-utils'

test.use({ storageState: PlatformSetting })

test.describe('Printing', () => {
  // These scenarios include editing, PDF generation and multiple application navigations.
  test.setTimeout(300000)

  test.beforeAll(async ({ request }) => {
    const response = await request.get(`${PlatformURI}/config.json`)
    expect(response.ok()).toBe(true)
    const config: Record<string, unknown> = await response.json()
    expect(config.PRINT_URL, 'Print tests require PRINT_URL in the frontend configuration').toMatch(/^https?:\/\//)
  })
  test('opens a document with its image in a read-only print page using the existing session', async ({
    page,
    context,
    request
  }) => {
    const document = await createPrintDocument(request)
    const content = `Printable content ${generateId()}`
    await page.goto(document.url)
    const editor = new DocumentContentPage(page)
    await expect(editor.buttonDocumentTitle()).toHaveValue(document.title, { timeout: 60000 })
    await editor.inputContent().fill(content)
    await editor.inputContent().press('End')
    await editor.inputContent().press('Enter')
    await editor.inputImageFile().setInputFiles(path.join(__dirname, '../files/cat.jpeg'))
    await expect(editor.firstImageInDocument()).toBeVisible({ timeout: 60000 })
    await waitForPrintContent(document)
    await editor.executeMoreAction('Print to PDF')
    await new PrintPage(page).checkPdfPreview(document.title)

    const printTab = await context.newPage()
    try {
      const print = new PrintPage(printTab)
      await print.open(document.url)
      await expect(print.root()).toContainText(content)
      await print.checkImageLoaded(print.documentImage())
      await printTab.emulateMedia({ media: 'print' })
      await print.checkImageLoaded(print.documentImage())
      await print.checkReadOnly()
      await expect(print.root().getByRole('textbox', { name: 'Untitled', exact: true })).toBeDisabled()
      await printTab.reload()
      await expect(print.root()).toHaveAttribute('data-print-state', 'ready', { timeout: 60000 })
      await expect(print.root()).toContainText(content)
      await print.checkImageLoaded(print.documentImage())
    } finally {
      await printTab.close()
    }
  })

  test('loads an embedded Drive image in the document print page', async ({ page, context, request }) => {
    const document = await createPrintDocument(request)
    const drive: Drive = { name: `Print drive ${generateId()}` }
    const filename = `print-${generateId()}.jpeg`
    await page.goto(`${PlatformURI}/workbench/${PlatformWs}/drive`)
    const menu = new DriveLeftMenu(page)
    await expect(menu.groupHeaderDrive()).toBeVisible({ timeout: 60000 })
    await menu.clickCreateNewDrive()
    await new DriveCreateEditPopup(page).createOrEditDrive(drive)
    await menu.clickDrives()
    await new DrivesPage(page).clickOnDrive(drive)
    const chooserPromise = page.waitForEvent('filechooser')
    await menu.clickUploadFiles()
    await (
      await chooserPromise
    ).setFiles({
      name: filename,
      mimeType: 'image/jpeg',
      buffer: await readFile(path.join(__dirname, '../files/cat.jpeg'))
    })
    await new DriveFilesPage(page).checkFileExists(filename)

    await page.goto(document.url)
    const editor = new DocumentContentPage(page)
    await expect(editor.buttonDocumentTitle()).toHaveValue(document.title, { timeout: 60000 })
    await editor.inputContent().fill(`@${filename}`)
    await editor.selectMention(filename)
    await page.locator('[data-type="reference"]').filter({ hasText: filename }).hover()
    await page.getByTestId('btnConvertToEmbedPreview').click()
    await expect(editor.inputContent().locator('[data-type="embed"] img')).toBeVisible({ timeout: 60000 })
    await waitForPrintContent(document)

    const printTab = await context.newPage()
    try {
      const print = new PrintPage(printTab)
      await print.open(document.url)
      await print.checkImageLoaded(print.root().locator('[data-type="embed"] img'))
      await print.checkReadOnly()
    } finally {
      await printTab.close()
    }
  })

  test('prints a card with its content without allowing editing', async ({ page, context, request }) => {
    const card = await createPrintCard(request)
    const content = `Printable card content ${generateId()}`
    await page.goto(card.url)
    const editor = page.locator('.content.select-text .tiptap')
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 120000 })
    await editor.fill(content)
    await waitForPrintContent(card, PRINT_CARD_CLASS)
    await page.locator('.hulyHeader-buttonsGroup').getByTestId('btnMoreActions').click()
    await new CommonPage(page).selectFromDropdown(page, 'Print to PDF')
    await new PrintPage(page).checkPdfPreview(card.title)

    const printTab = await context.newPage()
    try {
      const print = new PrintPage(printTab)
      await print.open(card.url, PRINT_CARD_CLASS)
      await expect(print.root()).toContainText(card.title)
      await expect(print.root()).toContainText(content)
      await print.checkReadOnly()
      await printTab.emulateMedia({ media: 'print' })
      await expect(print.root().locator('.tiptap')).toBeVisible()
      await expect(print.root()).toContainText(content)
    } finally {
      await printTab.close()
    }
  })

  test('keeps a document notification unread after opening and closing print', async ({ page, context, request }) => {
    const document = await createPrintDocument(request)
    await createPrintNotification(document)
    const inboxUrl = `${PlatformURI}/workbench/${PlatformWs}/notification`
    await page.goto(inboxUrl)
    const inbox = page.getByRole('listbox', { name: 'Inbox notifications' })
    await expect(inbox).toBeVisible({ timeout: 120000 })
    const card = inbox.locator('.card').filter({ hasText: document.title })
    const unread = card.locator('.notifyMarker.primary')
    await expect(unread).toHaveText('1', { timeout: 60000 })

    const printTab = await context.newPage()
    try {
      const print = new PrintPage(printTab)
      await print.open(document.url)
      await expect(print.root()).toContainText(document.title)
      await expect(unread).toHaveText('1')
      // A same-document history transition unmounts the print panel, exercising its cleanup too.
      await printTab.evaluate((url) => {
        const printUrl = window.location.href
        window.history.pushState({}, '', url)
        window.history.pushState({}, '', printUrl)
      }, inboxUrl)
      await printTab.goBack()
      await expect(printTab.locator('[data-print-root]')).toHaveCount(0)
      await expect(printTab.getByRole('listbox', { name: 'Inbox notifications' })).toBeVisible({ timeout: 60000 })
    } finally {
      await printTab.close()
    }

    await page.reload()
    await expect(inbox).toBeVisible({ timeout: 120000 })
    await expect(unread).toHaveText('1', { timeout: 60000 })
    // The same notification must still be readable through the ordinary document UI.
    await page.goto(document.url)
    await expect(new DocumentContentPage(page).buttonDocumentTitle()).toHaveValue(document.title, { timeout: 60000 })
    await page.locator('#btnPClose').click()
    await new LeftSideMenuPage(page).clickNotification()
    await expect(card).toBeVisible({ timeout: 60000 })
    await expect(unread).toHaveCount(0)
  })
})
