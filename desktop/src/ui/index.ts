import login, { loginId } from '@hcengineering/login'
import { setMetadata, getMetadata } from '@hcengineering/platform'
import presentation, { closeClient, setDownloadProgress } from '@hcengineering/presentation'
import { settingId } from '@hcengineering/setting'
import {
  closePanel,
  closePopup,
  createApp,
  fetchMetadataLocalStorage,
  getCurrentLocation,
  getCurrentResolvedLocation,
  navigate,
  parseLocation,
  setMetadataLocalStorage
} from '@hcengineering/ui'

import { workbenchId } from '@hcengineering/workbench'
import { notificationId } from '@hcengineering/notification'

import { configurePlatform } from './platform'
import { IPCMainExposed } from './types'
import { defineScreenShare } from './screenShare'

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

  ipcMain.on('logout', () => {
    const tokens = fetchMetadataLocalStorage(login.metadata.LoginTokens)
    if (tokens !== null) {
      const loc = getCurrentLocation()
      loc.path.splice(1, 1)
      setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
    }
    setMetadata(presentation.metadata.Token, null)
    setMetadataLocalStorage(login.metadata.LastToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
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
})
