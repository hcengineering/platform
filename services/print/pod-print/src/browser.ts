//
// Copyright © 2026 Hardcore Engineering Inc.
//

import puppeteer, { type Browser, type BrowserContext, type Page } from 'puppeteer'

import config from './config'

const BROWSER_PAGE_INIT_TIMEOUT_MS = 2000

export type BrowserStatus = 'not_started' | 'launching' | 'connected' | 'disconnected'

export interface PrintBrowserPage {
  context: BrowserContext
  page: Page
}

function getLaunchOptions (): Parameters<typeof puppeteer.launch>[0] {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-setuid-sandbox',
      ...config.PuppeteerArgs
    ]
  }
}

async function withTimeout<T> (promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('Browser page initialization timed out'))
        }, timeoutMs)
      })
    ])
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }
  }
}

export class PrintBrowserManager {
  private browser: Browser | undefined
  private launchPromise: Promise<Browser> | undefined

  getStatus (): BrowserStatus {
    if (this.browser !== undefined) {
      return this.browser.connected ? 'connected' : 'disconnected'
    }

    return this.launchPromise !== undefined ? 'launching' : 'not_started'
  }

  async getBrowser (): Promise<Browser> {
    if (this.browser !== undefined && this.browser.connected) {
      return this.browser
    }

    if (this.browser !== undefined) {
      await this.resetBrowser(this.browser)
    }

    if (this.launchPromise === undefined) {
      this.launchPromise = puppeteer
        .launch(getLaunchOptions())
        .then((launchedBrowser) => {
          this.browser = launchedBrowser
          launchedBrowser.on('disconnected', () => {
            if (this.browser === launchedBrowser) {
              this.browser = undefined
              this.launchPromise = undefined
            }
          })
          return launchedBrowser
        })
        .catch((err) => {
          this.launchPromise = undefined
          throw err
        })
    }

    return await this.launchPromise
  }

  async createPage (): Promise<PrintBrowserPage> {
    const browser = await this.getBrowser()

    try {
      return await this.createPageInBrowser(browser)
    } catch (err) {
      if (this.browser === browser) {
        await this.resetBrowser(browser)
        return await this.createPageInBrowser(await this.getBrowser())
      }
      throw err
    }
  }

  async close (): Promise<void> {
    const currentBrowser = this.browser
    const currentLaunchPromise = this.launchPromise

    this.browser = undefined
    this.launchPromise = undefined

    const launchedBrowser = currentBrowser ?? (await currentLaunchPromise?.catch(() => undefined))

    if (this.browser === launchedBrowser) {
      this.browser = undefined
    }

    if (launchedBrowser !== undefined) {
      await this.closeBrowser(launchedBrowser)
    }
  }

  private async createPageInBrowser (browser: Browser): Promise<PrintBrowserPage> {
    let context: BrowserContext | undefined

    try {
      context = await withTimeout(browser.createBrowserContext(), BROWSER_PAGE_INIT_TIMEOUT_MS)
      const page = await withTimeout(context.newPage(), BROWSER_PAGE_INIT_TIMEOUT_MS)
      return { context, page }
    } catch {
      if (context !== undefined) {
        await context.close().catch(() => {})
      }
      throw new Error('Failed to create browser page')
    }
  }

  private async resetBrowser (browser: Browser): Promise<void> {
    if (this.browser === browser) {
      this.browser = undefined
      this.launchPromise = undefined
    }
    await this.closeBrowser(browser)
  }

  private async closeBrowser (browser: Browser): Promise<void> {
    if (browser.connected) {
      await browser.close().catch(() => {})
    }
  }
}
