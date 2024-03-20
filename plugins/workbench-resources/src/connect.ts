import { Analytics } from '@hcengineering/analytics'
import client from '@hcengineering/client'
import core, {
  ClientConnectEvent,
  getCurrentAccount,
  setCurrentAccount,
  versionToString,
  type AccountClient,
  type Client,
  type Version
} from '@hcengineering/core'
import login, { loginId } from '@hcengineering/login'
import { addEventListener, broadcastEvent, getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import presentation, { closeClient, purgeClient, refreshClient, setClient } from '@hcengineering/presentation'
import {
  fetchMetadataLocalStorage,
  getCurrentLocation,
  locationStorageKeyId,
  navigate,
  networkStatus,
  setMetadataLocalStorage
} from '@hcengineering/ui'
import plugin from './plugin'

export let versionError: string | undefined = ''

let _token: string | undefined
let _client: AccountClient | undefined
let _clientSet: boolean = false

addEventListener(client.event.NetworkRequests, async (event: string, val: number) => {
  networkStatus.set(val)
})

export async function disconnect (): Promise<void> {
  if (_client !== undefined) {
    await _client.close()
    _client = undefined
    _clientSet = false
  }
}

export async function connect (title: string): Promise<Client | undefined> {
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
  if (token === undefined && getMetadata(presentation.metadata.Token) !== undefined) {
    const selectWorkspace = await getResource(login.function.SelectWorkspace)
    const loginInfo = (await selectWorkspace(ws))[1]
    if (loginInfo !== undefined) {
      tokens[ws] = loginInfo.token
      token = loginInfo.token
      setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
    }
  }
  setMetadata(presentation.metadata.Token, token)
  document.cookie =
    encodeURIComponent(presentation.metadata.Token.replaceAll(':', '-')) + '=' + encodeURIComponent(token) + '; path=/'

  const endpoint = fetchMetadataLocalStorage(login.metadata.LoginEndpoint)
  const email = fetchMetadataLocalStorage(login.metadata.LoginEmail)
  if (token === undefined || endpoint === null || email === null) {
    const navigateUrl = encodeURIComponent(JSON.stringify(loc))
    navigate({
      path: [loginId],
      query: { navigateUrl }
    })
    return
  }

  if (_token !== token && _client !== undefined) {
    // We need to flush all data from memory
    await purgeClient()
    await _client.close()
    _client = undefined
  }
  if (_client !== undefined) {
    return _client
  }
  _token = token

  let version: Version | undefined
  let serverEndpoint = endpoint.replace(/^ws/g, 'http')
  if (serverEndpoint.endsWith('/')) {
    serverEndpoint = serverEndpoint.substring(0, serverEndpoint.length - 1)
  }
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
          void refreshClient()
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
              // location.reload()
              versionError = `${currentVersionStr} != ${reconnectVersionStr}`
            }
            const serverVersion: { version: string } = await (
              await fetch(serverEndpoint + '/api/v1/version', {})
            ).json()

            console.log('Server version', serverVersion.version)
            if (serverVersion.version !== '' && serverVersion.version !== currentVersionStr) {
              versionError = `${currentVersionStr} => ${serverVersion.version}`
            }
          }
        })()
      } catch (err) {
        console.error(err)
      }
    }
  )
  console.log('logging in as', email)

  const me = await _client?.getAccount()
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
    await setClient(_client)
    return
  }
  try {
    version = await _client.findOne<Version>(core.class.Version, {})
    console.log('Model version', version)

    const requiredVersion = getMetadata(presentation.metadata.RequiredVersion)
    if (requiredVersion !== undefined && version !== undefined && requiredVersion !== '') {
      console.log('checking min model version', requiredVersion)
      const versionStr = versionToString(version)

      if (version === undefined || requiredVersion !== versionStr) {
        versionError = `${versionStr} => ${requiredVersion}`
        return undefined
      }
    }

    try {
      const serverVersion: { version: string } = await (await fetch(serverEndpoint + '/api/v1/version', {})).json()

      console.log('Server version', serverVersion.version)
      if (
        serverVersion.version !== '' &&
        (version === undefined || serverVersion.version !== versionToString(version))
      ) {
        const versionStr = version !== undefined ? versionToString(version) : 'unknown'
        versionError = `${versionStr} => ${serverVersion.version}`
        return
      }
    } catch (err: any) {
      versionError = 'server version not available'
      return
    }
  } catch (err: any) {
    console.log(err)
    const requirdVersion = getMetadata(presentation.metadata.RequiredVersion)
    console.log('checking min model version', requirdVersion)
    if (requirdVersion !== undefined) {
      versionError = `'unknown' => ${requirdVersion}`
      return undefined
    }
  }

  // Update window title
  document.title = [ws, title].filter((it) => it).join(' - ')
  _clientSet = true
  await setClient(_client)
  await broadcastEvent(plugin.event.NotifyConnection, getCurrentAccount())

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
  document.cookie =
    encodeURIComponent(presentation.metadata.Token.replaceAll(':', '-')) + '=' + encodeURIComponent('') + '; path=/'
  setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
  setMetadataLocalStorage(login.metadata.LoginEmail, null)
  void closeClient()
}
