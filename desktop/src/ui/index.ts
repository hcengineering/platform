import { loginId } from '@hcengineering/login'
import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
import presentation, { MessageBox, setDownloadProgress } from '@hcengineering/presentation'
import settings, { settingId } from '@hcengineering/setting'
import {
  closePanel,
  closePopup,
  createApp,
  getCurrentResolvedLocation,
  navigate,
  parseLocation,
  pushRootBarProgressComponent,
  removeRootBarComponent,
  showPopup
} from '@hcengineering/ui'
import { handleDownloadItem } from '@hcengineering/desktop-downloads'
import { notificationId } from '@hcengineering/notification'
import { workbenchId, logOut } from '@hcengineering/workbench'

import { isOwnerOrMaintainer } from '@hcengineering/core'
import { configurePlatform } from './platform'
import { setupTitleBarMenu } from './titleBarMenu'
import { defineScreenShare, defineGetDisplayMedia } from './screenShare'
import { ipcMainExposed, StandardMenuCommandLogout, StandardMenuCommandSelectWorkspace, StandardMenuCommandOpenSettings } from './types'
import { themeStore } from '@hcengineering/theme'

defineScreenShare()
defineGetDisplayMedia()

window.addEventListener('DOMContentLoaded', () => {
  
  const ipcMain = ipcMainExposed()
  
  if ((window as any).windowsPlatform === true) {
    const titleBarRoot = document.getElementById('desktop-app-titlebar-root')
    if (titleBarRoot) {
      const menuBar = setupTitleBarMenu(ipcMain, titleBarRoot)

      themeStore.subscribe((themeOptions) => {
        if (themeOptions != null) {
          const isDarkTheme = themeOptions.dark
          menuBar.setTheme(isDarkTheme ? 'dark' : 'light')
        }
      })

      void ipcMain.isOsUsingDarkTheme().then((isDarkTheme) => {
        menuBar.setTheme(isDarkTheme ? 'dark' : 'light')
      }).catch(() => {
        menuBar.setTheme('light'); // fallback
      })
    }
  }

  void configurePlatform().then((parameters) => {
    const windowTitle = document.getElementById('application-title-bar-caption')
    if (windowTitle) {
      windowTitle.textContent = parameters.getBranding().getTitle()
    }

    createApp(document.body)
  })

  ipcMain.on(StandardMenuCommandOpenSettings, () => {
    closePopup()
    closePanel()
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    loc.query = undefined
    loc.path[2] = settingId
    loc.path.length = 3
    navigate(loc)
  })

  ipcMain.on(StandardMenuCommandSelectWorkspace, () => {
    closePopup()
    closePanel()
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    loc.query = undefined
    loc.path[0] = loginId
    loc.path[1] = 'selectWorkspace'
    loc.path.length = 2
    navigate(loc)
  })

  ipcMain.on(StandardMenuCommandLogout, () => {
    void logOut().then(() => {
      navigate({ path: [loginId] })
    })
  })

  ipcMain.handleDeepLink((urlString) => {
    const urlObject = new URL(urlString)
    navigate(parseLocation(urlObject))
  })

  ipcMain.handleNotificationNavigation((application) => {
    // For now navigate only to Inbox
    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    const location = getCurrentResolvedLocation()
    const urlString = `${frontUrl}/${workbenchId}/${location.path[1]}/${application ?? notificationId}`
    const urlObject = new URL(urlString)
    navigate(parseLocation(urlObject))
  })

  ipcMain.handleUpdateDownloadProgress((progress) => {
    setDownloadProgress(progress)
  })

  ipcMain.handleAuth((token) => {
    const authLoc = {
      path: ['login', 'auth'],
      query: { token }
    }

    navigate(authLoc)
  })

  ipcMain.handleDownloadItem((item) => {
    void handleDownloadItem(item)
  })

  ipcMain.on('start-backup', () => {
    // We need to obtain current token and endpoint and trigger backup
    const token = getMetadata(presentation.metadata.Token)
    const endpoint = getMetadata(presentation.metadata.Endpoint)
    const workspaceUuid = getMetadata(presentation.metadata.WorkspaceUuid)
    // const workspaceDataId = getMetadata(presentation.metadata.WorkspaceDataId)
    // const workspaceUrl = getMetadata(presentation.metadata.WorkspaceUrl)
    // const wsIds = {
    //   uuid: workspaceUuid,
    //   dataId: workspaceDataId,
    //   url: workspaceUrl
    // }
    if (isOwnerOrMaintainer()) {
      if (token != null && endpoint != null && workspaceUuid != null) {
        // ipcMain.startBackup(token, endpoint, wsIds)
        closePopup()
        closePanel()
        const loc = getCurrentResolvedLocation()
        loc.fragment = undefined
        loc.query = undefined
        loc.path[2] = settingId
        loc.path[3] = 'setting'
        loc.path[4] = 'backup'
        loc.path.length = 5
        navigate(loc)
      }
    } else {
      showPopup(MessageBox, {
        label: settings.string.OwnerOrMaintainerRequired
      })
    }
  })

  ipcMain.on('backup', (evt: any, ...args: any) => {
    pushRootBarProgressComponent('backup',
      getEmbeddedLabel('Backup'),
      () => { return args[0] },
      () => {
        ipcMain.cancelBackup()
      },
      undefined,
      undefined,
      50
    )
  })
  ipcMain.on('backup-cancel', () => {
    removeRootBarComponent('backup')
  })
})
