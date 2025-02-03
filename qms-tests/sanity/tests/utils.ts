import { Browser, Locator, Page } from '@playwright/test'
import { attachment } from 'allure-js-commons'

export const PlatformURI = process.env.PLATFORM_URI as string
export const PlatformTransactor = process.env.PLATFORM_TRANSACTOR as string
export const PlatformUser = process.env.PLATFORM_USER as string
export const PlatformUserSecond = process.env.PLATFORM_USER_SECOND as string
export const PlatformUserThird = process.env.PLATFORM_USER_THIRD as string
export const PlatformUserQara = process.env.PLATFORM_USER_QARA as string
export const PlatformWs = process.env.PLATFORM_WS as string
export const PlatformToken = process.env.PLATFORM_TOKEN as string
export const PlatformSetting = process.env.SETTING as string
export const PlatformSettingSecond = process.env.SETTING_SECOND as string
export const PlatformSettingThird = process.env.SETTING_THIRD as string
export const PlatformSettingQaraManager = process.env.SETTING_QARA_MANAGER as string
export const PlatformPassword = process.env.PLATFORM_PASSWORD as string
export const DefaultWorkspace = 'sanity-ws-qms'
export const DocumentURI = `workbench/${DefaultWorkspace}/documents`
export const HomepageURI = `workbench/${DefaultWorkspace}`

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
  return v.slice(s, v.length) + count()
}

export async function getSecondPage (browser: Browser): Promise<Page> {
  const userSecondContext = await browser.newContext({ storageState: PlatformSettingSecond })
  return await userSecondContext.newPage()
}

export async function getNewPage (browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: undefined })
  return await context.newPage()
}

export function randomString (): string {
  return (Math.random() * 1000000).toString(36).replace('.', '')
}

export async function attachScreenshot (name: string, page: Page): Promise<void> {
  await attachment(name, await page.screenshot(), {
    contentType: 'image/png'
  })
  await page.screenshot({ path: `screenshots/${name}` })
}

export async function getQaraManagerPage (browser: Browser): Promise<Page> {
  const qaraManagerContext = await browser.newContext({ storageState: PlatformSettingQaraManager })
  return await qaraManagerContext.newPage()
}

export async function * iterateLocator (locator: Locator): AsyncGenerator<Locator> {
  for (let index = 0; index < (await locator.count()); index++) {
    yield locator.nth(index)
  }
}

export async function waitForNetworIdle (page: Page, timeout = 2000): Promise<void> {
  await Promise.race([page.waitForLoadState('networkidle'), new Promise((resolve) => setTimeout(resolve, timeout))])
}

export async function setTestOptions (page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('#platform.notification.timeout', '0')
    localStorage.setItem('#platform.testing.enabled', 'true')
    localStorage.setItem('#platform.lazy.loading', 'false')
  })
}
