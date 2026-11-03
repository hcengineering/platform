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
import { expect, test, type Page } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { DocumentsPage } from '../model/documents/documents-page'
import { DocumentContentPage } from '../model/documents/document-content-page'
import {
  TABLE_METADATA_MARKER,
  TraceXTablePage,
  type TableCopyFormat,
  type TableState
} from '../model/documents/tracex-table-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'

test.use({
  storageState: PlatformSetting
})

const conflictsText = 'Some cells were changed both manually and in the source'
const diffCaption = 'The table in the document compared with its source'
// Collaborative edits reach the server asynchronously; give them time before reloading.
const saveDelay = 2000

test.describe('TraceX tables in documents', () => {
  // Each test creates an issue and a document and switches between Tracker and Documents.
  test.describe.configure({ timeout: 120_000 })

  let leftSideMenuPage: LeftSideMenuPage
  let documentsPage: DocumentsPage
  let documentContentPage: DocumentContentPage
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  let tablePage: TraceXTablePage

  // Titles do not contain each other, so a cell can be found by either one. Each title is a single
  // word for the word diff, so the diff shows the new title in one piece.
  let issueTitle: string
  let renamedTitle: string
  let documentUrl: string

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    documentsPage = new DocumentsPage(page)
    documentContentPage = new DocumentContentPage(page)
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    tablePage = new TraceXTablePage(page)

    const id = generateId(6)
    issueTitle = `Source_issue_${id}`
    renamedTitle = `Renamed_${id}`
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  /**
   * Open Tracker → All issues. Clicking the application that is already open hides its navigator,
   * so the navigator is reopened when the link is not shown.
   */
  async function openAllIssues (): Promise<void> {
    await leftSideMenuPage.clickTracker()
    const allIssues = issuesPage.linkSidebarAll()
    await expect(async () => {
      if (!(await allIssues.isVisible())) await issuesPage.openNavigator()
      await expect(allIssues).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })
    await allIssues.click()
    await issuesPage.clickModelSelectorAll()
  }

  async function createIssue (): Promise<void> {
    await test.step('Create the source issue', async () => {
      await openAllIssues()
      await issuesPage.createNewIssue({
        title: issueTitle,
        description: 'Row of a TraceX table',
        projectName: 'Default'
      })
      await issuesPage.searchIssueByName(issueTitle)
      await expect(issuesPage.issueByName(issueTitle)).toBeVisible()
    })
  }

  async function copyIssueTable (format?: TableCopyFormat): Promise<string> {
    return await test.step(`Copy the issue as ${format ?? 'a TraceX table'}`, async () => {
      // "Copy table" works on selected rows, so it is not offered for a single open document.
      const row = issuesPage.page
        .locator('div.listGrid.antiList__row', { has: issuesPage.issueByName(issueTitle) })
        .last()
      // The checkbox is only shown while the row is hovered, and the list re-renders after the issue
      // is created, so hover and click are retried together.
      await expect(async () => {
        await row.hover()
        await row.locator('.antiList-cells__checkCell').click({ timeout: 2000 })
        await expect(row).toHaveClass(/checking/, { timeout: 1000 })
      }).toPass({ timeout: 20000 })
      await issuesPage.issueByName(issueTitle).click({ button: 'right' })
      await issuesPage.selectFromDropdown(issuesPage.page, 'Copy table')
      await tablePage.copyTable(format)
      return await tablePage.readClipboardText()
    })
  }

  async function openNewDocument (): Promise<void> {
    await test.step('Create a document for the table', async () => {
      const title = `Table document ${generateId(6)}`
      await leftSideMenuPage.clickDocuments()
      await documentsPage.clickOnButtonCreateDocument()
      await documentsPage.createDocument({ title, space: 'Default' })
      await documentsPage.openDocument(title)
      await documentContentPage.checkDocumentTitle(title)
      documentUrl = tablePage.page.url()
    })
  }

  async function backToDocument (page: Page): Promise<void> {
    await (await page.goto(documentUrl))?.finished()
    await expect(tablePage.table()).toBeVisible()
  }

  async function renameIssueInTracker (page: Page): Promise<void> {
    await test.step('Change the source value', async () => {
      await openAllIssues()
      await issuesPage.searchIssueByName(issueTitle)
      await issuesPage.openIssueByName(issueTitle)
      await issuesDetailsPage.editIssue({ title: renamedTitle })
      await issuesDetailsPage.inputTitle().blur()
      await issuesDetailsPage.clickCloseIssueButton()
      await issuesPage.searchIssueByName(renamedTitle)
      await expect(issuesPage.issueByName(renamedTitle)).toBeVisible()
      await backToDocument(page)
    })
  }

  /** Copy the issue as a TraceX table and paste it into a new document. */
  async function pasteTrackedTable (): Promise<TableState> {
    await createIssue()
    await copyIssueTable()
    await openNewDocument()
    await tablePage.pasteFromClipboard()
    return await tablePage.waitTableState((state) => state.metadata?.version === '2.0' && state.hashedCells > 0)
  }

  test.describe('Current format', () => {
    test('Copied table keeps its metadata out of the text and survives a reload', async ({ page }) => {
      await createIssue()
      const text = await copyIssueTable()
      expect(text).toContain(issueTitle)
      expect(text).not.toContain(TABLE_METADATA_MARKER)

      await openNewDocument()
      await tablePage.pasteFromClipboard()
      const pasted = await tablePage.waitTableState((state) => state.metadata?.version === '2.0')
      expect(pasted.hashedCells).toBeGreaterThan(0)
      expect(pasted.metadata?.source?.mode).toBe('fixed')
      expect(pasted.metadata?.documentIds).toHaveLength(1)
      // Values and transit identities are not stored twice.
      expect(pasted.raw).not.toContain('"snapshot"')
      expect(pasted.raw).not.toContain('"rowIds"')
      await expect(tablePage.editor()).not.toContainText('huly-table-metadata')

      await page.waitForTimeout(saveDelay)
      await page.reload()
      await expect(tablePage.cell(issueTitle)).toBeVisible()
      const reloaded = await tablePage.waitTableState((state) => state.metadata?.version === '2.0')
      expect(reloaded.hashedCells).toBe(pasted.hashedCells)
      expect(reloaded.rowIds).toEqual(pasted.rowIds)
    })

    test('Markdown format pastes a plain table without metadata', async () => {
      await createIssue()
      const text = await copyIssueTable('Markdown (plain text)')
      expect(text).toContain(issueTitle)
      expect(text).not.toContain(TABLE_METADATA_MARKER)

      await openNewDocument()
      await tablePage.pasteFromClipboard(false)
      await expect(tablePage.editor()).toContainText(issueTitle)
      const state = await tablePage.tableState().catch(() => undefined)
      expect(state?.raw).toBeUndefined()
    })

    test('Source change is shown in the diff, refreshed and undone', async ({ page }) => {
      await pasteTrackedTable()
      await renameIssueInTracker(page)

      await tablePage.openTableMenu('Show Diff')
      await expect(tablePage.diffCard()).toContainText(diffCaption)
      await expect(tablePage.diffCard()).toContainText(renamedTitle)
      await tablePage.closeDiff()

      await tablePage.refreshTable()
      await expect(tablePage.cell(renamedTitle)).toBeVisible()
      await expect(tablePage.table()).not.toContainText(issueTitle)
      const refreshed = await tablePage.waitTableState((state) => state.metadata?.version === '2.0')
      expect(refreshed.hashedCells).toBeGreaterThan(0)

      await tablePage.undo()
      await expect(tablePage.cell(issueTitle)).toBeVisible()
    })

    test('Manual edit of a changed source cell is reported as a conflict', async ({ page }) => {
      await pasteTrackedTable()
      await tablePage.appendToCell(issueTitle, ' local')
      await expect(tablePage.cell(`${issueTitle} local`)).toBeVisible()
      await page.waitForTimeout(saveDelay)

      await renameIssueInTracker(page)
      await tablePage.openTableMenu('Refresh Table')
      await expect(tablePage.refreshCard()).toContainText(conflictsText)
      await tablePage.cardButton(tablePage.refreshCard(), 'Replace table').click()
      await expect(tablePage.refreshCard()).toBeHidden()
      await expect(tablePage.cell(renamedTitle)).toBeVisible()
      await expect(tablePage.table()).not.toContainText(' local')
    })

    async function refuseCopyEvent (page: Page, alsoAsyncClipboard: boolean): Promise<void> {
      await page.addInitScript((alsoAsyncClipboard) => {
        const execCommand = document.execCommand.bind(document)
        document.execCommand = (command: string, ...args: any[]) =>
          command === 'copy' ? false : execCommand(command, ...args)
        if (alsoAsyncClipboard) {
          Object.defineProperty(Clipboard.prototype, 'write', {
            value: async () => {
              throw new DOMException('Refused by the test', 'NotAllowedError')
            }
          })
        }
      }, alsoAsyncClipboard)
      await page.reload()
    }

    async function pasteAndCheckTracked (): Promise<void> {
      await openNewDocument()
      await tablePage.pasteFromClipboard()
      const state = await tablePage.waitTableState((state) => state.metadata?.version === '2.0')
      expect(state.hashedCells).toBeGreaterThan(0)
      await expect(tablePage.editor()).not.toContainText('huly-table-metadata')
    }

    test('Metadata travels in text/html, not in the text, when the copy event is refused', async ({ page }) => {
      await refuseCopyEvent(page, false)
      await createIssue()
      const text = await copyIssueTable()
      expect(text).toContain(issueTitle)
      expect(text).not.toContain(TABLE_METADATA_MARKER)
      await pasteAndCheckTracked()
    })

    test('Metadata falls back to an HTML comment when the clipboard API is refused too', async ({ page }) => {
      await refuseCopyEvent(page, true)
      await createIssue()
      const text = await copyIssueTable()
      expect(text).toContain(TABLE_METADATA_MARKER)
      await pasteAndCheckTracked()
    })
  })

  test.describe('Older formats', () => {
    /** Metadata as version 1.0 wrote it: no source description, identities or fingerprints. */
    function legacyMetadata (current: TableState, replace: Record<string, any> = {}): Record<string, any> {
      const { cardClass, documentIds, config, query, workspace, language } = current.metadata ?? {}
      // Version 1.0 told relationship tables apart by a missing viewlet, so a plain table always has one.
      // Copies from views that do not publish their viewlet (e.g. lists) only carry the columns.
      const viewletId = current.metadata?.viewletId ?? 'tracker:viewlet:IssueList'
      return {
        version: '1.0',
        cardClass,
        documentIds,
        config,
        viewletId,
        query,
        workspace,
        language,
        timestamp: 1,
        ...replace
      }
    }

    /** Replace the pasted table with the same Markdown pasted from an older version's clipboard. */
    async function pasteLegacyTable (replace: Record<string, any> = {}): Promise<TableState> {
      await createIssue()
      const text = await copyIssueTable()
      await openNewDocument()
      await tablePage.pasteFromClipboard()
      const current = await tablePage.waitTableState((state) => state.metadata?.version === '2.0')
      const markdown = text.split(TABLE_METADATA_MARKER)[0].trim()

      await tablePage.clearDocument()
      await tablePage.pasteText(
        `${markdown}\n${TABLE_METADATA_MARKER}${JSON.stringify(legacyMetadata(current, replace))} -->`
      )
      await expect(tablePage.editor()).not.toContainText('huly-table-metadata')
      return await tablePage.waitTableState((state) => state.metadata?.version === '1.0')
    }

    test('Pasted 1.0 table refreshes its fixed rows and stays 1.0', async ({ page }) => {
      const pasted = await pasteLegacyTable()
      expect(pasted.hashedCells).toBe(0)
      await renameIssueInTracker(page)

      await tablePage.openTableMenu('Show Diff')
      await expect(tablePage.diffCard()).toContainText(renamedTitle)
      await tablePage.closeDiff()

      await tablePage.refreshTable()
      await expect(tablePage.cell(renamedTitle)).toBeVisible()
      const refreshed = await tablePage.waitTableState((state) => state.metadata?.version === '1.0')
      expect(refreshed.metadata?.documentIds).toEqual(pasted.metadata?.documentIds)
      expect(refreshed.raw).not.toContain('"source"')

      await tablePage.undo()
      await expect(tablePage.cell(issueTitle)).toBeVisible()
    })

    test('1.0 table saved in a document is refreshed after a reload', async ({ page }) => {
      const current = await pasteTrackedTable()
      await tablePage.setStoredTableMetadata(JSON.stringify(legacyMetadata(current)), { identities: true })
      await page.waitForTimeout(saveDelay)
      await page.reload()
      await expect(tablePage.cell(issueTitle)).toBeVisible()
      const stored = await tablePage.waitTableState((state) => state.metadata?.version === '1.0')
      expect(stored.rowIds.every((id) => id === null)).toBe(true)
      expect(stored.hashedCells).toBe(0)

      await renameIssueInTracker(page)
      await tablePage.refreshTable()
      await expect(tablePage.cell(renamedTitle)).toBeVisible()
      await tablePage.waitTableState((state) => state.metadata?.version === '1.0')
    })

    test('1.0 table with only a query repeats the query', async ({ page }) => {
      const probe = await test.step('Find the issue id', async () => {
        await createIssue()
        await copyIssueTable()
        await openNewDocument()
        await tablePage.pasteFromClipboard()
        return await tablePage.waitTableState((state) => state.metadata?.version === '2.0')
      })
      const [issueId] = probe.metadata?.documentIds ?? []
      const text = await tablePage.readClipboardText()
      await tablePage.clearDocument()
      const legacy = legacyMetadata(probe, { documentIds: [], query: { _id: issueId } })
      await tablePage.pasteText(
        `${text.split(TABLE_METADATA_MARKER)[0].trim()}\n${TABLE_METADATA_MARKER}${JSON.stringify(legacy)} -->`
      )
      await tablePage.waitTableState((state) => state.metadata?.version === '1.0')

      await renameIssueInTracker(page)
      await tablePage.refreshTable()
      await expect(tablePage.cell(renamedTitle)).toBeVisible()
    })

    test('1.0 table without documents or query explains that it has no source', async () => {
      await pasteLegacyTable({ documentIds: [], query: undefined })
      await tablePage.openTableMenu('Refresh Table')
      await tablePage.checkMessage('This table has no source information')
      await expect(tablePage.cell(issueTitle)).toBeVisible()
    })

    test('Early 2.0 table with a stored snapshot drops it on refresh and then tracks edits', async ({ page }) => {
      const current = await pasteTrackedTable()
      const early = {
        ...current.metadata,
        snapshot: { rowIds: current.metadata?.documentIds, columnIds: [], cells: [] }
      }
      await tablePage.setStoredTableMetadata(JSON.stringify(early), { hashes: true })
      await page.waitForTimeout(saveDelay)
      await page.reload()
      await expect(tablePage.cell(issueTitle)).toBeVisible()
      const stored = await tablePage.waitTableState((state) => state.raw?.includes('"snapshot"') === true)
      expect(stored.hashedCells).toBe(0)

      // Without fingerprints nothing counts as a manual change.
      await tablePage.refreshTable('Refresh Table')
      const refreshed = await tablePage.waitTableState(
        (state) => state.metadata?.version === '2.0' && state.raw?.includes('"snapshot"') === false
      )
      expect(refreshed.hashedCells).toBeGreaterThan(0)

      await tablePage.appendToCell(issueTitle, ' local')
      await page.waitForTimeout(saveDelay)
      await renameIssueInTracker(page)
      await tablePage.openTableMenu('Refresh Table')
      await expect(tablePage.refreshCard()).toContainText(conflictsText)
    })

    for (const [name, raw, message] of [
      [
        'a newer version',
        JSON.stringify({ version: '3.0', cardClass: 'tracker:class:Issue' }),
        'created by a newer version'
      ],
      ['damaged metadata', JSON.stringify({ version: '2.0', cardClass: 'tracker:class:Issue' }), 'is damaged'],
      ['unreadable metadata', '{"version": "2.0", ', 'is damaged']
    ]) {
      test(`Table with ${name} stays readable and explains why it cannot be refreshed`, async ({ page }) => {
        await pasteTrackedTable()
        await tablePage.setStoredTableMetadata(raw, { identities: true })
        await page.waitForTimeout(saveDelay)
        await page.reload()
        await expect(tablePage.cell(issueTitle)).toBeVisible()
        await tablePage.waitTableState((state) => state.raw === raw)

        await tablePage.openTableMenu('Refresh Table')
        await tablePage.checkMessage(message)
        await expect(tablePage.cell(issueTitle)).toBeVisible()
      })
    }
  })
})
