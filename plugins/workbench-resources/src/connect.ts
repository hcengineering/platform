import client from '@hcengineering/client'
import core, {
  AccountClient,
  AccountRole,
  Client,
  Version,
  getCurrentAccount,
  setCurrentAccount,
  versionToString
} from '@hcengineering/core'
import login, { loginId } from '@hcengineering/login'
import { addEventListener, broadcastEvent, getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import presentation, { closeClient, refreshClient, setClient } from '@hcengineering/presentation'
import ui, {
  fetchMetadataLocalStorage,
  getCurrentLocation,
  navigate,
  networkStatus,
  setMetadataLocalStorage,
  showPopup
} from '@hcengineering/ui'
import ServerManager from './components/ServerManager.svelte'
import plugin from './plugin'

export let versionError: string | undefined = ''

let _token: string | undefined
let _client: AccountClient | undefined

addEventListener(client.event.NetworkRequests, async (event: string, val: number) => {
  networkStatus.set(val)
})

export async function connect (title: string): Promise<Client | undefined> {
  const loc = getCurrentLocation()
  const ws = loc.path[1]
  if (ws === undefined) return
  const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
  const token = tokens[ws]
  setMetadata(presentation.metadata.Token, token)

  const endpoint = fetchMetadataLocalStorage(login.metadata.LoginEndpoint)
  const email = fetchMetadataLocalStorage(login.metadata.LoginEmail)

  if (token === undefined || endpoint === null || email === null) {
    navigate({
      path: [loginId],
      query: { navigateUrl: encodeURIComponent(JSON.stringify(loc)) }
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

  let clientSet = false

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
    (apply: boolean) => {
      try {
        if (clientSet && !apply) {
          void refreshClient()
        }

        void (async () => {
          const newVersion = await _client?.findOne<Version>(core.class.Version, {})
          console.log('Reconnect Model version', newVersion)

          const currentVersionStr = versionToString(version as Version)
          const reconnectVersionStr = versionToString(newVersion as Version)

          if (currentVersionStr !== reconnectVersionStr) {
            // It seems upgrade happened
            location.reload()
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
    await setClient(_client)
    clientSet = true
    return
  }

  try {
    version = await _client.findOne<Version>(core.class.Version, {})
    console.log('Model version', version)

    const requiredVersion = getMetadata(presentation.metadata.RequiredVersion)
    if (requiredVersion !== undefined && version !== undefined) {
      console.log('checking min model version', requiredVersion)
      const versionStr = versionToString(version)

      if (version === undefined || requiredVersion !== versionStr) {
        versionError = `${versionStr} => ${requiredVersion}`
        return undefined
      }
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
  await setClient(_client)

  if (me.role === AccountRole.Owner) {
    let ep = endpoint.replace(/^ws/g, 'http')
    if (ep.endsWith('/')) {
      ep = ep.substring(0, ep.length - 1)
    }
    setMetadata(ui.metadata.ShowNetwork, (evt: MouseEvent) => {
      if (getMetadata(presentation.metadata.Token) == null) {
        return
      }
      if (getCurrentAccount()?.role === AccountRole.Owner) {
        showPopup(
          ServerManager,
          {
            endpoint: ep,
            token
          },
          'content'
        )
      }
    })
  }
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
  setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
  setMetadataLocalStorage(login.metadata.LoginEmail, null)
  void closeClient()
}
