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

const mockApp = { removeAllListeners: jest.fn() }
const mockDialog = { showMessageBox: jest.fn() }

jest.mock('electron', () => ({ app: mockApp, dialog: mockDialog }))
jest.mock('electron-log', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}))

// Virtual: the module is resolved lazily so the test does not depend on the install layout
jest.mock(
  'builder-util-runtime',
  () => ({
    CancellationToken: class {
      cancelled = false
      private readonly handlers: Array<() => void> = []
      cancel (): void {
        this.cancelled = true
        this.handlers.forEach((h) => h())
      }

      onCancel (h: () => void): void {
        this.handlers.push(h)
      }
    }
  }),
  { virtual: true }
)

jest.mock('../../main/updater', () => {
  const { EventEmitter } = require('events')
  const emitter: any = new EventEmitter()
  emitter.setFeedURL = jest.fn()
  emitter.checkForUpdates = jest.fn()
  emitter.downloadUpdate = jest.fn()
  emitter.quitAndInstall = jest.fn()
  return { __esModule: true, default: emitter }
})

import autoUpdaterImport from '../../main/updater'
import { setupUpdateManager } from '../../main/updateManager'

const autoUpdater: any = autoUpdaterImport

const STALL_MS = 60_000

describe('updateManager', () => {
  let mainWindow: any
  let quitApplication: jest.Mock
  let manager: ReturnType<typeof setupUpdateManager>
  let lastToken: any
  let lastReject: ((e: Error) => void) | undefined

  const flush = async (): Promise<void> => {
    await Promise.resolve()
    await Promise.resolve()
  }

  beforeEach(() => {
    jest.useFakeTimers()
    autoUpdater.removeAllListeners()
    mockApp.removeAllListeners.mockReset()
    mockDialog.showMessageBox.mockReset().mockResolvedValue({ response: 0 })

    mainWindow = {
      setProgressBar: jest.fn(),
      removeAllListeners: jest.fn(),
      webContents: { send: jest.fn() }
    }
    quitApplication = jest.fn()
    lastToken = undefined
    lastReject = undefined

    autoUpdater.setFeedURL.mockReset()
    autoUpdater.checkForUpdates.mockReset().mockResolvedValue(undefined)
    autoUpdater.quitAndInstall.mockReset()
    // Download never finishes on its own, but rejects when cancelled (like electron-updater does)
    autoUpdater.downloadUpdate.mockReset().mockImplementation(
      async (token: any) =>
        await new Promise((_resolve, reject) => {
          lastToken = token
          lastReject = reject
          token.onCancel(() => reject(new Error('cancelled')))
        })
    )

    manager = setupUpdateManager({ getMainWindow: () => mainWindow, quitApplication })
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  const available = (version = '1.2.3'): void => {
    autoUpdater.emit('update-available', { version })
  }

  it('configures the feed and checks for updates on start', () => {
    manager.start({ url: 'https://dist.example', channel: 'stable' })

    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'https://dist.example',
      channel: 'stable'
    })
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('starts the download, resets progress to 0 and shows the dialog once', () => {
    available()
    available()

    expect(autoUpdater.downloadUpdate).toHaveBeenCalledTimes(1)
    expect(mockDialog.showMessageBox).toHaveBeenCalledTimes(1)
    expect(mainWindow.setProgressBar).toHaveBeenCalledWith(0)
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('handle-update-download-progress', 0)
  })

  it('quits the application when the user declines the update', async () => {
    mockDialog.showMessageBox.mockResolvedValue({ response: 1 })
    available()
    await flush()

    expect(quitApplication).toHaveBeenCalledTimes(1)
  })

  it('forwards download progress to the window', () => {
    available()
    autoUpdater.emit('download-progress', { percent: 42 })

    expect(mainWindow.setProgressBar).toHaveBeenLastCalledWith(0.42)
    expect(mainWindow.webContents.send).toHaveBeenLastCalledWith('handle-update-download-progress', 42)
  })

  it('cancels a stalled download and retries the update check', async () => {
    available()

    jest.advanceTimersByTime(STALL_MS)
    await flush()

    expect(lastToken.cancelled).toBe(true)
    expect(mainWindow.setProgressBar).toHaveBeenLastCalledWith(-1)
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()

    jest.advanceTimersByTime(10_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('does not cancel while progress keeps arriving', () => {
    available()

    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(STALL_MS - 1000)
      autoUpdater.emit('download-progress', { percent: i + 1 })
    }

    expect(lastToken.cancelled).toBe(false)
  })

  it('resets progress and retries with growing backoff on errors', () => {
    autoUpdater.emit('error', new Error('network'))

    expect(mainWindow.setProgressBar).toHaveBeenLastCalledWith(-1)

    jest.advanceTimersByTime(9_999)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(0)
    jest.advanceTimersByTime(1)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)

    autoUpdater.emit('error', new Error('network'))
    jest.advanceTimersByTime(29_999)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(1)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2)
  })

  it('caps the backoff at 5 minutes', () => {
    const delays = [10_000, 30_000, 60_000, 300_000, 300_000]
    delays.forEach((delay, i) => {
      autoUpdater.emit('error', new Error('network'))
      jest.advanceTimersByTime(delay - 1)
      expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(i)
      jest.advanceTimersByTime(1)
      expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(i + 1)
    })
  })

  it('schedules only one retry when error and failed check come together', async () => {
    autoUpdater.checkForUpdates.mockRejectedValueOnce(new Error('boom'))
    manager.start({ url: 'u', channel: 'c' })
    autoUpdater.emit('error', new Error('boom'))
    await flush()

    jest.advanceTimersByTime(10_000)
    // initial call from start() + exactly one retry
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2)
  })

  it('retries when the update check itself fails', async () => {
    autoUpdater.checkForUpdates.mockRejectedValueOnce(new Error('offline'))
    manager.start({ url: 'u', channel: 'c' })
    await flush()

    jest.advanceTimersByTime(10_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2)
  })

  it('keeps growing the backoff when a download fails after progress', async () => {
    // A download that reaches 100% and then fails must not restart every 10s
    available()
    autoUpdater.emit('download-progress', { percent: 100 })
    lastReject?.(new Error('network'))
    await flush()
    jest.advanceTimersByTime(10_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)

    available()
    autoUpdater.emit('download-progress', { percent: 100 })
    lastReject?.(new Error('network'))
    await flush()
    jest.advanceTimersByTime(29_999)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(1)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2)
  })

  it('resets the backoff after a successful download', () => {
    autoUpdater.emit('error', new Error('network'))
    jest.advanceTimersByTime(10_000)
    autoUpdater.emit('error', new Error('network'))
    jest.advanceTimersByTime(30_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2)

    autoUpdater.emit('update-downloaded', {})
    autoUpdater.emit('error', new Error('network'))
    jest.advanceTimersByTime(10_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(3)
  })

  const failDownload = async (code?: string): Promise<void> => {
    available()
    autoUpdater.emit('download-progress', { percent: 100 })
    lastReject?.(Object.assign(new Error('failed'), { code }))
    await flush()
  }

  it.each(['ERR_CHECKSUM_MISMATCH', 'ERR_UPDATER_INVALID_SIGNATURE'])(
    'does not re-download a broken release right away (%s)',
    async (code) => {
      // The first occurrence may be accidental: regular backoff
      await failDownload(code)
      expect(mainWindow.setProgressBar).toHaveBeenLastCalledWith(-1)
      jest.advanceTimersByTime(10_000)
      expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)

      // The same error again: the release is broken, wait an hour
      await failDownload(code)
      jest.advanceTimersByTime(60 * 60_000 - 1)
      expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
      jest.advanceTimersByTime(1)
      expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2)
    }
  )

  it('needs the same permanent error in a row to back off for an hour', async () => {
    await failDownload('ERR_CHECKSUM_MISMATCH')
    jest.advanceTimersByTime(10_000)
    await failDownload() // transient error in between
    jest.advanceTimersByTime(30_000)
    await failDownload('ERR_CHECKSUM_MISMATCH')
    jest.advanceTimersByTime(60_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(3)
  })

  it('resets the backoff when there is no update', () => {
    autoUpdater.emit('error', new Error('offline'))
    jest.advanceTimersByTime(10_000)
    autoUpdater.emit('error', new Error('offline'))
    jest.advanceTimersByTime(30_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2)

    autoUpdater.emit('update-not-available', {})
    autoUpdater.emit('error', new Error('offline'))
    jest.advanceTimersByTime(10_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(3)
  })

  it('does not show another dialog when a failed attempt is retried', async () => {
    available()
    lastReject?.(new Error('network'))
    await flush()
    jest.advanceTimersByTime(10_000)
    available()

    expect(autoUpdater.downloadUpdate).toHaveBeenCalledTimes(2)
    expect(mockDialog.showMessageBox).toHaveBeenCalledTimes(1)
  })

  it('does not touch a running download on an unrelated error', () => {
    available()
    mainWindow.setProgressBar.mockClear()

    autoUpdater.emit('error', new Error('update check failed'))
    expect(mainWindow.setProgressBar).not.toHaveBeenCalledWith(-1)

    jest.advanceTimersByTime(10_000)
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()

    // the stall watchdog of the running download is still armed
    jest.advanceTimersByTime(STALL_MS)
    expect(lastToken.cancelled).toBe(true)
  })

  it('handles a failing download once: error event followed by rejection', async () => {
    available()
    autoUpdater.emit('error', new Error('download failed'))
    lastReject?.(new Error('download failed'))
    await flush()

    expect(mainWindow.setProgressBar).toHaveBeenLastCalledWith(-1)
    jest.advanceTimersByTime(10_000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('does not start a second download while one is in flight', () => {
    available()
    mainWindow.setProgressBar.mockClear()
    available()

    expect(autoUpdater.downloadUpdate).toHaveBeenCalledTimes(1)
    expect(mainWindow.setProgressBar).not.toHaveBeenCalled()
  })

  it('installs the update when download completes and stops the stall watchdog', () => {
    available()
    autoUpdater.emit('update-downloaded', {})

    expect(mockApp.removeAllListeners).toHaveBeenCalledWith('window-all-closed')
    expect(mainWindow.removeAllListeners).toHaveBeenCalledWith('close')
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(STALL_MS * 2)
    expect(lastToken.cancelled).toBe(false)
  })

  it('tolerates a missing main window', () => {
    mainWindow = undefined

    expect(() => {
      available()
      autoUpdater.emit('download-progress', { percent: 10 })
      autoUpdater.emit('error', new Error('x'))
      autoUpdater.emit('update-downloaded', {})
    }).not.toThrow()
  })
})
