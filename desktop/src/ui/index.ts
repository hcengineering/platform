import login, { loginId } from '@hcengineering/login'
import { getEmbeddedLabel, getMetadata, setMetadata } from '@hcengineering/platform'
import presentation, { closeClient, MessageBox, setDownloadProgress } from '@hcengineering/presentation'
import settings, { settingId } from '@hcengineering/setting'
import {
  closePanel,
  closePopup,
  createApp,
  fetchMetadataLocalStorage,
  getCurrentLocation,
  getCurrentResolvedLocation,
  navigate,
  parseLocation,
  pushRootBarProgressComponent,
  removeRootBarComponent,
  setMetadataLocalStorage,
  showPopup
} from '@hcengineering/ui'

import { notificationId } from '@hcengineering/notification'
import { workbenchId } from '@hcengineering/workbench'

import { isOwnerOrMaintainer } from '@hcengineering/core'
import { configurePlatform } from './platform'
import { defineScreenShare } from './screenShare'
import { IPCMainExposed } from './types'

defineScreenShare()

void configurePlatform().then(() => {
  createApp(document.body)
})

window.addEventListener('DOMContentLoaded', () => {
  const ipcMain = (window as any).electron as IPCMainExposed

  ipcMain.on('open-settings', () => {
    closePopup()
    closePanel()
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    loc.query = undefined
    loc.path[2] = settingId
    loc.path.length = 3
    navigate(loc)
  })

  ipcMain.on('select-workspace', () => {
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

  ipcMain.on('logout', () => {
    const tokens = fetchMetadataLocalStorage(login.metadata.LoginTokensV2)
    if (tokens !== null) {
      const loc = getCurrentLocation()
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete tokens[loc.path[1]]
      setMetadataLocalStorage(login.metadata.LoginTokensV2, tokens)
    }
    setMetadata(presentation.metadata.Token, null)
    setMetadataLocalStorage(login.metadata.LastToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginAccount, null)
    void closeClient().then(() => {
      navigate({ path: [loginId] })
    })
  })

  ipcMain.handleDeepLink((urlString) => {
    const urlObject = new URL(urlString)
    navigate(parseLocation(urlObject))
  })

  ipcMain.handleNotificationNavigation(() => {
    // For now navigate only to Inbox
    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    const location = getCurrentResolvedLocation()
    const urlString = `${frontUrl}/${workbenchId}/${location.path[1]}/${notificationId}`
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
