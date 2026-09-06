import { expect, test } from '@playwright/test'
import { readFileSync } from 'fs'
import { CommonTrackerPage } from '../model/tracker/common-tracker-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { PlatformSetting, PlatformURI, fillSearch } from '../utils'
import {
  DEFAULT_STATUSES,
  ViewletSelectors,
  checkIssueDraft,
  createIssue,
  getIssueName,
  navigate,
  openIssue,
  performPanelTest
} from './tracker.utils'
test.use({
  storageState: PlatformSetting
})

const panelStatusMap = new Map([
  ['Issues/All', DEFAULT_STATUSES],
  ['Issues/Active', ['Todo', 'In Progress']],
  ['Issues/Backlog', ['Backlog']]
])

test.describe('Tracker tests', () => {
  test('issues-status-display', async ({ page }) => {
    await navigate(page)
    for (const status of DEFAULT_STATUSES) {
      await createIssue(page, { name: getIssueName(status), status })
    }
    for (const [panel, statuses] of panelStatusMap) {
      const pPage = panel.split('/')
      await performPanelTest(page, statuses, pPage[0], pPage[1])
    }
  })

  test('save-view-options-board', async ({ page }) => {
    const panels = ['Issues', 'Active', 'Backlog']
    const commonTrackerPage = new CommonTrackerPage(page)
    await navigate(page)

    await doSaveViewTest(panels, commonTrackerPage, ViewletSelectors.Board)
  })

  test('save-view-options-table', async ({ page }) => {
    const panels = ['Issues', 'Active', 'Backlog']
    const commonTrackerPage = new CommonTrackerPage(page)
    await navigate(page)

    await doSaveViewTest(panels, commonTrackerPage, ViewletSelectors.Table)
  })

  test('my-issues', async ({ page }) => {
    const issuesPage = new IssuesPage(page)
    const name = getIssueName()
    await navigate(page)
    await createIssue(page, { name })
    await issuesPage.navigateToMyIssues()
    await issuesPage.searchIssueByName(name)
    await issuesPage.checkIssuePresenceInTabs(name, true)
    await openIssue(page, name)
    await issuesPage.stopTrackingIssue(name)
  })

  test('report-time-from-issue-card', async ({ page }) => {
    const issuesPage = new IssuesPage(page)
    await navigate(page)
    const assignee = 'Chen Rosamund'
    const status = 'In Progress'
    const values = [2, 4, 6, 8]

    for (let i = 0; i < 5; i++) {
      const random = Math.floor(Math.random() * values.length)
      const time = values[random]
      const name = getIssueName()

      await issuesPage.createAndOpenIssue(name, assignee, status)
      await issuesPage.reportTime(time)
      await issuesPage.verifyReportedTime(time)
    }
  })

  test('report-multiple-time-from-issue-card', async ({ page }) => {
    await navigate(page)
    const issuesPage = new IssuesPage(page)
    const assignee = 'Chen Rosamund'
    const status = 'In Progress'
    const time = 0.25
    const name = getIssueName()
    await issuesPage.createAndOpenIssue(name, assignee, status)
    await issuesPage.clickOnReportedTimeEditor()

    for (let i = 0; i < 5; i++) {
      await issuesPage.checkTotalFooter(i)
      await issuesPage.waitForTimeSpentReports()
      await issuesPage.clickAddReportButton()
      await issuesPage.waitForAddTimeReport()
      await issuesPage.checkCreateButtonDisabled()
      await issuesPage.fillSpentTime(time)
      await issuesPage.checkCreateButtonEnabled()
      await issuesPage.clickCreateButton()
      await issuesPage.checkTotalFooter(i + 1)
    }
  })

  test('report-time-from-main-view', async ({ page }) => {
    const issuesPage = new IssuesPage(page)
    await navigate(page)
    await issuesPage.navigateToIssues()
    const values = [2, 4, 6, 8]
    const assignee = 'Chen Rosamund'
    const status = 'In Progress'
    const name = getIssueName()
    await issuesPage.createAndOpenIssue(name, assignee, status)
    // await page.click('.close-button > .antiButton')
    // We need to fait for indexer to complete indexing.
    await page.locator('#btnPClose').click()
    await fillSearch(page, name)
    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.openSubIssueByName(name)
    await issuesDetailsPage.waitDetailsOpened(name)
    await page.locator('#btnPClose').click()
    let count = 0
    for (let j = 0; j < 5; j++) {
      const random = Math.floor(Math.random() * values.length)
      const time = values[random]
      count += time
      await page.click('text="Issues"')
      const issuesPage = new IssuesPage(page)
      await issuesPage.clickModelSelectorAll()
      await issuesPage.clickModelSelectorAll()
      await issuesPage.clickView()
      await issuesPage.clickOrdering()
      await issuesPage.selectModifiedDate()
      await issuesPage.pressEscape()
      await issuesPage.clickEstimationContainer()
      await issuesPage.waitForEstimation()
      await issuesPage.clickAddTimeReport()
      await issuesPage.waitForTimeReportAdd()
      await issuesPage.fillSpentTime(time)
      await issuesPage.expectCreateEnabled()
      await issuesPage.clickCreate()
      await issuesPage.clickOkButton()
      await issuesPage.checkEstimation(count)
    }
  })

  test('create-issue-draft', async ({ page }) => {
    const issuesPage = new IssuesPage(page)
    const issueName = 'Draft issue'
    await navigate(page)
    await issuesPage.clickIssuesIndex(2)
    await issuesPage.clickNewIssue()
    await issuesPage.clickAndFillIssueName(issueName)
    await issuesPage.clickAndFillIssueDescription(issueName)
    await issuesPage.selectStatus()
    await issuesPage.selectPriority()
    await issuesPage.clickAssignee()
    await issuesPage.setEstimation()
    await issuesPage.inputTextPlaceholderFill('1')
    await issuesPage.setDueDate('19')
    await issuesPage.pressEscapeTwice()
    await issuesPage.clickOnDraftIssue()
    await checkIssueDraft(page, {
      name: issueName,
      description: issueName,
      status: 'Todo',
      priority: 'Urgent',
      assignee: 'Appleseed John',
      estimation: '1',
      dueDate: '19'
    })
  })

  test('check shouldShowAll option', async ({ page }) => {
    await (
      await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
    )?.finished()
    const issuesPage = new IssuesPage(page)
    await navigate(page)
    await issuesPage.navigateToIssues()
    await issuesPage.searchIssueByName('!!!!')
    await issuesPage.openViewOptionsAndToggleShouldShowAll()
    await issuesPage.clickModelSelectorAll()
    await issuesPage.verifyCategoryHeadersVisibility()
    await issuesPage.openViewOptionsAndToggleShouldShowAll()

    await page.click(ViewletSelectors.Board)
    await issuesPage.openViewOptionsAndToggleShouldShowAll()
    await issuesPage.verifyCategoryHeadersVisibilityKanban()
    await issuesPage.openViewOptionsAndToggleShouldShowAll()
  })

  test('gantt zero-hit search shows the empty-state card', async ({ page }) => {
    await (
      await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
    )?.finished()
    const issuesPage = new IssuesPage(page)
    await navigate(page)
    await issuesPage.navigateToIssues()
    await page.click(ViewletSelectors.Gantt)

    // The Gantt canvas claims all remaining height (`height: 100%`), which is
    // exactly why the card is an out-of-flow overlay instead of a block below
    // the viewlet — assert it is really on screen, not merely in the DOM.
    await expect(issuesPage.ganttRoot()).toBeInViewport()

    // Zero hits must surface the card. The count that gates it comes from the
    // Issue query alone, so a project that also has milestones behaves the
    // same as one without.
    await issuesPage.searchIssueByName('!!!!')
    await expect(issuesPage.searchEmptyStateCard()).toBeInViewport()
    await expect(issuesPage.searchEmptyStateCard()).toContainText('!!!!')

    // The viewlet is never displaced by the card: the time axis stays on
    // screen so the virtualized scroller keeps a real viewport.
    await expect(issuesPage.ganttRoot()).toBeInViewport()
    await expect(issuesPage.ganttTimeHeader()).toBeInViewport()

    // "Show empty groups" (shouldShowAll) is deliberately NOT asserted here.
    // It is a `category`-target view option of the shared grouped-list
    // machinery, and the Gantt viewlet does not declare it at all (see
    // `ganttViewOptions()` in models/tracker/src/viewlets.ts): the Gantt
    // builds its swimlanes itself from the loaded issues and has no category
    // pipeline to expand, so the toggle is not reachable in this viewlet.
    // Its interaction with the empty-state card is covered on the List
    // viewlet below, where the toggle actually exists.
  })

  // Viewport regression guard for the lifted Gantt toolbar.
  //
  // `toBeVisible()` is deliberately NOT used: an element pushed out of the
  // header's `overflow: hidden` box still counts as visible for Playwright,
  // which is exactly how the original bug survived a green CI. And a bare
  // `toBeInViewport()` passes as soon as a SINGLE pixel is on screen, which a
  // half-clipped button also manages — hence `{ ratio: 1 }` on every control:
  // the whole button has to be inside the window. Clicking each of them on top
  // of that is what proves they are actually operable, because Playwright's
  // actionability check fails outright for an element parked outside the
  // viewport with no scrollable ancestor.
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 }
  ]) {
    test(`gantt toolbar keeps fullscreen and more-actions reachable at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await (
        await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
      )?.finished()
      const issuesPage = new IssuesPage(page)
      await navigate(page)
      await issuesPage.navigateToIssues()
      await page.click(ViewletSelectors.Gantt)
      await expect(issuesPage.ganttRoot()).toBeInViewport()

      // The trailing cluster is frozen (Header `shrinkSearch`), so both
      // buttons have to be fully on screen at any desktop width.
      await expect(issuesPage.ganttFullscreenButton()).toBeInViewport({ ratio: 1 })
      await expect(issuesPage.ganttMoreActionsButton()).toBeInViewport({ ratio: 1 })

      // The toolbar cluster itself must fit into its box: whatever does not
      // fit belongs behind the "…" trigger, which is then on screen too.
      const cluster = issuesPage.ganttToolbarCluster()
      await expect(cluster).toBeInViewport({ ratio: 1 })
      await expect.poll(async () => await cluster.evaluate((el) => el.scrollWidth > el.clientWidth + 1)).toBe(false)
      if ((await issuesPage.ganttToolbarOverflowButton().count()) > 0) {
        await expect(issuesPage.ganttToolbarOverflowButton()).toBeInViewport({ ratio: 1 })
      }

      // More actions really opens its menu — not just "the button has a
      // bounding box somewhere".
      await issuesPage.ganttMoreActionsButton().click()
      await expect(issuesPage.ganttMoreActionsMenu()).toBeInViewport({ ratio: 1 })
      await expect(issuesPage.ganttMoreActionsMenu()).toContainText('Export as PNG')
      await page.keyboard.press('Escape')
      await expect(issuesPage.ganttMoreActionsMenu()).toHaveCount(0)

      // Fullscreen really toggles the browser fullscreen state; the button
      // mirrors it via aria-pressed. Done last, and toggled back off, so the
      // rest of the test runs against the normal layout.
      await issuesPage.ganttFullscreenButton().click()
      await expect(issuesPage.ganttFullscreenButton()).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(async () => await page.evaluate(() => document.fullscreenElement !== null)).toBe(true)
      await issuesPage.ganttFullscreenButton().click()
      await expect(issuesPage.ganttFullscreenButton()).toHaveAttribute('aria-pressed', 'false')
    })
  }

  // The export is a real file download built from the Gantt's own row model
  // (buildGanttExportSvg → canvas → PNG, and the same raster embedded by
  // jsPDF) — no DOM screenshot and no browser print dialog. Both entries live
  // in the More-actions menu, so this also exercises that menu end to end.
  for (const { item, extension, magic } of [
    { item: 'Export as PNG', extension: 'png', magic: [0x89, 0x50, 0x4e, 0x47] }, // \x89PNG
    { item: 'Export as PDF', extension: 'pdf', magic: [0x25, 0x50, 0x44, 0x46, 0x2d] } // %PDF-
  ]) {
    test(`gantt exports the chart as ${extension.toUpperCase()}`, async ({ page }) => {
      await (
        await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
      )?.finished()
      const issuesPage = new IssuesPage(page)
      await navigate(page)
      await issuesPage.navigateToIssues()
      await page.click(ViewletSelectors.Gantt)
      await expect(issuesPage.ganttRoot()).toBeInViewport()

      await issuesPage.ganttMoreActionsButton().click()
      await expect(issuesPage.ganttMoreActionsMenu()).toBeInViewport({ ratio: 1 })

      const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
      await issuesPage.ganttMoreActionsMenuItem(item).click()
      const download = await downloadPromise

      expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`))
      const downloadPath = await download.path()
      expect(downloadPath).not.toBeNull()
      // A non-empty file that actually starts with the format's magic bytes: the
      // PDF path in particular runs SVG→raster→jsPDF→blob, and a stall anywhere
      // there previously produced no download at all (the whole point of this
      // test), so proving the bytes are a real PDF — not just "something
      // downloaded" — is the assertion that matters.
      const bytes = readFileSync(downloadPath)
      expect(bytes.length).toBeGreaterThan(0)
      expect(Array.from(bytes.subarray(0, magic.length))).toEqual(magic)

      // A failed export surfaces an error toast instead of a file; assert the
      // download was the whole story.
      await expect(page.locator('.notifyPopup:has-text("Export failed")')).toHaveCount(0)
    })
  }

  test('gantt is operable on a phone-sized viewport', async ({ page }) => {
    // Navigate at desktop width FIRST. Below the workbench's own breakpoint
    // the navigator collapses, and with it the "Issues" tree item every
    // tracker test clicks to get into the project — at 390 px the only
    // remaining match for that text is the (invisible) header breadcrumb, so
    // the navigation, not the layout, is what fails. The viewport is the
    // subject of this test, not the route, so resize once the Gantt is up.
    await page.setViewportSize({ width: 1440, height: 900 })
    await (
      await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
    )?.finished()
    const issuesPage = new IssuesPage(page)
    await navigate(page)
    await issuesPage.navigateToIssues()
    await page.click(ViewletSelectors.Gantt)
    await expect(issuesPage.ganttRoot()).toBeInViewport()

    await page.setViewportSize({ width: 390, height: 844 })

    // The Workbench's own right sidebar (`#sidebar`, a separate application, NOT
    // the Gantt drawer) may carry an open widget tab from a pinned preference.
    // Below the aside-float breakpoint that panel is pinned to the viewport edge
    // and its content overflows across the frozen toolbar, so it sits on top of
    // the fullscreen button and would swallow a real click — even though the
    // button still reports as in-viewport. A phone user keeps that sidebar
    // closed; match that state before exercising the toolbar. Closing it only
    // frees space on the right, so the in-viewport checks below are unaffected.
    const workbenchSidebarContent = page.locator('#sidebar .sidebar-content')
    if (await workbenchSidebarContent.isVisible()) {
      await page.locator('#sidebar .sidebar-content .hulyHeader-container button.iconOnly').last().click()
      await expect(workbenchSidebarContent).toBeHidden()
    }

    // Phone layout swaps More-actions for the drawer toggle. It lives in the
    // frozen `extra` group, so it must be on screen — previously it sat at
    // x = 1631 in a 390 px viewport with no scrollable ancestor.
    await expect(issuesPage.ganttDrawerToggle()).toBeInViewport({ ratio: 1 })
    await expect(issuesPage.ganttFullscreenButton()).toBeInViewport({ ratio: 1 })

    // At this width the toolbar collapses completely, so the "…" trigger is
    // the ONLY way to reach group-by, zoom, undo/redo and the date
    // navigation. It shares the frozen trailing group with the two buttons
    // above for exactly that reason: inside the cluster — which is the
    // header row's shrink target and reaches clientWidth 0 here — it was
    // clipped away and reported a bounding box at x = 405.
    await expect(issuesPage.ganttToolbarOverflowButton()).toBeInViewport({ ratio: 1 })

    // Everything else collapses; the toolbar must not overflow its box.
    const cluster = issuesPage.ganttToolbarCluster()
    await expect.poll(async () => await cluster.evaluate((el) => el.scrollWidth > el.clientWidth + 1)).toBe(false)

    // The popover is what actually makes the collapsed tiers operable.
    await issuesPage.ganttToolbarOverflowButton().click()
    await expect(issuesPage.ganttToolbarOverflowPopup()).toBeInViewport({ ratio: 1 })
    await page.keyboard.press('Escape')

    // Overlap guard: `toBeInViewport` cannot see that the Workbench mini
    // side-rail (`#sidebar.sidebar-container.mini`) is painted ON TOP of the
    // frozen toolbar at this width — the button is "in the viewport" and still
    // unclickable. Assert the element under the button's own centre IS the
    // button (or a descendant of it), so a future regression that lets the rail
    // creep back over it fails here, loudly, instead of as a flaky click.
    const topAtButtonCentre = await issuesPage.ganttFullscreenButton().evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return {
        isButtonOrChild: hit != null && (el === hit || el.contains(hit)),
        hitInSidebar: hit?.closest('#sidebar') != null
      }
    })
    expect(topAtButtonCentre.isButtonOrChild).toBe(true)
    expect(topAtButtonCentre.hitInSidebar).toBe(false)

    // Fullscreen is the second frozen control on this width — clicking it is
    // what proves it is reachable, not just measurable.
    await issuesPage.ganttFullscreenButton().click()
    await expect(issuesPage.ganttFullscreenButton()).toHaveAttribute('aria-pressed', 'true')
    await issuesPage.ganttFullscreenButton().click()
    await expect(issuesPage.ganttFullscreenButton()).toHaveAttribute('aria-pressed', 'false')

    // Opening the drawer brings the issue list into the viewport. While
    // closed the drawer is `visibility: hidden`, so it is out of the tab
    // order as well as off screen.
    await issuesPage.ganttDrawerToggle().click()
    await expect(page.locator('.gantt-root .cell.sidebar-cell')).toBeInViewport()
  })

  test('list zero-hit search shows the empty-state card unless shouldShowAll is on', async ({ page }) => {
    await (
      await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/issues`)
    )?.finished()
    const issuesPage = new IssuesPage(page)
    await navigate(page)
    await issuesPage.navigateToIssues()
    await page.click(ViewletSelectors.Table)

    // 1) shouldShowAll OFF (default) — zero hits surface the card.
    await issuesPage.searchIssueByName('!!!!')
    await expect(issuesPage.searchEmptyStateCard()).toBeInViewport()
    await expect(issuesPage.searchEmptyStateCard()).toContainText('!!!!')

    // 2) shouldShowAll ON — the empty category headers stay visible and the
    //    card is suppressed, because the explicit view option wins.
    await issuesPage.openViewOptionsAndToggleShouldShowAll()
    await expect(issuesPage.searchEmptyStateCard()).toHaveCount(0)
    // Done / Cancelled only exist in the All mode, same as the
    // 'check shouldShowAll option' test above.
    await issuesPage.clickModelSelectorAll()
    await issuesPage.verifyCategoryHeadersVisibility()

    // 3) Toggling back restores the card — proves the option, not the search
    //    state, is what suppressed it.
    await issuesPage.openViewOptionsAndToggleShouldShowAll()
    await expect(issuesPage.searchEmptyStateCard()).toBeInViewport()
  })
})
async function doSaveViewTest (
  panels: string[],
  commonTrackerPage: CommonTrackerPage,
  viewletSelector: ViewletSelectors
): Promise<void> {
  for (const panel of panels) {
    await commonTrackerPage.selectPanelAndViewlet(panel, viewletSelector)
    await commonTrackerPage.openViewOptionsAndSelectAssignee()
  }
  for (const panel of panels) {
    await commonTrackerPage.verifyViewOption(panel, viewletSelector)
  }
}
