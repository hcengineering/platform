//
// Copyright © 2024 Hardcore Engineering Inc.
//
import { MeasureContext } from '@hcengineering/core'
import puppeteer, { Page, Viewport } from 'puppeteer'

import config from './config'

export interface PrintOptions {
  kind?: ExportKind
  viewport?: Viewport
}

export const validKinds = ['pdf', 'jpeg', 'png', 'webp'] as const

export type ExportKind = (typeof validKinds)[number]

/**
 * Prints a webpage with the specified options
 * @public
 * @param url - The URL of the webpage to print.
 * @param options - The options to use when printing the webpage.
 * @returns Buffer with the printed content.
 */
export async function print (ctx: MeasureContext, url: string, options?: PrintOptions): Promise<Buffer | undefined> {
  const kind = options?.kind ?? 'pdf'
  const viewport = options?.viewport ?? { width: 1440, height: 900 }

  ctx.info('print', { url, kind, viewport })

  // TODO: think of having a "hot" browser instance to avoid the overhead of launching a new one every time
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-setuid-sandbox',
      ...config.PuppeteerArgs
    ]
  })
  const page = await browser.newPage()

  page
    .on('pageerror', ({ message }) => {
      ctx.warn('pageerror', { message })
    })
    .on('requestfailed', (request) => {
      ctx.warn('requestfailed', { url: request.url(), errorText: request.failure()?.errorText })
    })

  await page.setViewport(viewport)

  // NOTE: Issues opened with a guest link worked fine only with networkidle0 here and
  // waitForNetworkIdle 1000 afterwards. Also tried 700 but sometimes it was not enough.
  await page.goto(url, {
    waitUntil: ['domcontentloaded', 'networkidle0']
  })
  await page.waitForNetworkIdle({ idleTime: 1000 })

  let res: Buffer | undefined

  if (kind === 'pdf') {
    await page.emulateMediaType('print')
    // Scroll throught the page to render all the content (e.g. as images are only rendered
    // when they are visible in the viewport)
    await scrollThrough(page)

    // Read page header and footer if defined
    const pageHeader = await page.evaluate(() => {
      const header = document.querySelector('#page-header')
      return header?.innerHTML ?? ''
    })

    const pageFooter = await page.evaluate(() => {
      const footer = document.querySelector('#page-footer')
      return footer?.innerHTML ?? ''
    })

    const displayHeaderFooter = pageHeader !== '' || pageFooter !== ''

    res = await ctx.with('pdf', {}, () =>
      page.pdf({
        format: 'A4',
        landscape: false,
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
    res = await ctx.with('screenshot', { kind }, () => page.screenshot({ type: kind }))
  }

  await browser.close()

  return res
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
