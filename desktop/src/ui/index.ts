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

import { loginId } from '@hcengineering/login'
import { loveId } from '@hcengineering/love'
import { timeId } from '@hcengineering/time'

import { getEmbeddedLabel, getMetadata, getResource, translate } from '@hcengineering/platform'
import presentation, { MessageBox, setDownloadProgress, getClient } from '@hcengineering/presentation'
import setting, { settingId } from '@hcengineering/setting'
import {
  closePanel,
  closePopup,
  createApp,
  getCurrentResolvedLocation,
  Menu,
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
import view, { Action, encodeObjectURI } from '@hcengineering/view'
import { resolveLocation } from '@hcengineering/notification-resources'
import { themeStore, ThemeVariant } from '@hcengineering/theme'
import type { Application } from '@hcengineering/workbench'
import { isAllowedToRole } from '@hcengineering/workbench-resources'
import card from '@hcengineering/card'
import communication from '@hcengineering/communication'

import { isOwnerOrMaintainer, getCurrentAccount, Ref } from '@hcengineering/core'
import { configurePlatform } from './platform'
import { setupTitleBarMenu } from './titleBarMenu'
import { defineScreenShare, defineGetDisplayMedia } from './screenShare'
import { CommandLogout, CommandSelectWorkspace, CommandOpenSettings, CommandOpenInbox, CommandOpenPlanner, CommandOpenOffice, CommandOpenApplication, LaunchApplication, NotificationParams, CommandCloseTab } from './types'
import { ipcMainExposed } from './typesUtils'
import { IpcMessage } from './ipcMessages'

function currentOsIsWindows (): boolean {
  return (window as any).windowsPlatform === true
}

async function executePlatformAction (action: Ref<Action>): Promise<void> {
  try {
    const client = getClient()
    const actions = client.getModel().findAllSync<Action>(view.class.Action, { _id: action })
    if (actions.length > 0) {
      const actionBody = await getResource(actions[0].action)
      await actionBody(undefined)
    }
  } catch (error) {
    console.error('failed to execute platform action', error)
  }
}

defineScreenShare()
defineGetDisplayMedia()

window.addEventListener('DOMContentLoaded', () => {
  const ipcMain = ipcMainExposed()

  if (currentOsIsWindows()) {
    const titleBarRoot = document.getElementById('desktop-app-titlebar-root')
    if (titleBarRoot != null) {
      void setupTitleBarMenu(ipcMain, titleBarRoot).then((menuBar) => {
        themeStore.subscribe((themeOptions) => {
          if (themeOptions != null) {
            menuBar.setTheme(themeOptions.variant)
          }
        })

        if (menuBar.lastUsedThemeIsUnknown()) {
          void ipcMain.isOsUsingDarkTheme().then((isDarkTheme) => {
            menuBar.setTheme(isDarkTheme ? ThemeVariant.Dark : ThemeVariant.Light)
          }).catch(() => {
            menuBar.setTheme(ThemeVariant.Light) // fallback
          })
        }
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

  ipcMain.on(CommandCloseTab, () => {
    void executePlatformAction(workbench.action.CloseCurrentTab)
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

  function getBasicNotificationPath (worksapce: string, app: string): string {
    return `${workbenchId}/${worksapce}/${app}`
  }

  ipcMain.handleNotificationNavigation((notificationParams: NotificationParams) => {
    const currentLocation = getCurrentResolvedLocation()
    const workspace = currentLocation.path[1]
    // Support for new inbox with cardId (card-based)
    if (notificationParams.cardId != null) {
      const objectUri = encodeObjectURI(notificationParams.cardId, card.class.Card)
      navigateToUrl(`${workbenchId}/${workspace}/${inboxId}/${objectUri}`)
      return
    }

    const isCommunicationEnabled = getMetadata(communication.metadata.Enabled) ?? false
    const app = isCommunicationEnabled ? inboxId : notificationParams.application

    // Support for old inbox with objectId + objectClass (legacy)
    if (notificationParams.objectId != null && notificationParams.objectClass != null) {
      const encodedObjectURI = encodeObjectURI(notificationParams.objectId, notificationParams.objectClass)
      const notificationLocation = {
        path: [workbenchId, workspace, app, encodedObjectURI],
        fragment: undefined,
        query: undefined
      }

      void resolveLocation(notificationLocation).then((resolvedLocation) => {
        if (resolvedLocation?.loc != null) {
          navigate(resolvedLocation.loc)
        } else {
          navigateToUrl(`${workbenchId}/${workspace}/${app}/${encodedObjectURI}`)
        }
      }).catch(() => {
        navigateToUrl(getBasicNotificationPath(workspace, app))
      })
    } else {
      // Fallback to basic notification navigation
      navigateToUrl(getBasicNotificationPath(workspace, app))
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

  ipcMain.on(IpcMessage.StartBackup, () => {
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
