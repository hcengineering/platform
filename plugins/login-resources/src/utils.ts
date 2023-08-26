//
// Copyright © 2022 Hardcore Engineering Inc.
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

import login, { LoginInfo, Workspace, WorkspaceLoginInfo } from '@hcengineering/login'
import {
  OK,
  PlatformError,
  Status,
  getMetadata,
  setMetadata,
  unknownError,
  unknownStatus
} from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import {
  Location,
  fetchMetadataLocalStorage,
  getCurrentLocation,
  navigate,
  setMetadataLocalStorage,
  locationStorageKeyId
} from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'

const DEV_WORKSPACE = 'DEV WORKSPACE'

/**
 * Perform a login operation to required workspace with user credentials.
 */
export async function doLogin (email: string, password: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(login.metadata.OverrideLoginToken)
  if (token !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token, endpoint, email, confirmed: true }]
    }
  }

  const request = {
    method: 'login',
    params: [email, password]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    console.log('login result', result)
    return [result.error ?? OK, result.result]
  } catch (err) {
    console.log('login error', err)
    return [unknownError(err), undefined]
  }
}

export async function signUp (
  email: string,
  password: string,
  first: string,
  last: string
): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(login.metadata.OverrideLoginToken)
  if (token !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token, endpoint, email, confirmed: true }]
    }
  }

  const request = {
    method: 'createAccount',
    params: [email, password, first, last]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}

export async function createWorkspace (workspace: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  const email = fetchMetadataLocalStorage(login.metadata.LoginEmail) ?? ''
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token: overrideToken, endpoint, email, confirmed: true }]
    }
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return [unknownStatus('Please login'), undefined]
  }

  const request = {
    method: 'createWorkspace',
    params: [workspace]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}

export async function getWorkspaces (): Promise<Workspace[]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [
        {
          workspace: DEV_WORKSPACE
        }
      ]
    }
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return []
  }

  const request = {
    method: 'getUserWorkspaces',
    params: [] as any[]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    if (result.error != null) {
      throw new PlatformError(result.error)
    }
    return result.result
  } catch (err) {
    return []
  }
}

export async function getAccount (): Promise<LoginInfo | undefined> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    const email = fetchMetadataLocalStorage(login.metadata.LoginEmail) ?? ''
    if (endpoint !== undefined) {
      return { token: overrideToken, endpoint, email, confirmed: true }
    }
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return
  }

  const request = {
    method: 'getAccountInfoByToken',
    params: [] as any[]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    if (result.error != null) {
      throw new PlatformError(result.error)
    }
    return result.result
  } catch (err) {}
}

export async function selectWorkspace (workspace: string): Promise<[Status, WorkspaceLoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  const email = fetchMetadataLocalStorage(login.metadata.LoginEmail) ?? ''
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token: overrideToken, endpoint, email, workspace, confirmed: true }]
    }
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return [unknownStatus('Please login'), undefined]
  }

  const request = {
    method: 'selectWorkspace',
    params: [workspace]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}

export function setLoginInfo (loginInfo: WorkspaceLoginInfo): void {
  const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
  tokens[loginInfo.workspace] = loginInfo.token

  setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
  setMetadataLocalStorage(login.metadata.LoginEndpoint, loginInfo.endpoint)
  setMetadataLocalStorage(login.metadata.LoginEmail, loginInfo.email)
}

export function navigateToWorkspace (workspace: string, loginInfo?: WorkspaceLoginInfo, navigateUrl?: string): void {
  if (loginInfo == null) {
    return
  }
  setMetadata(presentation.metadata.Token, loginInfo.token)
  setLoginInfo(loginInfo)

  if (navigateUrl !== undefined) {
    try {
      const loc = JSON.parse(decodeURIComponent(navigateUrl)) as Location
      if (loc.path[1] === workspace) {
        navigate(loc)
        return
      }
    } catch (err: any) {
      // Json parse error could be ignored
    }
  }
  const last = localStorage.getItem(`${locationStorageKeyId}_${workspace}`)
  if (last !== null) {
    navigate(JSON.parse(last))
  } else {
    navigate({ path: [workbenchId, workspace] })
  }
}

export async function checkJoined (inviteId: string): Promise<[Status, WorkspaceLoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  const email = fetchMetadataLocalStorage(login.metadata.LoginEmail) ?? ''
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token: overrideToken, endpoint, email, workspace: DEV_WORKSPACE, confirmed: true }]
    }
  }

  let token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
    token = Object.values(tokens)[0]
    if (token === undefined) {
      return [unknownStatus('Please login'), undefined]
    }
  }

  const request = {
    method: 'checkJoin',
    params: [inviteId]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}

export async function getInviteLink (expHours: number = 1, emailMask: string = '', limit: number = -1): Promise<string> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  const exp = expHours * 1000 * 60 * 60

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return ''
  }

  const request = {
    method: 'getInviteLink',
    params: [exp, emailMask, limit]
  }

  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
  const result = await response.json()
  return result.result
}

export async function join (
  email: string,
  password: string,
  inviteId: string
): Promise<[Status, WorkspaceLoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(login.metadata.OverrideLoginToken)
  if (token !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token, endpoint, email, workspace: DEV_WORKSPACE, confirmed: true }]
    }
  }

  const request = {
    method: 'join',
    params: [email, password, inviteId]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}

export async function signUpJoin (
  email: string,
  password: string,
  first: string,
  last: string,
  inviteId: string
): Promise<[Status, WorkspaceLoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(login.metadata.OverrideLoginToken)
  if (token !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token, endpoint, email, workspace: DEV_WORKSPACE, confirmed: true }]
    }
  }

  const request = {
    method: 'signUpJoin',
    params: [email, password, first, last, inviteId]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}

export async function changePassword (oldPassword: string, password: string): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return
    }
  }
  const token = getMetadata(presentation.metadata.Token) as string

  const request = {
    method: 'changePassword',
    params: [oldPassword, password]
  }

  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
  const resp = await response.json()
  if (resp.error !== undefined) {
    throw new PlatformError(resp.error)
  }
}

export async function leaveWorkspace (email: string): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return
    }
  }
  const token = getMetadata(presentation.metadata.Token) as string

  const request = {
    method: 'leaveWorkspace',
    params: [email]
  }

  await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
}

export async function sendInvite (email: string): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return
    }
  }
  const token = getMetadata(presentation.metadata.Token) as string

  const request = {
    method: 'sendInvite',
    params: [email]
  }

  await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
}

export async function requestPassword (email: string): Promise<Status> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return OK
    }
  }
  const request = {
    method: 'requestPassword',
    params: [email]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return result.error ?? OK
  } catch (err) {
    return unknownError(err)
  }
}

export async function confirm (email: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const overrideToken = getMetadata(login.metadata.OverrideLoginToken)
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token: overrideToken, endpoint, email, confirmed: true }]
    }
  }
  const request = {
    method: 'confirm',
    params: [email]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}

export async function restorePassword (token: string, password: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const request = {
    method: 'restorePassword',
    params: [password]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const result = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}
