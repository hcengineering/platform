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
import { type Locator, type Page, expect } from '@playwright/test'
import { CommonPage } from '../common-page'

export type TableCopyFormat = 'TraceX table (refreshable)' | 'Markdown (plain text)'
export type TableMenuItem = 'Refresh Table' | 'Show Diff' | 'See Original Data'

/** Same marker as TABLE_METADATA_MARKER in @hcengineering/view. */
export const TABLE_METADATA_MARKER = '<!-- huly-table-metadata:'

/** What the editor holds for the first table of the document. */
export interface TableState {
  /** The raw `tableMetadata` attribute (undefined when the table has none). */
  raw?: string
  metadata?: Record<string, any>
  /** Cells with a source value fingerprint. */
  hashedCells: number
  rowIds: Array<string | null>
}

/** Copy table dialog, TraceX tables in the editor and the dialogs opened from the table menu. */
export class TraceXTablePage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  // Inner `has` locators are relative to the outer element, so the button is matched by text only.
  readonly copyDialog = (): Locator =>
    this.page.locator('div.antiPopup', { has: this.page.locator('button', { hasText: 'Copy to clipboard' }) })

  readonly copyButton = (): Locator => this.copyDialog().locator('button', { hasText: 'Copy to clipboard' })
  readonly copyDialogControl = (index: number): Locator =>
    this.copyDialog().locator('div.control').nth(index).locator('button')

  readonly dropdownItem = (label: string): Locator =>
    this.page.locator('div.selectPopup button.menu-item', { hasText: label })

  readonly editor = (): Locator => this.page.locator('div.textInput div.tiptap')
  readonly table = (): Locator => this.editor().locator('table.proseTable').first()
  readonly cell = (text: string): Locator => this.table().locator('td, th', { hasText: text }).first()
  readonly buttonTableOptions = (): Locator =>
    this.page.locator('div.text-editor-toolbar button[data-id="btnTableOptions"]')

  readonly tableMenuItem = (label: string): Locator =>
    this.page.locator('div.selectPopup button', { hasText: label }).first()

  readonly card = (title: string): Locator => this.page.locator('form.antiCard', { hasText: title })
  readonly refreshCard = (): Locator => this.card('Confirm Table Refresh')
  readonly diffCard = (): Locator => this.card('Table Changes')
  readonly cardButton = (card: Locator, label: string): Locator =>
    card.locator('div.antiCard-footer button', { hasText: label })

  readonly messageBox = (): Locator => this.page.locator('div.msgbox-container')

  async copyTable (format: TableCopyFormat = 'TraceX table (refreshable)'): Promise<void> {
    await expect(this.copyDialog()).toBeVisible()
    await this.copyDialogControl(0).click()
    await this.dropdownItem(format).click()
    await expect(this.copyDialogControl(0)).toHaveText(format)
    await this.copyButton().click()
    await expect(this.copyDialog()).toBeHidden()
  }

  async readClipboardText (): Promise<string> {
    return await this.page.evaluate(async () => await navigator.clipboard.readText())
  }

  async focusEditorEnd (): Promise<void> {
    await expect(this.editor()).toHaveJSProperty('contentEditable', 'true')
    await this.editor().click()
    await this.editor().press('ControlOrMeta+End')
  }

  /** A real paste of the browser clipboard (keeps custom clipboard types). */
  async pasteFromClipboard (expectTable = true): Promise<void> {
    await this.focusEditorEnd()
    await this.editor().press('ControlOrMeta+V')
    if (expectTable) await expect(this.table()).toBeVisible()
  }

  /** Paste text as if it came from the clipboard, e.g. a table copied by an older version. */
  async pasteText (text: string): Promise<void> {
    await this.focusEditorEnd()
    await this.editor().evaluate((dom, text) => {
      const data = new DataTransfer()
      data.setData('text/plain', text)
      dom.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
    }, text)
    await expect(this.table()).toBeVisible()
  }

  async tableState (): Promise<TableState> {
    return await this.editor().evaluate((dom) => {
      const editor = (dom as any).editor
      if (editor === undefined) throw new Error('No editor on the editor element')
      let table: any
      editor.state.doc.descendants((node: any) => {
        if (table !== undefined) return false
        if (node.type.name === 'table') table = node
        return table === undefined
      })
      if (table === undefined) throw new Error('No table in the document')
      const raw: string | undefined = table.attrs.tableMetadata ?? undefined
      let metadata: Record<string, any> | undefined
      try {
        metadata = raw === undefined ? undefined : JSON.parse(raw)
      } catch {
        metadata = undefined
      }
      let hashedCells = 0
      const rowIds: Array<string | null> = []
      table.forEach((row: any) => {
        rowIds.push(row.attrs.sourceRowId ?? null)
        row.forEach((cell: any) => {
          if (cell.attrs.sourceHash != null) hashedCells++
        })
      })
      return { raw, metadata, hashedCells, rowIds }
    })
  }

  /**
   * Make the first table look like one saved by an older version: replace its metadata attribute
   * and drop the identity attributes that version did not write.
   */
  async setStoredTableMetadata (raw: string, drop: { identities?: boolean, hashes?: boolean } = {}): Promise<void> {
    await this.editor().evaluate(
      (dom, { raw, drop }) => {
        const editor = (dom as any).editor
        const { state, view } = editor
        const tr = state.tr
        let done = false
        state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === 'table') {
            if (done) return false
            done = true
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, tableMetadata: raw })
            return true
          }
          if (node.type.name === 'tableRow' && drop.identities === true) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, sourceRowId: null })
          }
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            const attrs = { ...node.attrs }
            if (drop.identities === true) attrs.sourceColumnId = null
            if (drop.hashes === true || drop.identities === true) attrs.sourceHash = null
            tr.setNodeMarkup(pos, undefined, attrs)
            return false
          }
          return true
        })
        view.dispatch(tr)
      },
      { raw, drop }
    )
  }

  /** Remove everything from the document, e.g. to paste a different table. */
  async clearDocument (): Promise<void> {
    await this.editor().evaluate((dom) => {
      ;(dom as any).editor.commands.clearContent(true)
    })
    await expect(this.table()).toBeHidden()
  }

  /**
   * Put the cursor into a cell without a link: clicking a link opens the link toolbar instead of
   * the table toolbar.
   */
  async focusTable (): Promise<void> {
    await this.table().locator('td:not(:has(a)) p').first().click()
  }

  async openTableMenu (item: TableMenuItem): Promise<void> {
    await this.focusTable()
    await this.buttonTableOptions().click()
    await this.tableMenuItem(item).click()
  }

  async refreshTable (okLabel: 'Refresh Table' | 'Replace table' = 'Refresh Table'): Promise<void> {
    await this.openTableMenu('Refresh Table')
    await expect(this.refreshCard()).toBeVisible()
    await this.cardButton(this.refreshCard(), okLabel).click()
    await expect(this.refreshCard()).toBeHidden()
  }

  async closeDiff (): Promise<void> {
    await expect(this.diffCard()).toBeVisible()
    await this.diffCard().press('Escape')
    await expect(this.diffCard()).toBeHidden()
  }

  async undo (): Promise<void> {
    await this.focusTable()
    await this.editor().press('ControlOrMeta+Z')
  }

  /** Append text to the cell holding `cellText`, as a manual edit. */
  async appendToCell (cellText: string, text: string): Promise<void> {
    await this.cell(cellText).locator('p').first().click()
    await this.editor().press('End')
    await this.editor().pressSequentially(text)
  }

  async checkMessage (text: string): Promise<void> {
    await expect(this.messageBox()).toContainText(text)
  }

  async waitTableState (check: (state: TableState) => boolean): Promise<TableState> {
    let last: TableState | undefined
    await expect
      .poll(async () => {
        last = await this.tableState().catch(() => undefined)
        return last !== undefined && check(last)
      })
      .toBe(true)
    return last as TableState
  }
}
