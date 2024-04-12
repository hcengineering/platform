import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'
import { LeftSideMenuPage } from './model/left-side-menu-page'
import { BoardsNavigatorPage } from './model/boards/boards-navigator-page'
import { BoardsDefaultPage } from './model/boards/boards-default-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Boards tests', () => {
  test.beforeEach(async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    await leftSideMenuPage.buttonBoards.click()
  })

  test('check boards menu buttons', async ({ page }) => {
    const boardsNavigatorPage = new BoardsNavigatorPage(page)
    await boardsNavigatorPage.validateBoardsNavigatorMenu()
  })

  test('check my boards icon tooltip', async ({ page }) => {
    const boardsNavigatorPage = new BoardsNavigatorPage(page)
    await boardsNavigatorPage.checkMyBoardsIcons()
  })

  test('check default dropbox and href link', async ({ page }) => {
    const boardsNavigatorPage = new BoardsNavigatorPage(page)
    await boardsNavigatorPage.checkDefaultDropboxAndHref()
  })

  test('check three dots menu and antiPopup elements', async ({ page }) => {
    const boardsNavigatorPage = new BoardsNavigatorPage(page)
    await boardsNavigatorPage.checkThreeDotsOptionsDefault()
  })

  test('validate boards default page header elements', async ({ page }) => {
    const boardsDefaultPage = new BoardsDefaultPage(page)
    await boardsDefaultPage.validateHeader()
    await boardsDefaultPage.verifyTooltips()
  })
})
