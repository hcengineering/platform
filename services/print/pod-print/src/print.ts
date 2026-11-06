//
// Copyright © 2024 Hardcore Engineering Inc.
//
import { MeasureContext } from '@hcengineering/core'
import puppeteer, { Page, Target, Viewport } from 'puppeteer'

import config from './config'
import { isNavigationResourceType, isUnexpectedTarget } from './hostnames'

export interface PrintOptions {
  kind?: ExportKind
  orientation?: PageOrientation
  viewport?: Viewport
}

export const validKinds = ['pdf', 'jpeg', 'png', 'webp'] as const
export const validPageOrientations = ['portrait', 'landscape'] as const

export type ExportKind = (typeof validKinds)[number]
export type PageOrientation = (typeof validPageOrientations)[number]

/**
 * Prints a webpage with the specified options
 * @public
 * @param url - The URL of the webpage to print.
 * @param options - The options to use when printing the webpage.
 * @param isAllowedRequest - Optional check for every request made while rendering, including redirects, frames,
 *   popups and workers.
 * @returns Buffer with the printed content.
 */
export async function print (
  ctx: MeasureContext,
  url: string,
  options?: PrintOptions,
  isAllowedRequest?: (url: string, isNavigation: boolean) => boolean
): Promise<Buffer | undefined> {
  const kind = options?.kind ?? 'pdf'
  const orientation = options?.orientation ?? 'portrait'
  const viewport = options?.viewport ?? { width: 1440, height: 900 }

  ctx.info('print', { url, kind, orientation, viewport })

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
  let res: Uint8Array | undefined
  try {
    const page = await browser.newPage()

    page
      .on('pageerror', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        ctx.warn('pageerror', { message })
      })
      .on('requestfailed', (request) => {
        ctx.warn('requestfailed', { url: request.url(), errorText: request.failure()?.errorText })
      })

    if (isAllowedRequest !== undefined) {
      // Requests are intercepted for the whole browser, so popups and service or shared workers
      // started by the page are covered as well, not only the rendered page.
      const session = await browser.target().createCDPSession()
      session.on('Fetch.requestPaused', (event) => {
        const { requestId, request, resourceType } = event
        let allowed = false
        try {
          allowed = isAllowedRequest(request.url, isNavigationResourceType(resourceType))
        } catch (err: any) {
          ctx.warn('Failed to check request', { url: request.url, err })
        }
        if (allowed) {
          void session.send('Fetch.continueRequest', { requestId }).catch(() => {})
          return
        }
        ctx.warn('Blocked request to unexpected link', { url: request.url })
        void session.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {})
      })
      await session.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
    }

    // Printing never needs popups or additional pages
    browser.on('targetcreated', (target: Target) => {
      if (!isUnexpectedTarget(target.type(), target === page.target())) return
      ctx.warn('Closing unexpected page', { url: target.url() })
      void target
        .page()
        .then((it) => it?.close())
        .catch(() => {})
    })
    await page.setBypassServiceWorker(true)

    await page.setViewport(viewport)

    // NOTE: Issues opened with a guest link worked fine only with networkidle0 here and
    // waitForNetworkIdle 1000 afterwards. Also tried 700 but sometimes it was not enough.
    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    })
    await page.waitForNetworkIdle({ idleTime: 1000 })

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
      res = await ctx.with('screenshot', { kind }, () => page.screenshot({ type: kind }))
    }
  } finally {
    await browser.close()
  }

  return res !== undefined ? Buffer.from(res) : undefined
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
