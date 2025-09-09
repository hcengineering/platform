import { getClient as getAccountClient, type WorkspaceLoginInfo } from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
import client from '@hcengineering/client'
import contact, { ensureEmployee, setCurrentEmployee, setCurrentEmployeeSpace } from '@hcengineering/contact'
import core, {
  type Account,
  AccountRole,
  type Client,
  ClientConnectEvent,
  concatLink,
  type Person as GlobalPerson,
  isWorkspaceCreating,
  type MeasureMetricsContext,
  metricsToString,
  pickPrimarySocialId,
  setCurrentAccount,
  type SocialId,
  type Version,
  versionToString,
  SocialIdType,
  type WorkspaceInfoWithStatus
} from '@hcengineering/core'
import login, { loginId, type Pages } from '@hcengineering/login'
import platform, {
  broadcastEvent,
  getMetadata,
  getResource,
  OK,
  PlatformEvent,
  setMetadata,
  setPlatformStatus,
  Severity,
  Status,
  translateCB
} from '@hcengineering/platform'
import presentation, {
  loadServerConfig,
  purgeClient,
  purgeCommunicationClient,
  refreshClient,
  refreshCommunicationClient,
  setClient,
  setCommunicationClient,
  setPresentationCookie,
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
import { logOut, workspaceCreating } from './utils'
import { WorkbenchEvents } from '@hcengineering/workbench'
import { allowGuestSignUpStore } from '@hcengineering/view-resources'

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

export async function connect (title: string): Promise<Client | undefined> {
  const ctx = uiContext.newChild('connect', {})
  const loc = getCurrentLocation()
  const wsUrl = loc.path[1]
  if (wsUrl === undefined) {
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
  let workspaceLoginInfo: WorkspaceLoginInfo | undefined

  while (true) {
    const selectResult = await ctx.with('select-workspace', {}, async () => await selectWorkspace(wsUrl, null))
    workspaceLoginInfo = selectResult[1] ?? undefined
    if (!selectResult[2]) {
      // Connection error happen, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 1000))
      continue
    }

    // OK but unauthorized - we need to login
    if (workspaceLoginInfo == null) {
      console.error(
        `Error selecting workspace ${wsUrl}. There might be something wrong with the token. Please try to log in again.`
      )
      // something went wrong with selecting workspace with the selected token
      await logOut()
      navigate({ path: [loginId] })
      return
    }
    break
  }

  const token = workspaceLoginInfo.token

  setMetadata(presentation.metadata.Token, workspaceLoginInfo.token)
  setMetadata(presentation.metadata.WorkspaceUuid, workspaceLoginInfo.workspace)
  setMetadata(presentation.metadata.Endpoint, workspaceLoginInfo.endpoint)

  const fetchWorkspace = await getResource(login.function.FetchWorkspace)

  let workspace: WorkspaceInfoWithStatus | undefined

  while (true) {
    const fetchResult = await ctx.with('fetch-workspace', {}, async () => await fetchWorkspace())

    if (!fetchResult[2]) {
      // Connection error happen, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 1000))
      continue
    }

    workspace = fetchResult[1]
    if (workspace == null) {
      // something went wrong, workspace not exist, redirect to login
      console.error(
        `Error fetching workspace ${wsUrl}. It might no longer exist or be inaccessible. Please try to log in again.`
      )
      navigate({
        path: [loginId]
      })
      return
    }
    break
  }

  setMetadata(presentation.metadata.WorkspaceDataId, workspace.dataId)

  if (isWorkspaceCreating(workspace.mode)) {
    while (true) {
      if (wsUrl !== getCurrentLocation().path[1]) return

      workspaceCreating.set(workspace.processingProgress ?? 0)
      const fetchResult = await ctx.with('fetch-workspace', {}, async () => await fetchWorkspace())
      if (!fetchResult[2]) {
        // Connection error happen, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }
      workspace = fetchResult[1]

      if (workspace == null) {
        // something went wrong, workspace not exist, redirect to login
        navigate({
          path: [loginId]
        })
        return
      }

      workspaceCreating.set(workspace.processingProgress ?? 0)

      if (!isWorkspaceCreating(workspace.mode)) {
        workspaceCreating.set(-1)
        break
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 1000))
    }
  }

  setPresentationCookie(token, workspaceLoginInfo.workspace)
  setMetadataLocalStorage(login.metadata.LoginEndpoint, workspaceLoginInfo?.endpoint)

  const endpoint = getMetadata(login.metadata.TransactorOverride) ?? workspaceLoginInfo?.endpoint
  const account = workspaceLoginInfo?.account
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
      await purgeCommunicationClient()
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
          void logOut().then(() => {
            navigate({
              path: [loginId],
              query: {}
            })
          })
        },
        onArchived: () => {
          translateCB(plugin.string.WorkspaceIsArchived, {}, get(themeStore).language, (r) => {
            const selectWorkspace: Pages = 'selectWorkspace'
            navigate({
              path: [loginId, selectWorkspace],
              query: {}
            })
          })
        },
        onMigration: () => {
          // TODO: Rework maitenance mode as well
          translateCB(plugin.string.WorkspaceIsMigrating, {}, get(themeStore).language, (r) => {
            versionError.set(r)
            setTimeout(() => {
              location.reload()
            }, 5000)
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
                await refreshCommunicationClient()
              })
              tokenChanged = false
            } else if (event === ClientConnectEvent.Reconnected) {
              await refreshCommunicationClient()
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
            async () => (await selectWorkspace(wsUrl, token))[1]
          )
          if (newLoginInfo?.endpoint !== endpoint) {
            console.log('endpoint changed, reloading')
            location.reload()
          }
        }
      })
  )

  _client = newClient

  // TODO: should we take the function from some resource like fetchWorkspace/selectWorkspace
  // to remove account client dependency?
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const socialIds: SocialId[] = await getAccountClient(accountsUrl, token).getSocialIds(true)

  const me: Account = {
    uuid: account,
    role: workspaceLoginInfo.role,
    primarySocialId: pickPrimarySocialId(socialIds)._id,
    socialIds: socialIds.map((si) => si._id),
    fullSocialIds: socialIds
  }

  // Ensure employee and social identifiers
  if (workspaceLoginInfo.role !== AccountRole.Admin) {
    const employee = await ensureEmployee(ctx, me, newClient, socialIds, getGlobalPerson)

    if (employee == null) {
      console.log('Failed to ensure employee')
      navigate({
        path: [loginId],
        query: {}
      })
      return
    }

    const space = await newClient.findOne(contact.class.PersonSpace, { person: employee }, { projection: { _id: 1 } })

    setCurrentEmployee(employee)
    if (space !== undefined) {
      setCurrentEmployeeSpace(space._id)
    } else {
      console.error('Failed to find space for employee')
    }
    await setPlatformStatus(OK)
  } else {
    setCurrentEmployee(core.employee.System)
    await setPlatformStatus(new Status(Severity.INFO, platform.status.SystemAccount, {}))
  }

  const hasEmail = (si: SocialId): boolean => {
    return [SocialIdType.EMAIL, SocialIdType.GOOGLE, SocialIdType.GITHUB].some((type) => type === si.type)
  }
  const email = me.fullSocialIds.find((si) => hasEmail(si))?.key
  const socialId = me.fullSocialIds.find((si) => si._id === me.primarySocialId)?.key

  const data: Record<string, any> = {
    social_id: email ?? socialId ?? account,
    primary_social_id: socialId,
    account_uuid: account,
    role: workspaceLoginInfo.role,
    branding: workspace.branding ?? 'unknown'
  }

  const guestRole =
    workspaceLoginInfo.role === AccountRole.ReadOnlyGuest ||
    workspaceLoginInfo.role === AccountRole.DocGuest ||
    workspaceLoginInfo.role === AccountRole.Guest
  if (guestRole) {
    data.visited_workspace = workspace.url
    data.visited_workspace_uuid = workspace.uuid
  } else {
    data.workspace = workspace.url
    data.workspace_uuid = workspace.uuid
  }

  Analytics.setUser(data.social_id, data)
  Analytics.setWorkspace(workspace.url, guestRole)
  Analytics.handleEvent(WorkbenchEvents.Connect)
  console.log('Logged in with account: ', me)
  setCurrentAccount(me)

  allowGuestSignUpStore.set(workspaceLoginInfo.allowGuestSignUp ?? false)

  if (me.role === AccountRole.ReadOnlyGuest) {
    await broadcastEvent(PlatformEvent, new Status(Severity.INFO, platform.status.ReadOnlyAccount, {}))
  } else {
    await broadcastEvent(PlatformEvent, new Status(Severity.INFO, platform.status.RegularAccount, {}))
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
    await setClient(newClient)
    await setCommunicationClient(newClient)
  })
  await ctx.with('broadcast-connected', {}, async () => {
    await broadcastEvent(plugin.event.NotifyConnection, me)
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
