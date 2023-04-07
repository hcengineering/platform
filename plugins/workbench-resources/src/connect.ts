import client from '@hcengineering/client'
import contact from '@hcengineering/contact'
import core, { Client, setCurrentAccount, Version, versionToString } from '@hcengineering/core'
import login, { loginId } from '@hcengineering/login'
import { getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import presentation, { refreshClient, setClient } from '@hcengineering/presentation'
import { fetchMetadataLocalStorage, getCurrentLocation, navigate, setMetadataLocalStorage } from '@hcengineering/ui'

export let versionError: string | undefined = ''

let _token: string | undefined
let _client: Client | undefined

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
          console.log('Reconnect Model version', version)

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

  const me = await _client.findOne(contact.class.EmployeeAccount, { email })
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

    const requirdVersion = getMetadata(presentation.metadata.RequiredVersion)
    if (requirdVersion !== undefined && version !== undefined) {
      console.log('checking min model version', requirdVersion)
      const versionStr = versionToString(version)

      if (version === undefined || requirdVersion !== versionStr) {
        versionError = `${versionStr} => ${requirdVersion}`
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
}
