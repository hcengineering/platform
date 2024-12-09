import { Analytics } from '@hcengineering/analytics'
import client from '@hcengineering/client'
import core, {
  ClientConnectEvent,
  concatLink,
  getCurrentAccount,
  isWorkspaceCreating,
  metricsToString,
  setCurrentAccount,
  versionToString,
  type Account,
  type AccountClient,
  type Client,
  type MeasureMetricsContext,
  type Version
} from '@hcengineering/core'
import login, { loginId } from '@hcengineering/login'
import { broadcastEvent, getMetadata, getResource, setMetadata, translateCB } from '@hcengineering/platform'
import presentation, {
  closeClient,
  loadServerConfig,
  purgeClient,
  refreshClient,
  setClient,
  setPresentationCookie,
  uiContext,
  upgradeDownloadProgress
} from '@hcengineering/presentation'
import {
  desktopPlatform,
  fetchMetadataLocalStorage,
  getCurrentLocation,
  locationStorageKeyId,
  navigate,
  setMetadataLocalStorage,
  themeStore
} from '@hcengineering/ui'
import { get, writable } from 'svelte/store'

import plugin from './plugin'
import { workspaceCreating } from './utils'

export const versionError = writable<string | undefined>(undefined)
const versionStorageKey = 'last_server_version'

let _token: string | undefined
let _client: AccountClient | undefined
let _clientSet: boolean = false

export async function disconnect (): Promise<void> {
  if (_client !== undefined) {
    await _client.close()
    _client = undefined
    _clientSet = false
  }
}

export async function connect (title: string): Promise<Client | undefined> {
  const ctx = uiContext.newChild('connect', {})
  const loc = getCurrentLocation()
  const ws = loc.path[1]
  if (ws === undefined) {
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
  const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
  let token = tokens[ws]

  const selectWorkspace = await getResource(login.function.SelectWorkspace)
  const workspaceLoginInfo = await ctx.with('select-workspace', {}, async () => (await selectWorkspace(ws, token))[1])
  if (workspaceLoginInfo !== undefined) {
    tokens[ws] = workspaceLoginInfo.token
    token = workspaceLoginInfo.token
    setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
    setMetadata(presentation.metadata.Workspace, workspaceLoginInfo.workspace)
    setMetadata(presentation.metadata.WorkspaceId, workspaceLoginInfo.workspaceId)
    setMetadata(presentation.metadata.Endpoint, workspaceLoginInfo.endpoint)
  }

  setMetadata(presentation.metadata.Token, token)

  if (isWorkspaceCreating(workspaceLoginInfo?.mode)) {
    const fetchWorkspace = await getResource(login.function.FetchWorkspace)
    let loginInfo = await ctx.with('fetch-workspace', {}, async () => (await fetchWorkspace(ws))[1])
    if (isWorkspaceCreating(loginInfo?.mode)) {
      while (true) {
        if (ws !== getCurrentLocation().path[1]) return
        workspaceCreating.set(loginInfo?.progress ?? 0)
        loginInfo = await ctx.with('fetch-workspace', {}, async () => (await fetchWorkspace(ws))[1])
        if (loginInfo === undefined) {
          // something went wrong, workspace not exist, redirect to login
          navigate({
            path: [loginId]
          })
          return
        }
        workspaceCreating.set(loginInfo?.progress)
        if (!isWorkspaceCreating(loginInfo?.mode)) {
          workspaceCreating.set(-1)
          break
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  if (workspaceLoginInfo !== undefined) {
    setPresentationCookie(token, workspaceLoginInfo.workspaceId)
  }

  setMetadataLocalStorage(login.metadata.LoginEndpoint, workspaceLoginInfo?.endpoint)

  const endpoint = workspaceLoginInfo?.endpoint // fetchMetadataLocalStorage(login.metadata.LoginEndpoint)
  const email = workspaceLoginInfo?.email // fetchMetadataLocalStorage(login.metadata.LoginEmail)
  if (token == null || endpoint == null || email == null) {
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
  const newClient = await ctx.with(
    'create-client',
    {},
    async (ctx) =>
      await clientFactory(token, endpoint, {
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
          clearMetadata(ws)
          navigate({
            path: [loginId],
            query: {}
          })
        },
        onArchived: () => {
          translateCB(plugin.string.WorkspaceIsArchived, {}, get(themeStore).language, (r) => {
            versionError.set(r)
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
            if (event === ClientConnectEvent.Connected) {
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
          const newLoginInfo = await ctx.with('select-workspace', {}, async () => (await selectWorkspace(ws, token))[1])
          if (newLoginInfo?.endpoint !== endpoint) {
            console.log('endpoint changed, reloading')
            location.reload()
          }
        }
      })
  )

  _client = newClient
  console.log('logging in as', email)

  const me: Account | undefined = await ctx.with('get-account', {}, async () => await newClient.getAccount())
  if (me !== undefined) {
    Analytics.setUser(me.email)
    Analytics.setTag('workspace', ws)
    console.log('login: employee account', me)
    setCurrentAccount(me)
  } else {
    console.error('WARNING: no employee account found.')

    clearMetadata(ws)
    navigate({
      path: [loginId],
      query: { navigateUrl: encodeURIComponent(JSON.stringify(getCurrentLocation())) }
    })

    // Update on connect, so it will be triggered
    _clientSet = true
    const client = _client
    await ctx.with('set-client', {}, async () => {
      await setClient(client)
    })
    return
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
  document.title = [ws, title].filter((it) => it).join(' - ')
  _clientSet = true
  await ctx.with('set-client', {}, async () => {
    await setClient(newClient)
  })
  await ctx.with('broadcast-connected', {}, async () => {
    await broadcastEvent(plugin.event.NotifyConnection, getCurrentAccount())
  })
  console.log(metricsToString((ctx as MeasureMetricsContext).metrics, 'connect', 50))
  return newClient
}

function clearMetadata (ws: string): void {
  const tokens = fetchMetadataLocalStorage(login.metadata.LoginTokens)
  if (tokens !== null) {
    const loc = getCurrentLocation()
    // eslint-disable-next-line
    delete tokens[loc.path[1]]
    setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
  }
  const currentWorkspace = getMetadata(presentation.metadata.WorkspaceId)
  if (currentWorkspace !== undefined) {
    setPresentationCookie('', currentWorkspace)
  }

  setMetadata(presentation.metadata.Token, null)
  setMetadata(presentation.metadata.Workspace, null)
  setMetadata(presentation.metadata.WorkspaceId, null)
  setMetadataLocalStorage(login.metadata.LastToken, null)
  setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
  setMetadataLocalStorage(login.metadata.LoginEmail, null)
  void closeClient()
}
