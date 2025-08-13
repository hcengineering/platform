import { loginId } from '@hcengineering/login'
import { loveId } from '@hcengineering/love'
import { timeId } from '@hcengineering/time'

import { getEmbeddedLabel, getMetadata, translate } from '@hcengineering/platform'
import presentation, { MessageBox, setDownloadProgress, getClient } from '@hcengineering/presentation'
import setting, { settingId } from '@hcengineering/setting'
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
import notification, { notificationId } from '@hcengineering/notification'
import { inboxId } from '@hcengineering/inbox'
import workbench, { workbenchId, logOut } from '@hcengineering/workbench'
import { encodeObjectURI } from '@hcengineering/view'
import { resolveLocation } from '@hcengineering/notification-resources'

import { isOwnerOrMaintainer, getCurrentAccount } from '@hcengineering/core'
import { configurePlatform } from './platform'
import { setupTitleBarMenu } from './titleBarMenu'
import { defineScreenShare, defineGetDisplayMedia } from './screenShare'
import { CommandLogout, CommandSelectWorkspace, CommandOpenSettings, CommandOpenInbox, CommandOpenPlanner, CommandOpenOffice, CommandOpenApplication, LaunchApplication, NotificationParams } from './types'
import { ipcMainExposed } from './typesUtils'
import { themeStore } from '@hcengineering/theme'
import type { Application } from '@hcengineering/workbench'
import { isAllowedToRole } from '@hcengineering/workbench-resources'

function currentOsIsWindows (): boolean {
  return (window as any).windowsPlatform === true
}

defineScreenShare()
defineGetDisplayMedia()

window.addEventListener('DOMContentLoaded', () => {
  const ipcMain = ipcMainExposed()

  if (currentOsIsWindows()) {
    const titleBarRoot = document.getElementById('desktop-app-titlebar-root')
    if (titleBarRoot != null) {
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
        menuBar.setTheme('light') // fallback
      })
    }
  }

  const onWorkbenchConnect = currentOsIsWindows()
    ? async () => {
      const client = getClient()
      const account = getCurrentAccount()
      const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []

      const applications: Application[] = client
        .getModel()
        .findAllSync<Application>(workbench.class.Application, { hidden: false })
        .filter((it: Application) => !excludedApps.includes(it._id))
        .filter((it: Application) => isAllowedToRole(it.accessLevel, account))

      const tasks: LaunchApplication[] = []

      for (const application of applications) {
        const title = await translate(application.label, {})
        tasks.push({
          title,
          id: application._id,
          alias: application.alias
        })
      }
      ipcMain.rebuildJumpList({
        applications: tasks,
        settingsLabel: await translate(setting.string.Settings, {}),
        inboxLabel: await translate(notification.string.Inbox, {})
      })
    }
    : undefined

  void configurePlatform(onWorkbenchConnect).then((parameters) => {
    const windowTitle = document.getElementById('application-title-bar-caption')
    if (windowTitle != null) {
      windowTitle.textContent = parameters.getBranding().getTitle()
    }

    createApp(document.body)
  })

  function openScreen (screenId: any): void {
    closePopup()
    closePanel()
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    loc.query = undefined
    loc.path[2] = screenId
    loc.path.length = 3
    navigate(loc)
  }

  ipcMain.on(CommandOpenSettings, () => {
    openScreen(settingId)
  })

  ipcMain.on(CommandOpenInbox, () => {
    openScreen(notificationId)
  })

  ipcMain.on(CommandOpenOffice, () => {
    openScreen(loveId)
  })

  ipcMain.on(CommandOpenPlanner, () => {
    openScreen(timeId)
  })

  ipcMain.on(CommandOpenApplication, (_event, applicationId) => {
    openScreen(applicationId[0])
  })

  ipcMain.on(CommandSelectWorkspace, () => {
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

  ipcMain.on(CommandLogout, () => {
    void logOut().then(() => {
      navigate({ path: [loginId] })
    })
  })

  ipcMain.handleDeepLink((urlString) => {
    const urlObject = new URL(urlString)
    navigate(parseLocation(urlObject))
  })

  function navigateToUrl (path: string): void {
    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    const urlObject = new URL(`${frontUrl}/${path}`)
    navigate(parseLocation(urlObject))
  }

  function getBasicNotificationPath (notificationParams: NotificationParams): string {
    return `${workbenchId}/${notificationParams.application ?? notificationId}/${notificationId}`
  }

  ipcMain.handleNotificationNavigation((notificationParams: NotificationParams) => {
    // Support for new inbox with cardId (card-based)
    if (notificationParams.cardId != null) {
      const currentLocation = getCurrentResolvedLocation()
      navigateToUrl(`${workbenchId}/${currentLocation.path[1]}/${inboxId}/${notificationParams.cardId}`)
      return
    }

    // Support for old inbox with objectId + objectClass (legacy)
    if (notificationParams.objectId != null && notificationParams.objectClass != null) {
      const encodedObjectURI = encodeObjectURI(notificationParams.objectId, notificationParams.objectClass)
      const notificationLocation = {
        path: [workbenchId, notificationParams.application, notificationId, encodedObjectURI],
        fragment: undefined,
        query: {}
      }

      void resolveLocation(notificationLocation).then((resolvedLocation) => {
        if (resolvedLocation?.loc != null) {
          navigate(resolvedLocation.loc)
        } else {
          navigateToUrl(`${workbenchId}/${notificationParams.application}/${notificationId}/${encodedObjectURI}`)
        }
      }).catch(() => {
        navigateToUrl(getBasicNotificationPath(notificationParams))
      })
    } else {
      // Fallback to basic notification navigation
      navigateToUrl(getBasicNotificationPath(notificationParams))
    }
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
        label: setting.string.OwnerOrMaintainerRequired
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
