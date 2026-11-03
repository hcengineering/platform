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

import { CancellationToken } from 'builder-util-runtime'
import { BrowserWindow, app, dialog } from 'electron'
import log from 'electron-log'
import { ProgressInfo, UpdateInfo } from 'electron-updater'

import { IpcMessage } from '../ui/ipcMessages'
import autoUpdater from './updater'

const STALL_TIMEOUT_MS = 60_000
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000, 300_000]
// Errors that a quick retry cannot fix: the published release itself is broken
// (e.g. the manifest describes a different build than the uploaded file).
// Re-downloading the whole update every few seconds only burns traffic,
// so such a release is re-checked rarely, in case it gets re-published.
// A single occurrence may still be accidental (e.g. the file was replaced while
// it was being downloaded), so the long delay applies only when the same error repeats.
const PERMANENT_ERROR_RETRY_DELAY_MS = 60 * 60_000
const PERMANENT_ERROR_REPEATS = 2
const PERMANENT_ERROR_CODES = new Set([
  'ERR_CHECKSUM_MISMATCH',
  'ERR_UPDATER_INVALID_SIGNATURE',
  'ERR_UPDATER_ZIP_FILE_NOT_FOUND',
  'ERR_UPDATER_NO_CHECKSUM',
  'ERR_UPDATER_NO_FILES_PROVIDED',
  'ERR_UPDATER_INVALID_UPDATE_INFO'
])

function permanentErrorCode (err: any): string | undefined {
  return typeof err?.code === 'string' && PERMANENT_ERROR_CODES.has(err.code) ? err.code : undefined
}

export interface UpdateManagerDeps {
  getMainWindow: () => BrowserWindow | undefined
  quitApplication: () => void
}

export interface UpdateManager {
  /** Configure the update feed and start checking for updates. */
  start: (feed: { url: string, channel: string }) => void
}

/**
 * Wires up auto-update flow: manual download start (autoDownload is disabled in ./updater),
 * stall detection, retries with backoff and progress reporting to the renderer.
 * The backoff grows with every failed attempt and is reset only by a successful download
 * (or when there is nothing to update), so a download that keeps failing at the end
 * does not restart every few seconds.
 * Must be called once.
 */
export function setupUpdateManager ({ getMainWindow, quitApplication }: UpdateManagerDeps): UpdateManager {
  // The dialog is shown once per app run: retries must not stack new (non-modal) dialogs
  let dialogShown = false
  let retryAttempt = 0
  // Consecutive failures with the same permanent error code
  let permanentErrorCount = 0
  let lastPermanentErrorCode: string | undefined
  let retryTimer: NodeJS.Timeout | undefined
  let stallTimer: NodeJS.Timeout | undefined
  let downloadToken: CancellationToken | undefined

  function setDownloadProgress (percent: number): void {
    const mainWindow = getMainWindow()
    if (mainWindow === undefined) {
      return
    }
    mainWindow.setProgressBar(percent / 100)
    mainWindow.webContents.send(IpcMessage.HandleUpdateDownloadProgress, percent)
  }

  function clearStallTimer (): void {
    if (stallTimer !== undefined) {
      clearTimeout(stallTimer)
      stallTimer = undefined
    }
  }

  function armStallTimer (): void {
    clearStallTimer()
    stallTimer = setTimeout(() => {
      log.warn(`Update download made no progress for ${STALL_TIMEOUT_MS}ms, cancelling`)
      downloadToken?.cancel()
    }, STALL_TIMEOUT_MS)
  }

  function resetDownloadState (): void {
    clearStallTimer()
    downloadToken = undefined
    getMainWindow()?.setProgressBar(-1)
  }

  function resetRetryState (): void {
    retryAttempt = 0
    permanentErrorCount = 0
    lastPermanentErrorCode = undefined
  }

  function scheduleRetry (err?: any): void {
    if (retryTimer !== undefined) return
    const code = permanentErrorCode(err)
    if (code === undefined) {
      permanentErrorCount = 0
    } else if (code === lastPermanentErrorCode) {
      permanentErrorCount++
    } else {
      permanentErrorCount = 1
    }
    lastPermanentErrorCode = code
    const permanent = permanentErrorCount >= PERMANENT_ERROR_REPEATS
    const delay = permanent
      ? PERMANENT_ERROR_RETRY_DELAY_MS
      : RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)]
    retryAttempt++
    if (permanent) {
      log.error(`Published update is broken (${code as string} ${permanentErrorCount} times in a row), not retrying it right away`)
    }
    log.info(`Retrying update check in ${delay}ms (attempt ${retryAttempt})`)
    retryTimer = setTimeout(() => {
      retryTimer = undefined
      void checkForUpdates()
    }, delay)
  }

  async function checkForUpdates (): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err: any) {
      // 'error' event is emitted as well and schedules the retry
      log.error('Update check failed', err)
      scheduleRetry(err)
    }
  }

  /** @returns false if a download is already in flight */
  function startDownload (): boolean {
    if (downloadToken !== undefined) return false
    const token = new CancellationToken()
    downloadToken = token
    armStallTimer()
    autoUpdater.downloadUpdate(token).catch((err: any) => {
      log.error('Update download failed', err)
      if (downloadToken === token) {
        resetDownloadState()
        scheduleRetry(err)
      }
    })
    return true
  }

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    if (startDownload()) {
      setDownloadProgress(0)
    }

    if (dialogShown) return
    dialogShown = true

    void dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Update & Restart', 'Quit'],
        defaultId: 0,
        message: `A new version ${info.version} is available and it is required to continue. It will be downloaded and installed automatically.`
      })
      .then(({ response }: any) => {
        log.info(`Update dialog exit code: ${response}`) // eslint-disable-line no-console

        if (response !== 0) {
          quitApplication()
        }
      })
  })

  autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
    armStallTimer()
    setDownloadProgress(progressObj.percent)
  })

  autoUpdater.on('error', (err: any) => {
    // An error of a running download is followed by a rejection of downloadUpdate(),
    // which resets the state and schedules the retry. Other errors (e.g. a failed
    // update check) must not drop the token of a download that is still in flight.
    if (downloadToken !== undefined) return
    resetDownloadState()
    scheduleRetry(err)
  })

  autoUpdater.on('update-not-available', () => {
    resetRetryState()
  })

  autoUpdater.on('update-downloaded', (_info: any) => {
    clearStallTimer()
    resetRetryState()
    // We have listeners that prevents the app from being exited on mac
    app.removeAllListeners('window-all-closed')
    getMainWindow()?.removeAllListeners('close')

    autoUpdater.quitAndInstall()
  })

  return {
    start: ({ url, channel }) => {
      autoUpdater.setFeedURL({ provider: 'generic', url, channel })
      void checkForUpdates()
    }
  }
}
