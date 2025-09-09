import { Analytics } from '@hcengineering/analytics'
import client from '@hcengineering/client'
import { setCurrentEmployee, type Employee } from '@hcengineering/contact'
import core, {
  ClientConnectEvent,
  concatLink,
  setCurrentAccount,
  versionToString,
  type Account,
  type Client,
  type PersonId,
  type Ref,
  type Version
} from '@hcengineering/core'
import login, { type WorkspaceLoginInfo } from '@hcengineering/login'
import { getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import presentation, {
  loadServerConfig,
  refreshClient,
  setClient,
  setPresentationCookie,
  upgradeDownloadProgress
} from '@hcengineering/presentation'
import { desktopPlatform, getCurrentLocation } from '@hcengineering/ui'
import { logOut } from '@hcengineering/workbench'
import { get, writable } from 'svelte/store'

export const versionError = writable<string | undefined>(undefined)
export const invalidError = writable<boolean>(false)
const versionStorageKey = 'last_server_version'

let _token: string | undefined
let _client: Client | undefined
let _clientSet: boolean = false

export async function connect (title: string): Promise<Client | undefined> {
  const loc = getCurrentLocation()
  const token = loc.query?.token
  const wsUrl = loc.path[1]
  if (wsUrl === undefined || token == null) {
    invalidError.set(true)
    return
  }

  const exchangeGuestToken = await getResource(login.function.ExchangeGuestToken)
  const exchangedToken = await exchangeGuestToken(token)

  const selectWorkspace = await getResource(login.function.SelectWorkspace)
  let workspaceLoginInfo: WorkspaceLoginInfo | undefined
  while (true) {
    const selectResult = await selectWorkspace(wsUrl, exchangedToken)
    if (!selectResult[2]) {
      // Connection error happen, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 1000))
      continue
    }
    workspaceLoginInfo = selectResult[1]
    if (workspaceLoginInfo == null) {
      const err = `Error selecting workspace ${wsUrl}. There might be something wrong with the token. Please try to log in again.`
      console.error(err)
      // something went wrong with selecting workspace with the selected token
      Analytics.handleError(new Error(err))
      await logOut()
      invalidError.set(true)
      return
    }
    break
  }

  setPresentationCookie(exchangedToken, workspaceLoginInfo.workspace)

  setMetadata(presentation.metadata.Token, exchangedToken)
  setMetadata(presentation.metadata.WorkspaceUuid, workspaceLoginInfo.workspace)
  setMetadata(presentation.metadata.WorkspaceDataId, workspaceLoginInfo.workspaceDataId)
  setMetadata(presentation.metadata.Endpoint, workspaceLoginInfo.endpoint)

  if (_token !== exchangedToken && _client !== undefined) {
    await _client.close()
    _client = undefined
  }
  if (_client !== undefined) {
    return _client
  }
  _token = exchangedToken

  let version: Version | undefined
  const clientFactory = await getResource(client.function.GetClient)
  _client = await clientFactory(exchangedToken, workspaceLoginInfo.endpoint, {
    onHello: (serverVersion?: string) => {
      const frontVersion = getMetadata(presentation.metadata.FrontVersion)
      if (
        serverVersion !== undefined &&
        serverVersion !== '' &&
        frontVersion !== undefined &&
        frontVersion !== serverVersion
      ) {
        const reloaded = localStorage.getItem(`versionUpgrade:s${serverVersion}:f${frontVersion}`)
        const isUpgrading = get(upgradeDownloadProgress) >= 0

        if (reloaded === null) {
          localStorage.setItem(`versionUpgrade:s${serverVersion}:f${frontVersion}`, 't')
          // It might have been refreshed manually and download has started - do not reload
          if (!isUpgrading) {
            location.reload()
          }

          return false
        } else {
          versionError.set(`Front version ${frontVersion} is not in sync with server version ${serverVersion}`)

          if (!desktopPlatform || !isUpgrading) {
            setTimeout(() => {
              // It might be possible that this callback will fire after the user has spent some time
              // in the upgrade !modal! dialog and clicked upgrade - check again and do not reload
              if (get(upgradeDownloadProgress) < 0) {
                location.reload()
              }
            }, 10000)
          }
          // For embedded if the download has started it should download the upgrade and restart the app

          return false
        }
      }

      return true
    },
    onUpgrade: () => {
      location.reload()
    },
    onUnauthorized: () => {
      void logOut().then(() => {
        invalidError.set(true)
      })
    },
    // We need to refresh all active live queries and clear old queries.
    onConnect: async (event: ClientConnectEvent, data: any) => {
      console.log('WorkbenchClient: onConnect', event)
      try {
        if (event === ClientConnectEvent.Connected) {
          setMetadata(presentation.metadata.SessionId, data)
        }
        if ((_clientSet && event === ClientConnectEvent.Connected) || event === ClientConnectEvent.Refresh) {
          void refreshClient(true)
        }

        if (event === ClientConnectEvent.Upgraded) {
          window.location.reload()
        }

        void (async () => {
          if (_client !== undefined) {
            const newVersion = await _client.findOne<Version>(core.class.Version, {})
            console.log('Reconnect Model version', newVersion)

            const currentVersionStr = versionToString(version as Version)
            const reconnectVersionStr = versionToString(newVersion as Version)

            if (currentVersionStr !== reconnectVersionStr) {
              // It seems upgrade happened
              location.reload()
              versionError.set(`${currentVersionStr} != ${reconnectVersionStr}`)
            }
            console.log('Server version', reconnectVersionStr)
            if (reconnectVersionStr !== '' && reconnectVersionStr !== currentVersionStr) {
              if (typeof sessionStorage !== 'undefined') {
                if (sessionStorage.getItem(versionStorageKey) !== reconnectVersionStr) {
                  sessionStorage.setItem(versionStorageKey, reconnectVersionStr)
                  location.reload()
                }
              }
              versionError.set(`${reconnectVersionStr} => ${currentVersionStr}`)
            }

            const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? ''
            const currentFrontVersion = getMetadata(presentation.metadata.FrontVersion)
            if (currentFrontVersion !== undefined) {
              const frontConfig = await loadServerConfig(concatLink(frontUrl, '/config.json'))
              if (frontConfig?.version !== undefined && frontConfig.version !== currentFrontVersion) {
                location.reload()
              }
            }
          }
        })()
      } catch (err) {
        console.error(err)
      }
    }
  })
  console.log('logging in as guest')

  const account = workspaceLoginInfo.account

  const me: Account = {
    uuid: account,
    role: workspaceLoginInfo.role,
    primarySocialId: '' as PersonId,
    socialIds: [],
    fullSocialIds: []
  }

  const data: Record<string, any> = {
    guest_uuid: account,
    visited_workspace: wsUrl,
    visited_workspace_uuid: workspaceLoginInfo.workspace
  }
  Analytics.handleEvent('GUEST LOGIN', data)

  if (me !== undefined) {
    Analytics.setUser(data.guest_uuid, data)
    Analytics.setWorkspace(wsUrl, true)
    console.log('login: employee account', me)
    setCurrentAccount(me)
    setCurrentEmployee('' as Ref<Employee>)
  }

  try {
    version = await _client.findOne<Version>(core.class.Version, {})
    console.log('Model version', version)

    const requiredVersion = getMetadata(presentation.metadata.ModelVersion)
    if (requiredVersion !== undefined && version !== undefined) {
      console.log('checking min model version', requiredVersion)
      const versionStr = versionToString(version)

      if (version === undefined || requiredVersion !== versionStr) {
        versionError.set(`${versionStr} => ${requiredVersion}`)
        return undefined
      }
    }
  } catch (err: any) {
    Analytics.handleError(err)
    console.error(err)
    const requirdVersion = getMetadata(presentation.metadata.ModelVersion)
    console.log('checking min model version', requirdVersion)
    if (requirdVersion !== undefined) {
      versionError.set(`'unknown' => ${requirdVersion}`)
      return undefined
    }
  }

  invalidError.set(false)
  versionError.set(undefined)
  // Update window title
  document.title = [wsUrl, title].filter((it) => it).join(' - ')
  _clientSet = true
  await setClient(_client)

  return _client
}
