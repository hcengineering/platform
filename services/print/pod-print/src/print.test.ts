//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { type MeasureContext } from '@hcengineering/core'

interface Deferred<T = void> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

function deferred<T = void> (): Deferred<T> {
  let _resolve!: (value: T | PromiseLike<T>) => void
  let _reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolve, reject) => {
    _resolve = resolve
    _reject = reject
  })
  return { promise, resolve: _resolve, reject: _reject }
}

async function flush (): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve))
}

function createCtx (): MeasureContext {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    with: jest.fn(
      async (_name: string, _metrics: object, fn: (ctx: MeasureContext) => Promise<any>) => await fn(createCtx())
    )
  } as any
}

function createPage (overrides: Partial<Record<string, jest.Mock>> = {}): any {
  const page = {
    on: jest.fn().mockReturnThis(),
    setViewport: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue(undefined),
    waitForNetworkIdle: jest.fn().mockResolvedValue(undefined),
    emulateMediaType: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue(''),
    pdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('png')),
    close: jest.fn().mockResolvedValue(undefined),
    ...overrides
  }

  return page
}

function createBrowser (pageFactory: () => any = () => createPage(), overrides: Record<string, jest.Mock> = {}): any {
  const browser: any = {
    connected: true,
    listeners: new Map<string, () => void>(),
    contexts: [] as any[],
    on: jest.fn((event: string, listener: () => void) => {
      browser.listeners.set(event, listener)
      return browser
    }),
    close: jest.fn(async () => {
      browser.connected = false
    }),
    createBrowserContext: jest.fn(async () => {
      const page = pageFactory()
      const context = {
        page,
        newPage: jest.fn(async () => page),
        close: jest.fn().mockResolvedValue(undefined)
      }
      browser.contexts.push(context)
      return context
    }),
    disconnect: () => {
      browser.connected = false
      browser.listeners.get('disconnected')?.()
    },
    ...overrides
  }

  return browser
}

async function loadPrintModule (
  launch: jest.Mock,
  printConcurrency = '1'
): Promise<{
    print: (ctx: MeasureContext, url: string, options?: import('./print').PrintOptions) => Promise<Buffer | undefined>
    closePrintBrowser: () => Promise<void>
  }> {
  jest.resetModules()
  process.env.SECRET = 'secret'
  process.env.ACCOUNTS_URL = 'http://accounts'
  process.env.FRONT_URL = 'http://front'
  process.env.PRINT_CONCURRENCY = printConcurrency

  jest.doMock('puppeteer', () => ({
    __esModule: true,
    default: {
      launch
    }
  }))

  const printModule = await import('./print')
  const { PrintBrowserManager } = await import('./browser')
  const browserManager = new PrintBrowserManager()

  return {
    print: async (ctx, url, options) => await printModule.print(ctx, url, options, browserManager),
    closePrintBrowser: async () => {
      await browserManager.close()
    }
  }
}

describe('print', () => {
  afterEach(() => {
    jest.dontMock('puppeteer')
    delete process.env.PRINT_CONCURRENCY
  })

  it('reuses the same browser for sequential print jobs', async () => {
    const browser = createBrowser()
    const launch = jest.fn().mockResolvedValue(browser)
    const { closePrintBrowser, print } = await loadPrintModule(launch)

    await print(createCtx(), 'http://example.com/one')
    await print(createCtx(), 'http://example.com/two')

    expect(launch).toHaveBeenCalledTimes(1)
    expect(browser.createBrowserContext).toHaveBeenCalledTimes(2)
    expect(browser.contexts[0].close).toHaveBeenCalledTimes(1)
    expect(browser.contexts[1].close).toHaveBeenCalledTimes(1)

    await closePrintBrowser()
  })

  it('serializes print jobs with PRINT_CONCURRENCY=1', async () => {
    const firstPdf = deferred<Buffer>()
    let pageCount = 0
    const browser = createBrowser(() => {
      pageCount++
      return createPage(pageCount === 1 ? { pdf: jest.fn(() => firstPdf.promise) } : {})
    })
    const launch = jest.fn().mockResolvedValue(browser)
    const { closePrintBrowser, print } = await loadPrintModule(launch)

    const first = print(createCtx(), 'http://example.com/one')
    await flush()

    const second = print(createCtx(), 'http://example.com/two')
    await flush()

    expect(browser.createBrowserContext).toHaveBeenCalledTimes(1)

    firstPdf.resolve(Buffer.from('first'))
    await first
    await second

    expect(browser.createBrowserContext).toHaveBeenCalledTimes(2)

    await closePrintBrowser()
  })

  it('closes context and releases the semaphore when rendering fails', async () => {
    let pageCount = 0
    const browser = createBrowser(() => {
      pageCount++
      return createPage(pageCount === 1 ? { pdf: jest.fn().mockRejectedValue(new Error('pdf failed')) } : {})
    })
    const launch = jest.fn().mockResolvedValue(browser)
    const { closePrintBrowser, print } = await loadPrintModule(launch)

    await expect(print(createCtx(), 'http://example.com/fail')).rejects.toThrow('pdf failed')
    await print(createCtx(), 'http://example.com/next')

    expect(browser.contexts[0].close).toHaveBeenCalledTimes(1)
    expect(browser.createBrowserContext).toHaveBeenCalledTimes(2)

    await closePrintBrowser()
  })

  it('launches a new browser after disconnect', async () => {
    const firstBrowser = createBrowser()
    const secondBrowser = createBrowser()
    const launch = jest.fn().mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser)
    const { closePrintBrowser, print } = await loadPrintModule(launch)

    await print(createCtx(), 'http://example.com/one')
    firstBrowser.disconnect()
    await print(createCtx(), 'http://example.com/two')

    expect(launch).toHaveBeenCalledTimes(2)
    expect(firstBrowser.createBrowserContext).toHaveBeenCalledTimes(1)
    expect(secondBrowser.createBrowserContext).toHaveBeenCalledTimes(1)

    await closePrintBrowser()
  })

  it('launches a new browser when the cached browser cannot create a page', async () => {
    const firstBrowser = createBrowser()
    const secondBrowser = createBrowser()
    const launch = jest.fn().mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser)
    const { closePrintBrowser, print } = await loadPrintModule(launch)

    await print(createCtx(), 'http://example.com/one')
    firstBrowser.createBrowserContext.mockRejectedValueOnce(new Error('browser is not responding'))
    await print(createCtx(), 'http://example.com/two')

    expect(launch).toHaveBeenCalledTimes(2)
    expect(firstBrowser.close).toHaveBeenCalledTimes(1)
    expect(secondBrowser.createBrowserContext).toHaveBeenCalledTimes(1)

    await closePrintBrowser()
  })

  it('closes the hot browser on shutdown', async () => {
    const browser = createBrowser()
    const launch = jest.fn().mockResolvedValue(browser)
    const { closePrintBrowser, print } = await loadPrintModule(launch)

    await print(createCtx(), 'http://example.com/one')
    await closePrintBrowser()
    await closePrintBrowser()

    expect(browser.close).toHaveBeenCalledTimes(1)
  })
})
