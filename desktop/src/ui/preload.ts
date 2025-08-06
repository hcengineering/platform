// preload.js

import { contextBridge, ipcRenderer } from 'electron'
import { BrandingMap, Config, IPCMainExposed, MenuBarAction, NotificationParams, JumpListSpares } from './types'

/**
 * @public
 */
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
  let retries = 5
  let res: Response | undefined

  do {
    try {
      res = await fetch(url, {
        keepalive: true
      })
      break
    } catch (e) {
      retries--
      if (retries === 0) {
        throw new Error(`Failed to load server config: ${e}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (5 - retries)))
    }
  } while (retries > 0)

  if (res === undefined) {
    // In theory should never get here
    throw new Error('Failed to load server config')
  }

  return await res.json()
}

const openArg = (process.argv.find((it) => it.startsWith('--open=')) ?? '').split('--open=')[1]
console.log('Open passed', openArg)
let configPromise: Promise<Config> | undefined

const expose: IPCMainExposed = {
  setBadge: (badge: number) => {
    ipcRenderer.send('set-badge', badge)
  },
  setTitle: (title: string) => {
    ipcRenderer.send('set-title', title)
  },
  dockBounce: () => {
    ipcRenderer.send('dock-bounce')
  },
  sendNotification: (notificationParams: NotificationParams) => {
    ipcRenderer.send('send-notification', notificationParams)
  },

  minimizeWindow: () => {
    ipcRenderer.invoke('window-minimize')
  },
  
  maximizeWindow: () => {
    ipcRenderer.invoke('window-maximize')
  },
  
  closeWindow: () => {
    ipcRenderer.invoke('window-close')
  },

  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', callback)
  },

  onWindowFocusLoss: (callback) => {
    ipcRenderer.on('window-focus-loss', callback)
  },

  isOsUsingDarkTheme: async ()  =>  { 
    return await ipcRenderer.invoke('get-is-os-using-dark-theme')
  },

  executeMenuBarAction: (action: MenuBarAction) => {
    ipcRenderer.invoke('menu-action', action)
  },

  config: async () => {
    if (configPromise === undefined) {
      configPromise = new Promise((resolve, reject) => {
        ipcRenderer.invoke('get-main-config').then(
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

            ipcRenderer.send('set-combined-config', combinedConfig)

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
    const host = await ipcRenderer.invoke('get-host')
    return branding[host] ?? {}
  },
  on: (event: string, op: (...args: any[]) => void) => {
    ipcRenderer.on(event, (channel: any, args: any[]) => {
      console.log('on handle', args)
      op(channel, args)
    })
  },

  handleDeepLink: (callback) => {
    ipcRenderer.on('handle-deep-link', (event, value) => {
      try {
        if (typeof value === 'string' && value !== '') {
          callback(value)
        }
      } catch (e) {
        // Just do nothing. Nothing is ok if there is something with URL
      }
    })
    ipcRenderer.send('on-deep-link-handler')
  },

  handleNotificationNavigation: (callback) => {
    ipcRenderer.on('handle-notification-navigation', (event, notificationParams) => {
      callback(notificationParams)
    })
  },

  handleUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('handle-update-download-progress', (event, value) => {
      callback(value)
    })
  },

  handleAuth: (callback) => {
    ipcRenderer.on('handle-auth', (event, value) => {
      callback(value)
    })
  },

  handleDownloadItem: (callback) => {
    ipcRenderer.on('handle-download-item', (event, value) => {
      callback(value)
    })
  },

  async setFrontCookie (host: string, name: string, value: string): Promise<void> {
    ipcRenderer.send('set-front-cookie', host, name, value)
  },

  getScreenAccess: () => ipcRenderer.invoke('get-screen-access'),
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  cancelBackup: () => { ipcRenderer.send('cancel-backup') },
  startBackup: (token, endpoint, wsIds) => { ipcRenderer.send('start-backup', token, endpoint, wsIds) },

  rebuildJumpList: (spares: JumpListSpares) => ipcRenderer.send('rebuild-user-jump-list', spares) 
}
contextBridge.exposeInMainWorld('electron', expose)
