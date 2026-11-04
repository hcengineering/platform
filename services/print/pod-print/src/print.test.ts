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

import { MeasureMetricsContext } from '@hcengineering/core'
import puppeteer, { type Browser, type JSHandle, type Page } from 'puppeteer'
import { print } from './print'

jest.mock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn() } }))
jest.mock('./config', () => ({ __esModule: true, default: { PuppeteerArgs: [] } }))

describe('isolated print session', () => {
  const page: Partial<Page> = {
    on: jest.fn().mockReturnThis(),
    setViewport: jest.fn(),
    goto: jest.fn(),
    evaluateOnNewDocument: jest.fn(),
    waitForNetworkIdle: jest.fn(),
    waitForFunction: jest.fn(),
    $eval: jest.fn(),
    evaluate: jest.fn(),
    emulateMediaType: jest.fn(),
    pdf: jest.fn(),
    screenshot: jest.fn()
  }
  const browser: Partial<Browser> = { newPage: jest.fn(), close: jest.fn() }
  const ctx = new MeasureMetricsContext('test', {})

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(puppeteer, 'launch').mockResolvedValue(browser as Browser)
    jest.mocked(browser.newPage!).mockResolvedValue(page as Page)
    jest.mocked(page.$eval!).mockResolvedValue(false)
    jest.mocked(page.evaluate!).mockResolvedValue('')
    jest.mocked(page.pdf!).mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
    jest.mocked(page.screenshot!).mockResolvedValue(new Uint8Array([1]))
  })

  it('initializes authorization outside the URL and closes the browser', async () => {
    const url = 'https://front.example/print/workspace?objectId=document'
    const result = await print(ctx, url, {}, 'readonly-token')
    expect(page.evaluateOnNewDocument).toHaveBeenCalledWith(expect.any(Function), url, 'readonly-token')
    expect(page.goto).toHaveBeenCalledWith(url, { waitUntil: 'domcontentloaded' })
    expect(page.pdf).toHaveBeenCalled()
    expect(result?.toString()).toBe('%PDF')
    expect(browser.close).toHaveBeenCalledTimes(1)
  })

  it('does not produce a PDF of an authentication or document failure page', async () => {
    jest.mocked(page.$eval!).mockResolvedValue(true)
    await expect(print(ctx, 'https://front.example/print/workspace', {}, 'readonly-token')).rejects.toThrow(
      'could not be opened'
    )
    expect(page.pdf).not.toHaveBeenCalled()
    expect(browser.close).toHaveBeenCalledTimes(1)
  })

  it('closes the browser when navigation fails', async () => {
    jest.mocked(page.goto!).mockRejectedValueOnce(new Error('Navigation failed'))
    await expect(print(ctx, 'https://front.example/print/workspace', {}, 'readonly-token')).rejects.toThrow(
      'Navigation failed'
    )
    expect(browser.close).toHaveBeenCalledTimes(1)
  })

  it.each(['pdf', 'png'] as const)('waits for content before producing %s', async (kind) => {
    let release = (): void => {}
    const gate = new Promise<JSHandle>((resolve) => {
      release = () => {
        const handle: Partial<JSHandle> = {}
        resolve(handle as JSHandle)
      }
    })
    const initial: Partial<JSHandle> = {}
    jest.mocked(page.waitForFunction!).mockResolvedValueOnce(initial as JSHandle)
    jest.mocked(page.waitForFunction!).mockReturnValueOnce(gate)
    const result = print(ctx, 'https://front.example/print/workspace', { kind }, 'readonly-token')
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    expect(page.pdf).not.toHaveBeenCalled()
    expect(page.screenshot).not.toHaveBeenCalled()
    release()
    await result
    if (kind === 'pdf') expect(page.pdf).toHaveBeenCalledTimes(1)
    else expect(page.screenshot).toHaveBeenCalledTimes(1)
  })

  it('rejects a rendering error that occurs after the first readiness check', async () => {
    jest.mocked(page.$eval!).mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    await expect(print(ctx, 'https://front.example/print/workspace', {}, 'readonly-token')).rejects.toThrow(
      'could not be opened'
    )
    expect(page.pdf).not.toHaveBeenCalled()
    expect(browser.close).toHaveBeenCalledTimes(1)
  })

  it('preserves Mermaid readiness for legacy link exports without a print context', async () => {
    let release = (): void => {}
    const gate = new Promise<JSHandle>((resolve) => {
      release = () => {
        const handle: Partial<JSHandle> = {}
        resolve(handle as JSHandle)
      }
    })
    const initial: Partial<JSHandle> = {}
    jest.mocked(page.waitForFunction!).mockResolvedValueOnce(initial as JSHandle)
    jest.mocked(page.waitForFunction!).mockReturnValueOnce(gate)
    const result = print(ctx, 'https://front.example/guest/workspace', { kind: 'png' })
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    expect(page.screenshot).not.toHaveBeenCalled()
    release()
    await result
    expect(page.screenshot).toHaveBeenCalledTimes(1)
  })

  it('rejects an uncaught main renderer failure before capturing the page', async () => {
    jest.mocked(page.waitForNetworkIdle!).mockImplementationOnce(async () => {
      const registered = jest.mocked(page.on!).mock.calls.find(([event]) => event === 'pageerror')
      const report = registered?.[1]
      if (report === undefined) throw new Error('Page error listener is missing')
      report(new Error('Editor initialization crashed'))
    })
    await expect(print(ctx, 'https://front.example/print/workspace', {}, 'readonly-token')).rejects.toThrow(
      'Editor initialization crashed'
    )
    expect(page.pdf).not.toHaveBeenCalled()
    expect(browser.close).toHaveBeenCalledTimes(1)
  })
})
