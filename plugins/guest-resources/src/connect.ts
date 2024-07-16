import { Analytics } from '@hcengineering/analytics'
import client from '@hcengineering/client'
import core, {
  ClientConnectEvent,
  setCurrentAccount,
  versionToString,
  type AccountClient,
  type Client,
  type Version
} from '@hcengineering/core'
import login, { loginId } from '@hcengineering/login'
import { getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import presentation, { closeClient, refreshClient, setClient, setPresentationCookie } from '@hcengineering/presentation'
import { getCurrentWorkspaceUrl } from '@hcengineering/presentation/src/utils'
import { fetchMetadataLocalStorage, getCurrentLocation, navigate, setMetadataLocalStorage } from '@hcengineering/ui'
import { writable } from 'svelte/store'

export const versionError = writable<string | undefined>(undefined)
const versionStorageKey = 'last_server_version'

let _token: string | undefined
let _client: AccountClient | undefined
let _clientSet: boolean = false

export async function connect (title: string): Promise<Client | undefined> {
  const loc = getCurrentLocation()
  const token = loc.query?.token
  const ws = loc.path[1]
  if (ws === undefined || token == null) {
    navigate({
      path: [loginId]
    })
    return
  }
  setMetadata(presentation.metadata.Token, token)

  setPresentationCookie(token, getCurrentWorkspaceUrl())

  const getEndpoint = await getResource(login.function.GetEndpoint)
  const endpoint = await getEndpoint()
  if (endpoint == null) {
    navigate({
      path: [loginId]
    })
    return
  }

  if (_token !== token && _client !== undefined) {
    await _client.close()
    _client = undefined
  }
  if (_client !== undefined) {
    return _client
  }
  _token = token

  let version: Version | undefined
  const clientFactory = await getResource(client.function.GetClient)
  _client = await clientFactory(
    token,
    endpoint,
    () => {
      location.reload()
    },
    () => {
      clearMetadata(ws)
      navigate({
        path: [loginId],
        query: {}
      })
    },
    // We need to refresh all active live queries and clear old queries.
    (event: ClientConnectEvent) => {
      console.log('WorkbenchClient: onConnect', event)
      try {
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
              versionError.set(`${currentVersionStr} => ${reconnectVersionStr}`)
            }
          }
        })()
      } catch (err) {
        console.error(err)
      }
    }
  )
  console.log('logging in as guest')
  Analytics.handleEvent('GUEST LOGIN')
  Analytics.setWorkspace(ws)
  const me = await _client?.getAccount()
  if (me !== undefined) {
    Analytics.setUser(me.email)
    Analytics.setWorkspace(ws)
    console.log('login: employee account', me)
    setCurrentAccount(me)
  }

  try {
    version = await _client.findOne<Version>(core.class.Version, {})
    console.log('Model version', version)

    const requiredVersion = getMetadata(presentation.metadata.RequiredVersion)
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
    const requirdVersion = getMetadata(presentation.metadata.RequiredVersion)
    console.log('checking min model version', requirdVersion)
    if (requirdVersion !== undefined) {
      versionError.set(`'unknown' => ${requirdVersion}`)
      return undefined
    }
  }

  versionError.set(undefined)
  // Update window title
  document.title = [ws, title].filter((it) => it).join(' - ')
  _clientSet = true
  await setClient(_client)

  return _client
}

function clearMetadata (ws: string): void {
  const tokens = fetchMetadataLocalStorage(login.metadata.LoginTokens)
  if (tokens !== null) {
    const loc = getCurrentLocation()
    // eslint-disable-next-line
    delete tokens[loc.path[1]]
    setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
  }
  setMetadata(presentation.metadata.Token, null)
  setMetadataLocalStorage(login.metadata.LastToken, null)
  setPresentationCookie('', getCurrentWorkspaceUrl())
  setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
  setMetadataLocalStorage(login.metadata.LoginEmail, null)
  void closeClient()
}
