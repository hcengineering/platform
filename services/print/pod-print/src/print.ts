//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { MeasureContext } from '@hcengineering/core'
import puppeteer, { Page, Viewport } from 'puppeteer'

import config from './config'

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
 * @returns Buffer with the printed content.
 */
export async function print (
  ctx: MeasureContext,
  url: string,
  options?: PrintOptions,
  readonlyToken?: string
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
  let timedOut = false
  let closing: Promise<void> | undefined
  const close = (): Promise<void> => {
    closing ??= browser.close()
    return closing
  }
  const deadline = setTimeout(() => {
    timedOut = true
    void close().catch(() => {})
  }, 120000)
  try {
    const page = await browser.newPage()
    let renderError: string | undefined

    page
      .on('pageerror', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        renderError ??= message
        ctx.warn('pageerror', { message })
      })
      .on('requestfailed', (request) => {
        ctx.warn('requestfailed', { url: request.url(), errorText: request.failure()?.errorText })
      })

    if (readonlyToken !== undefined) {
      await page.evaluateOnNewDocument(
        (target: string, token: string) => {
          if (window.top === window && window.location.href === target) sessionStorage.setItem('print-token', token)
        },
        url,
        readonlyToken
      )
    }
    await page.setViewport(viewport)

    await page.goto(url, {
      waitUntil: 'domcontentloaded'
    })
    await waitForInitialNetworkIdle(ctx, page)

    if (readonlyToken !== undefined) await waitForPrintReady(page)
    await waitForContentReady(ctx, page, readonlyToken !== undefined)

    if (kind === 'pdf') {
      await page.emulateMediaType('print')
      // Wait for two animation frames: the first applies the print media query and the second
      // lets reactive UI state update the layout. Resource readiness is handled separately below.
      await waitForPrintLayout(page)
      // Scroll through the entire page to render lazy content, such as images.
      await scrollThrough(page)
    }
    await waitForImages(page)
    if (readonlyToken === undefined) await waitForMermaidDiagrams(ctx, page)
    if (readonlyToken !== undefined) await waitForPrintReady(page)
    if (readonlyToken !== undefined && renderError !== undefined) throw new Error(renderError)

    let res: Uint8Array | undefined
    if (kind === 'pdf') {
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
          timeout: 60000,
          waitForFonts: true,
          headerTemplate: pageHeader,
          footerTemplate: pageFooter,
          displayHeaderFooter,
          margin: {
            top: pageHeader !== '' ? '2cm' : '1.5cm',
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

    return res !== undefined ? Buffer.from(res) : undefined
  } catch (error) {
    if (timedOut) throw new Error('Print timed out')
    throw error
  } finally {
    clearTimeout(deadline)
    await close()
  }
}

async function waitForPrintReady (page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const root = document.querySelector<HTMLElement>('[data-print-root]')
      return root?.dataset.printState === 'ready' || root?.dataset.printState === 'error'
    },
    { timeout: 60000 }
  )
  const failed = await page.$eval('[data-print-root]', (root) => root.getAttribute('data-print-state') === 'error')
  if (failed) throw new Error('Print document could not be opened')
}

async function waitForInitialNetworkIdle (ctx: MeasureContext, page: Page): Promise<void> {
  try {
    await page.waitForNetworkIdle({
      idleTime: 1000,
      concurrency: 2,
      timeout: 10000
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    ctx.warn('page network did not become idle before PDF generation', { message })
  }
}

async function waitForPrintLayout (page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          resolve()
        })
      })
    })
  })
}

async function waitForContentReady (ctx: MeasureContext, page: Page, required: boolean = false): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const pendingContent = document.querySelectorAll<HTMLElement>('[aria-busy="true"]')
        return Array.from(pendingContent).every((element) => element.getClientRects().length === 0)
      },
      { timeout: 30000 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (required) throw new Error('Document content did not finish loading')
    ctx.warn('page content did not finish loading before PDF generation', { message })
  }
}

async function scrollThrough (page: Page): Promise<void> {
  const TIMEOUT_BETWEEN_SCROLLS_MS = 400

  await page.evaluate(async (timeoutBetweenScrollsMs) => {
    const scrollingElement = document.scrollingElement ?? document.documentElement
    let previousScrollY = -1

    window.scrollTo(0, 0)

    while (window.scrollY + window.innerHeight < scrollingElement.scrollHeight) {
      if (window.scrollY === previousScrollY) break

      previousScrollY = window.scrollY
      window.scrollBy(0, window.innerHeight)

      // Wait for lazy content and intersection observers to react to the new viewport.
      await new Promise((resolve) => setTimeout(resolve, timeoutBetweenScrollsMs))

      // The document can grow while lazy content is added, so read scrollHeight every iteration.
    }

    window.scrollTo(0, 0)
  }, TIMEOUT_BETWEEN_SCROLLS_MS)
}

async function waitForImages (page: Page): Promise<void> {
  await page.evaluate(async () => {
    const IMAGE_LOAD_TIMEOUT_MS = 10000

    await Promise.all(
      Array.from(document.images).map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            image.addEventListener(
              'load',
              () => {
                resolve()
              },
              { once: true }
            )
            image.addEventListener(
              'error',
              () => {
                resolve()
              },
              { once: true }
            )
            window.setTimeout(resolve, IMAGE_LOAD_TIMEOUT_MS)
          })
        }

        try {
          await Promise.race([
            image.decode(),
            new Promise<void>((resolve) => window.setTimeout(resolve, IMAGE_LOAD_TIMEOUT_MS))
          ])
        } catch {
          // A failed image request should not prevent the rest of the document from being exported.
        }
      })
    )
  })
}

async function waitForMermaidDiagrams (ctx: MeasureContext, page: Page): Promise<void> {
  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll<HTMLElement>('.proseMermaidDiagram')).every(
          (diagram) => diagram.dataset.mermaidRenderState !== 'pending'
        ),
      { timeout: 10000 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    ctx.warn('mermaid diagrams were not ready before PDF generation', { message })
  }
}
