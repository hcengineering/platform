//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { contextBridge, ipcRenderer } from 'electron'
import { BrandingMap, Config, IPCMainExposed, JumpListSpares, MenuBarAction, NotificationParams } from './types'
import { IpcMessage } from './ipcMessages'

export function concatLink (host: string, path: string): string {
  if (!host.endsWith('/') && !path.startsWith('/')) {
    return `${host}/${path}`
  } else if (host.endsWith('/') && path.startsWith('/')) {
    const newPath = path.slice(1)
    return `${host}${newPath}`
  } else {
    return `${host}${path}`
  }
}

async function loadServerConfig (url: string): Promise<any> {
  let retries = 1
  let res: Response | undefined

  while (true) {
    try {
      res = await fetch(url, {
        keepalive: true
      })
      if (res === undefined) {
        // In theory should never get here
        throw new Error('Failed to load server config')
      }
      break
    } catch (e) {
      retries++
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.min(5, retries)))
    }
  }

  return await res.json()
}

const openArg = (process.argv.find((it) => it.startsWith('--open=')) ?? '').split('--open=')[1]
console.log('Open passed', openArg)
let configPromise: Promise<Config> | undefined

const expose: IPCMainExposed = {
  setBadge: (badge: number) => {
    ipcRenderer.send(IpcMessage.SetBadge, badge)
  },
  setTitle: (title: string) => {
    ipcRenderer.send(IpcMessage.SetTitle, title)
  },
  dockBounce: () => {
    ipcRenderer.send(IpcMessage.DockBounce)
  },
  sendNotification: (notificationParams: NotificationParams) => {
    ipcRenderer.send(IpcMessage.SendNotification, notificationParams)
  },

  minimizeWindow: () => {
    void ipcRenderer.invoke(IpcMessage.WindowMinimize)
  },

  maximizeWindow: () => {
    void ipcRenderer.invoke(IpcMessage.WindowMaximize)
  },

  closeWindow: () => {
    void ipcRenderer.invoke(IpcMessage.WindowClose)
  },

  onWindowStateChange: (callback) => {
    ipcRenderer.on(IpcMessage.WindowStateChanged, callback)
  },

  onWindowFocusLoss: (callback) => {
    ipcRenderer.on(IpcMessage.WindowFocusLoss, callback)
  },

  isOsUsingDarkTheme: async () => {
    return await ipcRenderer.invoke(IpcMessage.GetIsOsUsingDarkTheme)
  },

  executeMenuBarAction: (action: MenuBarAction) => {
    void ipcRenderer.invoke(IpcMessage.MenuAction, action)
  },

  config: async () => {
    if (configPromise === undefined) {
      configPromise = new Promise((resolve, reject) => {
        ipcRenderer.invoke(IpcMessage.GetMainConfig).then(
          async (mainConfig) => {
            const serverConfig = await loadServerConfig(concatLink(mainConfig.FRONT_URL, mainConfig.CONFIG_URL))
            const combinedConfig = {
              ...serverConfig,
              ...mainConfig,
              INITIAL_URL: openArg ?? '',
              UPLOAD_URL: (serverConfig.UPLOAD_URL as string).includes('://')
                ? serverConfig.UPLOAD_URL
                : concatLink(mainConfig.FRONT_URL, serverConfig.UPLOAD_URL),
              MODEL_VERSION: mainConfig.MODEL_VERSION,
              VERSION: mainConfig.VERSION
            }

            ipcRenderer.send(IpcMessage.SetCombinedConfig, combinedConfig)

            resolve(combinedConfig)
          },
          (err) => {
            reject(err)
          }
        )
      })
    }

    return await configPromise
  },
  branding: async () => {
    const cfg = await expose.config()
    const branding: BrandingMap = await (
      await fetch(cfg.BRANDING_URL ?? concatLink(cfg.FRONT_URL, 'branding.json'), { keepalive: true })
    ).json()
    const host = await ipcRenderer.invoke(IpcMessage.GetHost)
    return branding[host] ?? {}
  },
  on: (event: string, op: (...args: any[]) => void) => {
    ipcRenderer.on(event, (channel: any, args: any[]) => {
      console.log('on handle', args)
      op(channel, args)
    })
  },

  handleDeepLink: (callback) => {
    ipcRenderer.on(IpcMessage.HandleDeepLink, (event, value) => {
      try {
        if (typeof value === 'string' && value !== '') {
          callback(value)
        }
      } catch (e) {
        // Just do nothing. Nothing is ok if there is something with URL.
      }
    })
    ipcRenderer.send(IpcMessage.OnDeepLinkHandler)
  },

  handleNotificationNavigation: (callback) => {
    ipcRenderer.on(IpcMessage.HandleNotificationNavigation, (event, notificationParams) => {
      callback(notificationParams)
    })
  },

  handleUpdateDownloadProgress: (callback) => {
    ipcRenderer.on(IpcMessage.HandleUpdateDownloadProgress, (event, value) => {
      callback(value)
    })
  },

  handleAuth: (callback) => {
    ipcRenderer.on(IpcMessage.HandleAuth, (event, value) => {
      callback(value)
    })
  },

  handleDownloadItem: (callback) => {
    ipcRenderer.on(IpcMessage.HandleDownloadItem, (event, value) => {
      callback(value)
    })
  },

  async setFrontCookie (host: string, name: string, value: string): Promise<void> {
    ipcRenderer.send(IpcMessage.SetFrontCookie, host, name, value)
  },

  getScreenAccess: () => ipcRenderer.invoke(IpcMessage.GetScreenAccess),
  getScreenSources: () => ipcRenderer.invoke(IpcMessage.GetScreenSources),
  cancelBackup: () => { ipcRenderer.send(IpcMessage.CancelBackup) },
  startBackup: (token, endpoint, wsIds) => { ipcRenderer.send(IpcMessage.StartBackup, token, endpoint, wsIds) },

  rebuildJumpList: (spares: JumpListSpares) => { ipcRenderer.send(IpcMessage.RebuildUserJumpList, spares) },

  isMinimizeToTrayEnabled: async () => {
    return await ipcRenderer.invoke(IpcMessage.GetMinimizeToTrayEnabled)
  },
  onMinimizeToTraySettingChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on(IpcMessage.MinimizeToTraySettingChanged, (_event, enabled: boolean) => { callback(enabled) })
  },
  isAutoLaunchEnabled: async () => {
    return await ipcRenderer.invoke(IpcMessage.GetAutoLaunchEnabled)
  },
  onAutoLaunchSettingChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on(IpcMessage.AutoLaunchSettingChanged, (_event, enabled: boolean) => { callback(enabled) })
  }
}
contextBridge.exposeInMainWorld('electron', expose)
