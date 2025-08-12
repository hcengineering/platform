//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { config as dotenvConfig } from 'dotenv'
import { BrowserWindow, CookiesSetDetails, Notification, app, desktopCapturer, dialog, ipcMain, nativeImage, session, shell, systemPreferences, nativeTheme } from 'electron'
import contextMenu from 'electron-context-menu'
import log from 'electron-log'
import Store from 'electron-store'
import { ProgressInfo, UpdateInfo } from 'electron-updater'
import WinBadge from 'electron-windows-badge'
import * as path from 'path'

import { Config, MenuBarAction, NotificationParams, JumpListSpares } from '../ui/types'
import { getOptions } from './args'
import { addMenus } from './standardMenu'
import { dipatchMenuBarAction } from './customMenu'
import { addPermissionHandlers } from './permissions'
import autoUpdater from './updater'
import { generateId } from '@hcengineering/core'
import { DownloadItem } from '@hcengineering/desktop-downloads'
import { rebuildJumpList, setupWindowsSpecific } from './windowsSpecificSetup'
import { readPackedConfig } from './config'

let mainWindow: BrowserWindow | undefined
let winBadge: any

const isMac = process.platform === 'darwin'
const isWindows = process.platform === 'win32'
const isDev = process.env.NODE_ENV === 'development'

const sessionPartition = !isDev ? 'persist:huly' : 'persist:huly_dev'
const iconKey = path.join(app.getAppPath(), 'dist', 'ui', 'public', isWindows ? 'AppIcon.ico' : 'AppIcon.png')
const preloadScriptPath = path.join(app.getAppPath(), 'dist', 'main', 'preload.js')

const defaultWidth = 1440
const defaultHeight = 960

const packedConfig = readPackedConfig()
log.info('packed config', packedConfig)

const envPath = path.join(app.getAppPath(), isDev ? '.env-dev' : '.env')
console.log('do loading env from', envPath)
dotenvConfig({
  path: envPath
})
const options = getOptions()

const containerPageFileName = isWindows ? 'index.windows.html' : 'index.html'
const containerPagePath = path.join('dist', 'ui', containerPageFileName)

// Note: using electron-store here as local storage is not available in the main process
// before the window is created
const settings = new Store()
const oldFront = readServerUrl()

if (options.server !== undefined) {
  ;(settings as any).set('server', options.server)
}

const FRONT_URL = readServerUrl()
const serverChanged = oldFront !== FRONT_URL

function readServerUrl (): string {
  if (isDev) {
    return process.env.FRONT_URL ?? 'http://huly.local:8087'
  }

  return ((settings as any).get('server') as string) ?? packedConfig?.server ?? process.env.FRONT_URL ?? 'https://huly.app'
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup') === true) {
  app.quit()
}

console.log('Running Huly', process.env.MODEL_VERSION, process.env.VERSION, isMac, isDev, process.env.NODE_ENV)

// Fix screen-sharing thumbnails being missing sometimes
// See https://github.com/electron/electron/issues/44504
const disabledFeatures = [
  'ThumbnailCapturerMac:capture_mode/sc_screenshot_manager',
  'ScreenCaptureKitPickerScreen',
  'ScreenCaptureKitStreamPickerSonoma'
]

app.commandLine.appendSwitch('disable-features', disabledFeatures.join(','))

function setupWindowTitleBar (windowOptions: Electron.BrowserWindowConstructorOptions): void {
  if (isWindows) {
    // on Windows we use frameless window with custom hand-made title bar
    windowOptions.frame = false
  } else {
    windowOptions.titleBarStyle = isMac ? 'hidden' : 'default'
  }
}

function hookOpenWindow (window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    console.log('opening window', url)

    /*
      We need to detect if url is "our" or external. We should
      open external urls in system browser

      When we open local URLs it would be as file:///workbench/my-spc/tracker/TSK-2
      As we load only our index.html there is no security problem to pass such URLs
      to open arg as well
    */
    if (url.indexOf(FRONT_URL) !== 0 && url.indexOf('file://') !== 0) {
      void shell.openExternal(url)
    } else {
      void (async (): Promise<void> => {
        const bounds = mainWindow?.getBounds()
        const windowOptions: Electron.BrowserWindowConstructorOptions = {
          width: bounds?.width ?? defaultWidth,
          height: bounds?.height ?? defaultHeight,
          x: (bounds?.x ?? 0) + 25,
          y: (bounds?.y ?? 0) + 25,
          trafficLightPosition: { x: 10, y: 10 },
          icon: nativeImage.createFromPath(iconKey),
          webPreferences: {
            devTools: true,
            sandbox: false,
            partition: sessionPartition,
            nodeIntegration: true,
            preload: preloadScriptPath,
            additionalArguments: [
              `--open=${encodeURI(
                new URL(url).pathname
                  .split('/')
                  .filter((it) => it.length > 0)
                  .join('/')
              )}`
            ]
          }
        }
        setupWindowTitleBar(windowOptions)
        const childWindow = new BrowserWindow(windowOptions)
        await childWindow.loadFile(containerPagePath)
        hookOpenWindow(childWindow)
      })()
    }
    return { action: 'deny' }
  })
}

function setupCookieHandler (config: Config): void {
  const normalizedAccountsUrl = config.ACCOUNTS_URL.endsWith('/') ? config.ACCOUNTS_URL : config.ACCOUNTS_URL + '/'
  const urls = [
    normalizedAccountsUrl,
    normalizedAccountsUrl + '*'
  ]

  session.defaultSession.webRequest.onHeadersReceived({ urls }, handleSetCookie)
  session.fromPartition(sessionPartition).webRequest.onHeadersReceived({ urls }, handleSetCookie)
}

function handleSetCookie (details: Electron.OnHeadersReceivedListenerDetails, callback: (headersReceivedResponse: Electron.HeadersReceivedResponse) => void): void {
  if (details.responseHeaders !== undefined) {
    for (const header in details.responseHeaders) {
      if (header.toLowerCase() === 'set-cookie') {
        const cookies = details.responseHeaders[header]
        details.responseHeaders[header] = cookies.map((cookie) => {
          if (!cookie.includes('SameSite=')) {
            if (details.url.startsWith('https://') && !cookie.includes('; Secure')) {
              cookie += '; Secure'
            }
            cookie += '; SameSite=None'
          }
          return cookie
        })
      }
    }
  }

  // eslint-disable-next-line n/no-callback-literal
  callback({ responseHeaders: { ...details.responseHeaders } })
}

function handleAuthRedirects (window: BrowserWindow): void {
  window.webContents.on('will-redirect', (event) => {
    if (event?.url.startsWith(`${FRONT_URL}/login/auth`)) {
      console.log('Auth happened, redirecting to local index')
      const urlObj = new URL(decodeURIComponent(event.url))
      event.preventDefault()

      void (async (): Promise<void> => {
        await window.loadFile(containerPagePath)
        window.webContents.send('handle-auth', urlObj.searchParams.get('token'))
      })()
    }
  })
}

function handleWillDownload (window: BrowserWindow): void {
  window.webContents.session.on('will-download', (_event, item) => {
    const key = generateId()

    const notifyDownloadUpdated = (): void => {
      const download: DownloadItem = {
        key,
        state: item.isPaused() ? 'paused' : item.getState(),
        fileName: item.getFilename(),
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        url: item.getURL(),
        savePath: item.getSavePath()
      }
      window.webContents.send('handle-download-item', download)
    }

    notifyDownloadUpdated()

    item.on('updated', notifyDownloadUpdated)
    item.on('done', notifyDownloadUpdated)
  })
}

const createWindow = async (): Promise<void> => {
  // Restore window position if available
  const restoredBounds: any = settings.get('windowBounds')
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: restoredBounds?.width ?? defaultWidth,
    height: restoredBounds?.height ?? defaultHeight,
    x: restoredBounds?.x ?? undefined,
    y: restoredBounds?.y ?? undefined,
    trafficLightPosition: { x: 10, y: 10 },
    roundedCorners: true,
    icon: nativeImage.createFromPath(iconKey),
    webPreferences: {
      devTools: true,
      sandbox: false,
      nodeIntegration: true,
      // backgroundThrottling: false,
      partition: sessionPartition,
      preload: preloadScriptPath
    }
  }
  setupWindowTitleBar(windowOptions)
  mainWindow = new BrowserWindow(windowOptions)
  app.dock?.setIcon(nativeImage.createFromPath(iconKey))
  // await mainWindow.webContents.openDevTools()
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }
  await mainWindow.loadFile(containerPagePath)
  addPermissionHandlers(mainWindow.webContents.session)
  handleAuthRedirects(mainWindow)
  handleWillDownload(mainWindow)

  // In this example, only windows with the `about:blank` url will be created.
  // All other urls will be blocked.
  hookOpenWindow(mainWindow)

  // Save window position on close
  mainWindow.on('close', () => {
    const bounds = mainWindow?.getBounds()
    if (bounds !== undefined) {
      settings.set('windowBounds', bounds)
    }
  })

  function sendWindowMaximizedMessage (maximized: boolean): void {
    mainWindow?.webContents.send('window-state-changed', maximized ? 'maximized' : 'unmaximized')
  }

  mainWindow.on('blur', () => {
    mainWindow?.webContents.send('window-focus-loss')
  })

  mainWindow.on('maximize', () => {
    sendWindowMaximizedMessage(true)
  })

  mainWindow.on('unmaximize', () => {
    sendWindowMaximizedMessage(false)
  })

  mainWindow.on('enter-full-screen', () => {
    sendWindowMaximizedMessage(true)
  })

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow != null) {
      sendWindowMaximizedMessage(mainWindow.isMaximized())
    }
  })

  if (isMac) {
    mainWindow.on('close', (event) => {
      // Prevent the default behavior (which would quit the app)
      event.preventDefault()
      // Hide the window
      mainWindow?.hide()
    })
  } else if (isWindows) {
    winBadge = new WinBadge(mainWindow, {
      font: '14px arial'
    })
  }
}

function sendCommand (cmd: string, ...args: any[]): void {
  mainWindow?.webContents.send(cmd, ...args)
}

function activateWindow (): void {
  if (mainWindow != null) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  }
}

if (isWindows) {
  setupWindowsSpecific(activateWindow, sendCommand)
} else {
  addMenus(sendCommand)
}

contextMenu({
  showSaveImageAs: false,
  showInspectElement: false,
  showSelectAll: false
})

ipcMain.on('set-badge', (_event: any, badge: number) => {
  app.dock?.setBadge(badge > 0 ? `${badge}` : '')
  app.badgeCount = badge

  if (isWindows && winBadge !== undefined) {
    winBadge.update(badge)
  }
})

ipcMain.on('dock-bounce', (_event: any) => {
  app.dock?.bounce('informational')
})

ipcMain.on('send-notification', (_event: any, notificationParams: NotificationParams) => {
  if (Notification.isSupported()) {
    const notification = new Notification(notificationParams)

    notification.on('click', () => {
      mainWindow?.show()
      mainWindow?.webContents.send('handle-notification-navigation', notificationParams)
    })

    notification.show()
  }
})

ipcMain.on('set-title', (event: any, title: string) => {
  const webContents = event.sender
  const window = BrowserWindow.fromWebContents(webContents)
  window?.setTitle(title)
})

ipcMain.on('set-combined-config', (_event: any, config: Config) => {
  log.info('Config set: ', config)

  setupCookieHandler(config)

  const updatesUrl = process.env.DESKTOP_UPDATES_URL ?? config.DESKTOP_UPDATES_URL ?? 'https://dist.huly.io'
  // NOTE: env format is: default_value;key1:value1;key2:value2...
  const updatesChannels = (process.env.DESKTOP_UPDATES_CHANNEL ?? config.DESKTOP_UPDATES_CHANNEL ?? 'huly').split(';').map(c => c.trim().split(':'))
  const updateChannelsMap: Record<string, string> = {}
  for (const channelInfo of updatesChannels) {
    if (channelInfo.length === 1) {
      updateChannelsMap.default = channelInfo[0]
    } else if (channelInfo.length === 2) {
      const [key, value] = channelInfo
      updateChannelsMap[key] = value
    }
  }

  const updatesChannelKey = packedConfig?.updatesChannelKey ?? 'default'
  const updatesChannel = updateChannelsMap[updatesChannelKey] ?? updateChannelsMap.default ?? 'huly'

  log.info('updates channels', updatesChannels)
  log.info('updates channel', updatesChannelKey, updatesChannel)

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: updatesUrl,
    channel: updatesChannel
  })
  void autoUpdater.checkForUpdatesAndNotify()
})

ipcMain.handle('get-main-config', (_event: any, _path: any) => {
  const cfg = {
    CONFIG_URL: process.env.CONFIG_URL ?? '',
    FRONT_URL,
    INITIAL_URL: process.env.INITIAL_URL ?? '',
    MODEL_VERSION: process.env.MODEL_VERSION ?? '',
    VERSION: process.env.VERSION ?? ''
  }
  return cfg
})
ipcMain.handle('get-host', (_event: any, _path: any) => {
  return new URL(FRONT_URL).host
})

ipcMain.on('set-front-cookie', function (event: any, host: string, name: string, value: string) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  const cv: CookiesSetDetails = {
    url: host,
    name,
    value,
    path: '/',
    secure: true,
    sameSite: 'no_restriction',
    httpOnly: true,
    domain: process.env.FRONT_DOMAIN
  }
  void win?.webContents?.session.cookies.set(cv)
})

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow != null) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('get-is-os-using-dark-theme', () => {
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('menu-action', async (_event: any, action: MenuBarAction) => {
  dipatchMenuBarAction(mainWindow, action)
})

if (isWindows) {
  ipcMain.on('rebuild-user-jump-list', (_event: any, spares: JumpListSpares) => {
    rebuildJumpList(spares)
  })
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
}

ipcMain.handle('get-screen-access', () => systemPreferences.getMediaAccessStatus('screen') === 'granted')
ipcMain.handle('get-screen-sources', () => {
  return desktopCapturer.getSources({ types: ['window', 'screen'], fetchWindowIcons: true, thumbnailSize: { width: 225, height: 135 } }).then(async sources => {
    return sources.map((source: any) => {
      return {
        ...source,
        appIconURL: source.appIcon?.toDataURL(),
        thumbnailURL: source.thumbnail.toDataURL()
      }
    })
  })
})

async function onReady (): Promise<void> {
  await createWindow()

  if (serverChanged) {
    mainWindow?.webContents.send('logout')
  }
}

app.on('ready', () => {
  void onReady()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

if (isMac) {
  app.on('activate', () => {
    if (mainWindow != null && (mainWindow.isMinimized() || !mainWindow.isVisible())) {
      mainWindow.show()
    }
  })
}
app.on('before-quit', () => {
  if (mainWindow !== undefined && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds()
    settings.set('windowBounds', bounds)
  }
  // Note: in case the app is exited by auto-updater all windows will be destroyed at this point
  if (mainWindow === undefined || mainWindow.isDestroyed()) return

  if (isMac) {
    mainWindow?.removeAllListeners('close')
    mainWindow?.close()
  }
})

// Note: it is reset when the app is relaunched after update
let isUpdating = false

autoUpdater.on('update-available', (info: UpdateInfo) => {
  if (isUpdating) return

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
        app.quit()
      }
      isUpdating = true
      setDownloadProgress(0)
    })
})

autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
  setDownloadProgress(progressObj.percent)
})

function setDownloadProgress (percent: number): void {
  if (mainWindow === undefined) {
    return
  }
  mainWindow.setProgressBar(percent / 100)
  mainWindow.webContents.send('handle-update-download-progress', percent)
}

autoUpdater.on('update-downloaded', (_info: any) => {
  // We have listeners that prevents the app from being exited on mac
  app.removeAllListeners('window-all-closed')
  mainWindow?.removeAllListeners('close')

  autoUpdater.quitAndInstall()
})
