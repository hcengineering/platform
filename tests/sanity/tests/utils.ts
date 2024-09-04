import { faker } from '@faker-js/faker'
import { APIRequestContext, Browser, BrowserContext, Locator, Page, expect } from '@playwright/test'
import { allure } from 'allure-playwright'
import path from 'path'
import { ApiEndpoint } from './API/Api'
import { TestData } from './chat/types'
import { SignUpData } from './model/common-types'
import { LeftSideMenuPage } from './model/left-side-menu-page'
import { LoginPage } from './model/login-page'
import { SelectWorkspacePage } from './model/select-workspace-page'
import { SignInJoinPage } from './model/signin-page'

export const PlatformURI = process.env.PLATFORM_URI as string
export const PlatformTransactor = process.env.PLATFORM_TRANSACTOR as string
export const PlatformUser = process.env.PLATFORM_USER as string
export const PlatformUserSecond = process.env.PLATFORM_USER_SECOND as string
export const PlatformSetting = process.env.SETTING as string
export const PlatformSettingSecond = process.env.SETTING_SECOND as string
export const DefaultWorkspace = 'SanityTest'
export const LocalUrl = process.env.LOCAL_URL as string
export const DevUrl = process.env.DEV_URL as string
export const StagingUrl = process.env.STAGING_URL as string

export function generateTestData (): TestData {
  const generateWordStartingWithA = (): string => {
    const randomWord = faker.lorem.word()
    return 'A' + randomWord.slice(1)
  }

  return {
    workspaceName: faker.lorem.word(),
    userName: faker.internet.userName(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    channelName: generateWordStartingWithA()
  }
}

export function getTimeForPlanner (): string {
  let hour = new Date().getHours()
  const ampm = hour < 13 ? 'am' : 'pm'
  hour = hour < 1 ? 1 : hour >= 11 && hour < 13 ? 11 : hour >= 22 ? 10 : hour > 12 ? hour - 12 : hour

  return `${hour}${ampm}`
}

// Consistent data
export const workspaceName = faker.lorem.word()
export const userName = faker.internet.userName()
export const firstName = faker.person.firstName()
export const lastName = faker.person.lastName()
export const channelName = faker.lorem.word()
export const email = faker.internet.email()

function toHex (value: number, chars: number): string {
  const result = value.toString(16)
  if (result.length < chars) {
    return '0'.repeat(chars - result.length) + result
  }
  return result
}

let counter = 0
const random = toHex((Math.random() * (1 << 24)) | 0, 6) + toHex((Math.random() * (1 << 16)) | 0, 4)

function timestamp (): string {
  const time = (Date.now() / 1000) | 0
  return toHex(time, 8)
}

function count (): string {
  const val = counter++ & 0xffffff
  return toHex(val, 6)
}

/**
 * @public
 * @returns
 */
export function generateId (len = 100): string {
  const v = timestamp() + random
  let s = v.length - len
  if (s < 0) {
    s = 0
  }
  const r = v.slice(s, v.length) + count()
  return r
}

/**
 * Finds a search field on the page, fills it with
 * the provided string, and returns a locator
 *
 * @export
 * @param {Page} page
 * @param {string} search
 * @returns {Promise<Locator>}
 */
export async function fillSearch (page: Page, search: string): Promise<Locator> {
  await page.locator('.searchInput-icon').click()
  const searchBox = page.locator('input[placeholder="Search"]')

  await searchBox.fill(search)
  await searchBox.press('Enter')

  return searchBox
}

export async function getSecondPage (browser: Browser): Promise<{ page: Page, context: BrowserContext } & Disposable> {
  const userSecondContext = await browser.newContext({ storageState: PlatformSettingSecond })
  const newPage = await userSecondContext.newPage()
  return {
    page: newPage,
    context: userSecondContext,
    [Symbol.dispose]: () => {
      void newPage
        .close()
        .finally(() => {
          void userSecondContext.close().catch(() => {})
        })
        .catch(() => {})
    }
  }
}

export async function getSecondPageByInvite (
  browser: Browser,
  linkText: string | null,
  newUser: SignUpData
): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(linkText ?? '')
  const joinPage: SignInJoinPage = new SignInJoinPage(page)
  await joinPage.join(newUser)
  return page
}

export function expectToContainsOrdered (val: Locator, text: string[], timeout?: number): Promise<void> {
  const origIssuesExp = new RegExp('.*' + text.join('.*') + '.*')
  return expect(val).toHaveText(origIssuesExp, { timeout })
}

export async function * iterateLocator (locator: Locator): AsyncGenerator<Locator> {
  for (let index = 0; index < (await locator.count()); index++) {
    yield locator.nth(index)
  }
}

export async function attachScreenshot (name: string, page: Page): Promise<void> {
  await allure.attachment(name, await page.screenshot(), {
    contentType: 'image/png'
  })
  await page.screenshot({ path: `screenshots/${name}` })
}

export async function checkIfUrlContains (page: Page, url: string): Promise<void> {
  expect(page.url()).toContain(url)
}

export async function waitForNetworIdle (page: Page, timeout = 2000): Promise<void> {
  await Promise.race([page.waitForLoadState('networkidle'), new Promise((resolve) => setTimeout(resolve, timeout))])
}

// Check for text in the page
export const checkTextChunksVisibility = async (page: Page, textChunks: string[]): Promise<void> => {
  for (const textChunk of textChunks) {
    await expect(page.locator(`text=${textChunk}`)).toBeVisible()
  }
}

/**
 * Resolves the file path for a given file name located in the same directory as the test.
 *
 * @param fileName - name of the file to be resolved
 * @returns - resolved file path
 */

function resolveFilePath (fileName: string): string {
  return path.resolve(__dirname, '.', 'files', fileName)
}

/**
 * Uploads a single file using a file chooser in Playwright.
 *
 * @param page - Playwright Page object
 * @param fileName - name of the file to be uploaded
 * @param fileUploadTestId - test ID of the file input element (default: '@upload-file')
 */
export async function uploadFile (page: Page, fileName: string, fileUploadTestId = 'Attached photo'): Promise<void> {
  const uploadFileElement = page.getByText(fileUploadTestId)

  const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), uploadFileElement.click()])

  // Resolve the file path using the 'resolveFilePath' function
  const filePath = resolveFilePath(fileName)
  await fileChooser.setFiles(filePath)

  // Replace with a more reliable condition for determining when the upload is complete, if possible.
  await page.waitForTimeout(2000)
}

export async function getInviteLink (page: Page): Promise<string | null> {
  const leftSideMenuPage = new LeftSideMenuPage(page)
  await leftSideMenuPage.openProfileMenu()
  await leftSideMenuPage.inviteToWorkspace()
  await leftSideMenuPage.getInviteLink()
  const linkText = await page.locator('.antiPopup .link').textContent()
  expect(linkText).not.toBeNull()
  await leftSideMenuPage.clickOnCloseInvite()
  return linkText
}

export function generateUser (): SignUpData {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    password: '1234'
  }
}

export async function createAccount (request: APIRequestContext, data: SignUpData): Promise<void> {
  const api: ApiEndpoint = new ApiEndpoint(request)
  await api.createAccount(data.email, data.password, data.firstName, data.lastName)
}

export async function reLogin (page: Page, data: TestData): Promise<void> {
  const loginPage: LoginPage = new LoginPage(page)
  await loginPage.checkingNeedReLogin()
  await (await page.goto(`${PlatformURI}`))?.finished()
  await loginPage.login(data.userName, '1234')
  const swp = new SelectWorkspacePage(page)
  await swp.selectWorkspace(data.workspaceName)
}

export async function createAccountAndWorkspace (page: Page, request: APIRequestContext, data: TestData): Promise<void> {
  const api: ApiEndpoint = new ApiEndpoint(request)
  await api.createAccount(data.userName, '1234', data.firstName, data.lastName)
  await api.createWorkspaceWithLogin(data.workspaceName, data.userName, '1234')
  await reLogin(page, data)
}
