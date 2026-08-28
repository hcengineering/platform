//
// Copyright © 2024 Hardcore Engineering Inc.
//
import { MeasureContext } from '@hcengineering/core'
import { type BrowserContext, type Page, type Viewport } from 'puppeteer'

import { type PrintBrowserManager } from './browser'
import config from './config'
import { Semaphore } from './semaphore'

export interface PrintOptions {
  kind?: ExportKind
  orientation?: PageOrientation
  viewport?: Viewport
}

export const validKinds = ['pdf', 'jpeg', 'png', 'webp'] as const
export const validPageOrientations = ['portrait', 'landscape'] as const

export type ExportKind = (typeof validKinds)[number]
export type PageOrientation = (typeof validPageOrientations)[number]

const printSemaphore = new Semaphore(config.PrintConcurrency)

/**
 * Prints a webpage with the specified options
 * @public
 * @param url - The URL of the webpage to print.
 * @param options - The options to use when printing the webpage.
 * @returns Buffer with the printed content.
 */
export async function print (
  ctx: MeasureContext,
  url: string,
  options: PrintOptions | undefined,
  browserManager: PrintBrowserManager
): Promise<Buffer | undefined> {
  const kind = options?.kind ?? 'pdf'
  const orientation = options?.orientation ?? 'portrait'
  const viewport = options?.viewport ?? { width: 1440, height: 900 }
  const release = await printSemaphore.acquire()

  let context: BrowserContext | undefined
  let page: Page | undefined

  try {
    ctx.info('print', { url, kind, orientation, viewport })

    const browserPage = await browserManager.createPage()
    context = browserPage.context
    page = browserPage.page
    const currentPage = page

    currentPage
      .on('pageerror', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        ctx.warn('pageerror', { message })
      })
      .on('requestfailed', (request) => {
        ctx.warn('requestfailed', { url: request.url(), errorText: request.failure()?.errorText })
      })

    await currentPage.setViewport(viewport)

    // NOTE: Issues opened with a guest link worked fine only with networkidle0 here and
    // waitForNetworkIdle 1000 afterwards. Also tried 700 but sometimes it was not enough.
    await currentPage.goto(url, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    })
    await currentPage.waitForNetworkIdle({ idleTime: 1000 })

    let res: Uint8Array | undefined

    if (kind === 'pdf') {
      await currentPage.emulateMediaType('print')
      // Scroll throught the page to render all the content (e.g. as images are only rendered
      // when they are visible in the viewport)
      await scrollThrough(currentPage)

      // Read page header and footer if defined
      const pageHeader = await currentPage.evaluate(() => {
        const header = document.querySelector('#page-header')
        return header?.innerHTML ?? ''
      })

      const pageFooter = await currentPage.evaluate(() => {
        const footer = document.querySelector('#page-footer')
        return footer?.innerHTML ?? ''
      })

      const displayHeaderFooter = pageHeader !== '' || pageFooter !== ''

      res = await ctx.with('pdf', {}, () =>
        currentPage.pdf({
          format: 'A4',
          landscape: orientation === 'landscape',
          timeout: 0,
          headerTemplate: pageHeader,
          footerTemplate: pageFooter,
          displayHeaderFooter,
          margin: {
            top: '1.5cm',
            right: '1cm',
            bottom: '1.5cm',
            left: '1cm'
          }
        })
      )
    } else {
      // Note: currently we do not take the full page screenshot - only the viewport
      // might make it configurable in the future
      res = await ctx.with('screenshot', { kind }, () => currentPage.screenshot({ type: kind }))
    }

    return res !== undefined ? Buffer.from(res) : undefined
  } finally {
    try {
      if (context !== undefined) {
        await context.close()
      } else if (page !== undefined) {
        await page.close()
      }
    } finally {
      release()
    }
  }
}

async function scrollThrough (page: Page): Promise<void> {
  const MAX_SCROLLS = 10
  const TIMEOUT_BETWEEN_SCROLLS_MS = 400

  await page.evaluate(
    async (maxScrolls, timeoutBetweenScrollsMs) => {
      let oldScrollY: number = 0
      let newScrollY: number = 0
      let count = 0

      do {
        oldScrollY = window.scrollY
        window.scrollBy(0, window.innerHeight)
        newScrollY = window.scrollY
        // Wait for the page to render previously loaded images
        // as they are only displayed when visible also content dependent on
        // intersection observers etc...
        await new Promise((resolve) => setTimeout(resolve, timeoutBetweenScrollsMs))
      } while (oldScrollY < newScrollY && count++ < maxScrolls)
    },
    MAX_SCROLLS,
    TIMEOUT_BETWEEN_SCROLLS_MS
  )
}
