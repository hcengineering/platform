import { Analytics } from '@hcengineering/analytics'
import client from '@hcengineering/client'
import core, {
  ClientConnectEvent,
  concatLink,
  isWorkspaceCreating,
  metricsToString,
  setCurrentAccount,
  versionToString,
  TxFactory,
  generateId,
  type SocialId,
  type Account,
  type Client,
  type MeasureContext,
  type MeasureMetricsContext,
  type Version,
  type Ref,
  buildSocialIdString,
  pickPrimarySocialId,
  AccountRole
} from '@hcengineering/core'
import contact, { combineName, setCurrentEmployee, AvatarType, type Person, type Employee } from '@hcengineering/contact'
import login, { loginId } from '@hcengineering/login'
import { broadcastEvent, getMetadata, getResource, OK, setMetadata, translateCB } from '@hcengineering/platform'
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
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { writable, get } from 'svelte/store'

import plugin from './plugin'
import { workspaceCreating } from './utils'

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
  const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
  let token = tokens[wsUrl]

  const selectWorkspace = await getResource(login.function.SelectWorkspace)
  const workspaceLoginInfo = await ctx.with('select-workspace', {}, async () => (await selectWorkspace(wsUrl, token))[1])

  if (workspaceLoginInfo == null) {
    console.error(`Error selecting workspace ${wsUrl}. There might be something wrong with the token. Please try to log in again.`)
    // something went wrong with selecting workspace with the selected token
    clearMetadata(wsUrl)
    navigate({
      path: [loginId]
    })
    return
  }

  tokens[wsUrl] = workspaceLoginInfo.token
  token = workspaceLoginInfo.token
  setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
  setMetadata(presentation.metadata.WorkspaceUuid, workspaceLoginInfo.workspace)
  setMetadata(presentation.metadata.Endpoint, workspaceLoginInfo.endpoint)
  setMetadata(presentation.metadata.Token, token)

  const fetchWorkspace = await getResource(login.function.FetchWorkspace)
  let workspace = await ctx.with('fetch-workspace', {}, async () => (await fetchWorkspace())[1])

  if (workspace == null) {
    // something went wrong, workspace not exist, redirect to login
    console.error(`Error fetching workspace ${wsUrl}. It might no longer exist or be inaccessible. Please try to log in again.`)
    navigate({
      path: [loginId]
    })
    return
  }

  if (isWorkspaceCreating(workspace.mode)) {
    while (true) {
      if (wsUrl !== getCurrentLocation().path[1]) return

      workspaceCreating.set(workspace.processingProgress ?? 0)
      workspace = await ctx.with('fetch-workspace', {}, async () => (await fetchWorkspace())[1])

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
          clearMetadata(wsUrl)
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
          const newLoginInfo = await ctx.with('select-workspace', {}, async () => (await selectWorkspace(wsUrl, token))[1])
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
  const socialIds: SocialId[] = await getAccountClient(accountsUrl, token).getSocialIds()

  const me: Account = {
    uuid: account,
    role: workspaceLoginInfo.role,
    primarySocialId: pickPrimarySocialId(socialIds).key,
    socialIds: socialIds.map((si) => si.key)
  }

  // Ensure employee and social identifiers
  const employee = await ensureEmployee(ctx, me, newClient, socialIds)

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
  console.log(`Logged in with account ${me.uuid} as ${me.role}`)
  setCurrentAccount(me)
  setCurrentEmployee(employee)

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
  })
  await ctx.with('broadcast-connected', {}, async () => {
    await broadcastEvent(plugin.event.NotifyConnection, me)
  })
  console.log(metricsToString((ctx as MeasureMetricsContext).metrics, 'connect', 50))
  return newClient
}

async function ensureEmployee (
  ctx: MeasureContext,
  me: Account,
  client: Client,
  socialIds: SocialId[]
): Promise<Ref<Employee> | null> {
  const txFactory = new TxFactory(me.primarySocialId)
  const personByUuid = await client.findOne(contact.class.Person, { personUuid: me.uuid })
  let personRef: Ref<Person> | undefined = personByUuid?._id
  if (personRef === undefined) {
    const socialIdentity = await client.findOne(contact.class.SocialIdentity, { key: { $in: me.socialIds } })

    if (socialIdentity !== undefined && !socialIdentity.confirmed) {
      const updateSocialIdentityTx = txFactory.createTxUpdateDoc(contact.class.SocialIdentity, contact.space.Contacts, socialIdentity._id, {
        confirmed: true
      })

      await client.tx(updateSocialIdentityTx)
    }

    personRef = socialIdentity?.attachedTo
  }

  if (personRef === undefined) {
    await ctx.with('create-person', {}, async () => {
      const getPerson = await getResource(login.function.GetPerson)
      const [status, globalPerson] = await getPerson()

      if (status !== OK) {
        console.error('Error getting global person')
        return null
      }

      const data = {
        personUuid: me.uuid,
        name: combineName(globalPerson.firstName, globalPerson.lastName),
        city: globalPerson.city,
        avatarType: AvatarType.COLOR
      }
      personRef = generateId()

      const createPersonTx = txFactory.createTxCreateDoc(contact.class.Person, contact.space.Contacts, data, personRef)

      await client.tx(createPersonTx)
    })
  } else if (personByUuid === undefined) {
    const updatePersonTx = txFactory.createTxUpdateDoc(contact.class.Person, contact.space.Contacts, personRef, {
      personUuid: me.uuid
    })

    await client.tx(updatePersonTx)
  }

  if (me.role !== AccountRole.Guest) {
    const employee = await client.findOne(contact.mixin.Employee, { _id: personRef as Ref<Employee> })

    if (employee === undefined || !client.getHierarchy().hasMixin(employee, contact.mixin.Employee)) {
      await ctx.with('create-employee', {}, async () => {
        if (personRef === undefined) {
          // something went wrong
          console.error('Person not found')
          return null
        }

        const createEmployeeTx = txFactory.createTxMixin(personRef, contact.class.Person, contact.space.Contacts, contact.mixin.Employee, {
          active: true
        })

        await client.tx(createEmployeeTx)
      })
    }
  }

  const existingIdentifiers = await client.findAll(contact.class.SocialIdentity, {
    attachedTo: personRef,
    attachedToClass: contact.class.Person
  })

  for (const socialId of socialIds) {
    const existing = existingIdentifiers.find((it) => it.type === socialId.type && it.value === socialId.value)
    if (existing === undefined) {
      await ctx.with('create-social-identity', {}, async () => {
        if (personRef === undefined) {
          // something went wrong
          console.error('Person not found')
          return null
        }

        const createSocialIdTx = txFactory.createTxCollectionCUD(
          contact.class.Person,
          personRef,
          contact.space.Contacts,
          'socialIds',
          txFactory.createTxCreateDoc(contact.class.SocialIdentity, contact.space.Contacts, {
            attachedTo: personRef,
            attachedToClass: contact.class.Person,
            collection: 'socialIds',
            type: socialId.type,
            value: socialId.value,
            key: buildSocialIdString(socialId), // TODO: fill it in trigger or on DB level as stored calculated column or smth?
            confirmed: socialId.verifiedOn !== undefined && socialId.verifiedOn > 0
          })
        )

        await client.tx(createSocialIdTx)
      })
    }
  }

  // TODO: check for merged persons with this one and do the merge

  return personRef as Ref<Employee>
}

export function clearMetadata (ws: string): void {
  const tokens = fetchMetadataLocalStorage(login.metadata.LoginTokens)
  if (tokens !== null) {
    const loc = getCurrentLocation()
    // eslint-disable-next-line
    delete tokens[loc.path[1]]
    setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
  }
  const currentWorkspace = getMetadata(presentation.metadata.WorkspaceUuid)
  if (currentWorkspace !== undefined) {
    setPresentationCookie('', currentWorkspace)
  }

  setMetadata(presentation.metadata.Token, null)
  setMetadata(presentation.metadata.WorkspaceUuid, null)
  setMetadataLocalStorage(login.metadata.LastToken, null)
  setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
  setMetadataLocalStorage(login.metadata.LoginAccount, null)
  void closeClient()
}
