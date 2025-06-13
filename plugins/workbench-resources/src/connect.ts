import { Analytics } from '@hcengineering/analytics'
import client from '@hcengineering/client'
import { ensureEmployee, setCurrentEmployee } from '@hcengineering/contact'
import core, {
  type Account,
  AccountRole,
  type Client,
  ClientConnectEvent,
  concatLink,
  type Person as GlobalPerson,
  type MeasureMetricsContext,
  metricsToString,
  setCurrentAccount,
  type Version,
  versionToString,
  type WorkspaceUuid
} from '@hcengineering/core'
import login, { loginId } from '@hcengineering/login'
import platform, { broadcastEvent, getMetadata, getResource, OK, PlatformEvent, setMetadata, Severity, Status, translateCB } from '@hcengineering/platform'
import presentation, {
  loadServerConfig,
  purgeClient,
  refreshClient,
  setClient,
  setCommunicationClient,
  setPresentationCookie,
  setSingleWorkspace,
  setTargetWorkspace,
  uiContext,
  upgradeDownloadProgress
} from '@hcengineering/presentation'
import {
  desktopPlatform,
  getCurrentLocation,
  locationStorageKeyId,
  navigate,
  setMetadataLocalStorage,
  themeStore
} from '@hcengineering/ui'
import { get, writable } from 'svelte/store'

import plugin from './plugin'
import { logOut } from './utils'

export const versionError = writable<string | undefined>(undefined)
const versionStorageKey = 'last_server_version'

let _token: string | undefined
let _client: Client | undefined
let _clientSet: boolean = false

export async function disconnect (): Promise<void> {
  if (_client !== undefined) {
    await _client.close()
    _client = undefined
    _clientSet = false
  }
}

export async function connect (title: string, singleWorkspace: boolean = true): Promise<Client | undefined> {
  const ctx = uiContext.newChild('connect', {})
  const loc = getCurrentLocation()
  const wsUrl = loc.path[1]
  if (singleWorkspace && wsUrl === undefined) {
    const lastLoc = localStorage.getItem(locationStorageKeyId)
    if (lastLoc !== null) {
      const lastLocObj = JSON.parse(lastLoc)
      if (lastLocObj.path !== undefined && lastLocObj.path[0] === loc.path[0]) {
        navigate(lastLocObj)
        return
      }
    } else {
      navigate({
        path: [loginId]
      })
      return
    }
  }

  const selectWorkspace = await getResource(login.function.SelectWorkspace)
  const [, workspaceLoginInfo] = await ctx.with(
    'select-workspace',
    {},
    async () => await selectWorkspace(wsUrl, null, singleWorkspace)
  )

  if (workspaceLoginInfo == null) {
    console.error(
      `Error selecting workspace ${wsUrl}. There might be something wrong with the token. Please try to log in again.`
    )
    // something went wrong with selecting workspace with the selected token
    await logOut()
    navigate({ path: [loginId] })
    return
  }

  const token = workspaceLoginInfo.token

  setMetadata(presentation.metadata.Token, workspaceLoginInfo.token)

  setMetadata(presentation.metadata.Endpoint, workspaceLoginInfo.endpoint)

  setMetadata(presentation.metadata.PersonalWorkspaceUuid, workspaceLoginInfo.personalWorkspace)

  // Set for target workspace for now
  setMetadata(presentation.metadata.WorkspaceUuid, workspaceLoginInfo.workspace)
  setMetadata(presentation.metadata.WorkspaceDataId, workspaceLoginInfo.workspaceDataId)
  setMetadata(presentation.metadata.PersonalWorkspaceUuid, core.workspace.Personal) // No personal workspace set in single workspace mode

  setPresentationCookie(token, workspaceLoginInfo.workspace)
  setMetadataLocalStorage(login.metadata.LoginEndpoint, workspaceLoginInfo?.endpoint)

  const endpoint = getMetadata(login.metadata.TransactorOverride) ?? workspaceLoginInfo?.endpoint
  const account = workspaceLoginInfo.account
  if (token == null || endpoint == null || account == null) {
    console.error('Something of the vital auth info is missing. Please try to log in again.')
    const navigateUrl = encodeURIComponent(JSON.stringify(loc))
    navigate({
      path: [loginId],
      query: { navigateUrl }
    })
    return
  }

  let tokenChanged = false

  if (_token !== token && _client !== undefined) {
    // We need to flush all data from memory
    await ctx.with('purge-client', {}, async () => {
      await purgeClient()
    })
    await ctx.with('close previous client', {}, async () => {
      await _client?.close()
    })
    _client = undefined
    tokenChanged = true
  }
  if (_client !== undefined) {
    return _client
  }
  _token = token

  const clientFactory = await getResource(client.function.GetClient)
  let version: Version | undefined
  let accountRef: Account | undefined
  const newClient = await ctx.with(
    'create-client',
    {},
    async (ctx) =>
      await clientFactory(token, endpoint, {
        onAccount: (a) => {
          accountRef = a
        },
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
        onUnauthorized: () => {
          void logOut().then(() => {
            navigate({
              path: [loginId],
              query: {}
            })
          })
        },
        // We need to refresh all active live queries and clear old queries.
        onConnect: async (event: ClientConnectEvent, data: any): Promise<void> => {
          console.log('WorkbenchClient: onConnect', event)
          if (event === ClientConnectEvent.Maintenance) {
            if (data != null && data.total !== 0) {
              translateCB(plugin.string.ServerUnderMaintenance, {}, get(themeStore).language, (r) => {
                versionError.set(`${r} ${Math.floor((100 / data.total) * (data.total - data.toProcess))}%`)
              })
            } else {
              translateCB(plugin.string.ServerUnderMaintenance, {}, get(themeStore).language, (r) => {
                versionError.set(r)
              })
            }
            return
          }
          try {
            if (event === ClientConnectEvent.Connected || event === ClientConnectEvent.Reconnected) {
              setMetadata(presentation.metadata.SessionId, data)
            }
            if ((_clientSet && event === ClientConnectEvent.Connected) || event === ClientConnectEvent.Refresh) {
              void ctx.with('refresh client', {}, async () => {
                await refreshClient(tokenChanged)
              })
              tokenChanged = false
            }

            if (event === ClientConnectEvent.Upgraded) {
              window.location.reload()
            }

            void (async () => {
              if (_client !== undefined) {
                const newVersion = await ctx.with(
                  'find-version',
                  {},
                  async () => await newClient.findOne<Version>(core.class.Version, {})
                )
                console.log('Reconnect Model version', newVersion)

                const currentVersionStr = versionToString(version as Version)
                const reconnectVersionStr = versionToString(newVersion as Version)

                if (currentVersionStr !== reconnectVersionStr) {
                  // It seems upgrade happened
                  location.reload()
                  versionError.set(`${currentVersionStr} != ${reconnectVersionStr}`)
                }

                console.log(
                  'Server version',
                  reconnectVersionStr,
                  version !== undefined ? versionToString(version) : ''
                )

                if (reconnectVersionStr !== '' && currentVersionStr !== reconnectVersionStr) {
                  if (typeof sessionStorage !== 'undefined') {
                    if (sessionStorage.getItem(versionStorageKey) !== reconnectVersionStr) {
                      sessionStorage.setItem(versionStorageKey, reconnectVersionStr)
                      location.reload()
                    }
                  }
                  versionError.set(`${currentVersionStr} != ${reconnectVersionStr}`)
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
        },
        ctx,
        onDialTimeout: async () => {
          const newLoginInfo = await ctx.with(
            'select-workspace',
            {},
            async () => (await selectWorkspace(wsUrl, token, singleWorkspace))[1]
          )
          if (newLoginInfo?.endpoint !== endpoint) {
            console.log('endpoint changed, reloading')
            location.reload()
          }
        }
      })
  )

  if (accountRef == null) {
    accountRef = await newClient.getConnection?.()?.getAccount()
  }
  if (accountRef == null) {
    throw new Error('Failed to get account')
  }

  _client = newClient

  // Ensure employee and social identifiers
  const employee = await ensureEmployee(
    ctx,
    accountRef,
    newClient,
    workspaceLoginInfo.workspace,
    Array.from(accountRef.fullSocialIds.values()),
    getGlobalPerson
  )

  if (!singleWorkspace) {
    // We need to be sure all other employee instances are created.
    for (const [ws, info] of Object.entries(accountRef.workspaces)) {
      if (ws === workspaceLoginInfo.workspace || info.maintenance || !info.enabled) {
        continue
      }
      await ensureEmployee(
        ctx,
        accountRef,
        newClient,
        ws as WorkspaceUuid,
        Array.from(accountRef.fullSocialIds.values()),
        getGlobalPerson
      )
    }
  }

  if (employee == null) {
    console.log('Failed to ensure employee')
    navigate({
      path: [loginId],
      query: {}
    })
    return
  }

  Analytics.setUser(account)
  Analytics.setTag('workspace', wsUrl)
  console.log('Logged in with account: ', accountRef)
  setCurrentAccount(accountRef)
  setCurrentEmployee(employee)
  if (workspaceLoginInfo.workspace !== undefined) {
    setTargetWorkspace(workspaceLoginInfo.workspace)
  }

  if (accountRef.role === AccountRole.ReadOnlyGuest) {
    await broadcastEvent(PlatformEvent, new Status(Severity.INFO, platform.status.ReadOnlyAccount, {}))
  }

  try {
    version = await ctx.with(
      'find-model-version',
      {},
      async () => await newClient.findOne<Version>(core.class.Version, {})
    )
    console.log('Model version', version)

    const requiredVersion = getMetadata(presentation.metadata.ModelVersion)
    if (requiredVersion !== undefined && version !== undefined && requiredVersion !== '') {
      console.log('checking min model version', requiredVersion)
      const versionStr = versionToString(version)

      if (version === undefined || requiredVersion !== versionStr) {
        versionError.set(`${versionStr} => ${requiredVersion}`)
        return undefined
      }
    }
  } catch (err: any) {
    console.error(err)
    Analytics.handleError(err)
    const requiredVersion = getMetadata(presentation.metadata.ModelVersion)
    console.log('checking min model version', requiredVersion)
    if (requiredVersion !== undefined) {
      versionError.set(`'unknown' => ${requiredVersion}`)
      return undefined
    }
  }

  versionError.set(undefined)

  // Update window title
  document.title = [wsUrl, title].filter((it) => it).join(' - ')
  _clientSet = true
  await ctx.with('set-client', {}, async () => {
    setSingleWorkspace(singleWorkspace)
    await setClient(newClient)

    await setCommunicationClient(newClient)
  })
  await ctx.with('broadcast-connected', {}, async () => {
    await broadcastEvent(plugin.event.NotifyConnection, accountRef)
  })
  console.log(metricsToString((ctx as MeasureMetricsContext).metrics, 'connect', 50))
  return newClient
}

async function getGlobalPerson (): Promise<GlobalPerson | undefined> {
  const getPerson = await getResource(login.function.GetPerson)
  const [status, globalPerson] = await getPerson()

  if (status !== OK) {
    console.error('Error getting global person')
    return undefined
  }

  return globalPerson
}
