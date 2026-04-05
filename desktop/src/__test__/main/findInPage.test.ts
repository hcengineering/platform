//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { WebContents } from 'electron'
import { IpcMessage } from '../../ui/ipcMessages'

type IpcHandlerFn = (...args: any[]) => any

/** Captured ipcMain.handle / ipcMain.on callbacks for assertions. */
const ipcHandlers = new Map<string, IpcHandlerFn>()

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel: string, handler: (...args: any[]) => any) => {
      ipcHandlers.set(channel, handler)
    }),
    on: jest.fn((channel: string, handler: (...args: any[]) => any) => {
      ipcHandlers.set(`on:${channel}`, handler)
    })
  },
  BrowserWindow: {
    fromWebContents: jest.fn()
  },
  BrowserView: jest.fn()
}))

function makeWebContents (partial: {
  id: number
  destroyed?: boolean
  findInPage?: jest.Mock
  stopFindInPage?: jest.Mock
  send?: jest.Mock
}): WebContents {
  return {
    id: partial.id,
    isDestroyed: () => partial.destroyed ?? false,
    findInPage: partial.findInPage ?? jest.fn(),
    stopFindInPage: partial.stopFindInPage ?? jest.fn(),
    send: partial.send ?? jest.fn()
  } as unknown as WebContents
}

describe('findInPage main IPC', () => {
  let originalConsoleError: typeof console.error
  let registerFindInPageIpcHandlers: () => void
  let registerFindInPageTarget: (overlayWc: WebContents, pageWc: WebContents) => void

  beforeEach(async () => {
    ipcHandlers.clear()
    jest.resetModules()
    originalConsoleError = console.error
    console.error = jest.fn()
    const m = await import('../../main/findInPage')
    registerFindInPageIpcHandlers = m.registerFindInPageIpcHandlers
    registerFindInPageTarget = m.registerFindInPageTarget
    registerFindInPageIpcHandlers()
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  test('FindInPage clears selection and returns -1 for empty text', async () => {
    const stopFindInPage = jest.fn()
    const findInPage = jest.fn()
    const sender = makeWebContents({ id: 10, stopFindInPage, findInPage })
    const handler = ipcHandlers.get(IpcMessage.FindInPage)
    expect(handler).toBeDefined()
    const result = await handler?.({ sender }, '', {})
    expect(result).toBe(-1)
    expect(stopFindInPage).toHaveBeenCalledWith('clearSelection')
    expect(findInPage).not.toHaveBeenCalled()
  })

  test('FindInPage runs on page webContents when overlay is registered as invoker', async () => {
    const pageFindInPage = jest.fn().mockResolvedValue(7)
    const pageStop = jest.fn()
    const pageWc = makeWebContents({ id: 1, findInPage: pageFindInPage, stopFindInPage: pageStop })
    const overlayWc = makeWebContents({ id: 2 })
    registerFindInPageTarget(overlayWc, pageWc)

    const handler = ipcHandlers.get(IpcMessage.FindInPage)
    const result = await handler?.({ sender: overlayWc }, 'needle', { forward: true, findNext: false })
    expect(result).toBe(7)
    expect(pageFindInPage).toHaveBeenCalledWith('needle', { forward: true, findNext: false })
  })

  test('FindInPage returns -1 when target webContents is destroyed', async () => {
    const findInPage = jest.fn()
    const sender = makeWebContents({ id: 20, destroyed: true, findInPage })
    const handler = ipcHandlers.get(IpcMessage.FindInPage)
    const result = await handler?.({ sender }, 'x', {})
    expect(result).toBe(-1)
    expect(findInPage).not.toHaveBeenCalled()
  })

  test('FindInPage returns -1 when findInPage throws', async () => {
    const findInPage = jest.fn().mockImplementation(() => {
      throw new Error('find failed')
    })
    const sender = makeWebContents({ id: 30, findInPage })
    const handler = ipcHandlers.get(IpcMessage.FindInPage)
    const result = await handler?.({ sender }, 'x', {})
    expect(result).toBe(-1)
  })

  test('StopFindInPage no-ops when webContents is destroyed', async () => {
    const stopFindInPage = jest.fn()
    const sender = makeWebContents({ id: 40, destroyed: true, stopFindInPage })
    const handler = ipcHandlers.get(IpcMessage.StopFindInPage)
    await handler?.({ sender }, 'clearSelection')
    expect(stopFindInPage).not.toHaveBeenCalled()
  })

  test('StopFindInPage forwards to resolveFindTarget', async () => {
    const stopFindInPage = jest.fn()
    const sender = makeWebContents({ id: 50, stopFindInPage })
    const handler = ipcHandlers.get(IpcMessage.StopFindInPage)
    await handler?.({ sender }, 'keepSelection')
    expect(stopFindInPage).toHaveBeenCalledWith('keepSelection')
  })
})
