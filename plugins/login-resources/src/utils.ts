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

import login from '@hcengineering/login'
import {
  getMetadata,
  OK,
  PlatformError,
  Request,
  Response,
  serialize,
  Status,
  unknownError,
  unknownStatus,
  setMetadata
} from '@hcengineering/platform'
import {
  fetchMetadataLocalStorage,
  getCurrentLocation,
  navigate,
  setMetadataLocalStorage,
  Location
} from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'

export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string
}

export interface LoginInfo {
  token: string
  endpoint: string
  email: string
}

export interface Workspace {
  workspace: string
}

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
      return [OK, { token, endpoint, email }]
    }
  }

  const request: Request<[string, string]> = {
    method: 'login',
    params: [email, password]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
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
      return [OK, { token, endpoint, email }]
    }
  }

  const request: Request<[string, string, string, string]> = {
    method: 'createAccount',
    params: [email, password, first, last]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
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
      return [OK, { token: overrideToken, endpoint, email }]
    }
  }

  const token = getMetadata(login.metadata.LoginToken)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return [unknownStatus('Please login'), undefined]
  }

  const request: Request<[string]> = {
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
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
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

  const token = getMetadata(login.metadata.LoginToken)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return []
  }

  const request: Request<[]> = {
    method: 'getUserWorkspaces',
    params: []
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
    if (result.error != null) {
      throw new PlatformError(result.error)
    }
    return result.result
  } catch (err) {
    return []
  }
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
      return [OK, { token: overrideToken, endpoint, email, workspace }]
    }
  }

  const token = getMetadata(login.metadata.LoginToken)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return [unknownStatus('Please login'), undefined]
  }

  const request: Request<[string]> = {
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
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
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
  setMetadata(login.metadata.LoginToken, loginInfo.token)
  setLoginInfo(loginInfo)

  if (navigateUrl !== undefined) {
    const loc = JSON.parse(decodeURIComponent(navigateUrl)) as Location
    try {
      const url = JSON.parse(decodeURIComponent(loc.query?.navigateUrl ?? '{}')) as Location
      if (url.path[1] === workspace) {
        navigate(url)

        return
      }
    } catch (err: any) {
      // Json parse error could be ignored
    }
  }
  navigate({ path: [workbenchId, workspace] })
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
      return [OK, { token: overrideToken, endpoint, email, workspace: DEV_WORKSPACE }]
    }
  }

  let token = getMetadata(login.metadata.LoginToken)
  if (token === undefined) {
    const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
    token = Object.values(tokens)[0]
    if (token === undefined) {
      return [unknownStatus('Please login'), undefined]
    }
  }

  const request: Request<[string]> = {
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
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
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

  const token = getMetadata(login.metadata.LoginToken)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return ''
  }

  const request: Request<[number, string, number]> = {
    method: 'getInviteLink',
    params: [exp, emailMask, limit]
  }

  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: serialize(request)
  })
  const result: Response<any> = await response.json()
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
      return [OK, { token, endpoint, email, workspace: DEV_WORKSPACE }]
    }
  }

  const request: Request<[string, string, string]> = {
    method: 'join',
    params: [email, password, inviteId]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
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
      return [OK, { token, endpoint, email, workspace: DEV_WORKSPACE }]
    }
  }

  const request: Request<[string, string, string, string, string]> = {
    method: 'signUpJoin',
    params: [email, password, first, last, inviteId]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}

export async function changeName (first: string, last: string): Promise<void> {
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
  const token = getMetadata(login.metadata.LoginToken) as string

  const request: Request<[string, string]> = {
    method: 'changeName',
    params: [first, last]
  }

  await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: serialize(request)
  })
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
  const token = getMetadata(login.metadata.LoginToken) as string

  const request: Request<[string, string]> = {
    method: 'changePassword',
    params: [oldPassword, password]
  }

  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: serialize(request)
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
  const token = getMetadata(login.metadata.LoginToken) as string

  const request: Request<[string]> = {
    method: 'leaveWorkspace',
    params: [email]
  }

  await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: serialize(request)
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
  const request: Request<[string]> = {
    method: 'requestPassword',
    params: [email]
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
    return result.error ?? OK
  } catch (err) {
    return unknownError(err)
  }
}

export async function restorePassword (token: string, password: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const request: Request<[string]> = {
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
      body: serialize(request)
    })
    const result: Response<any> = await response.json()
    return [result.error ?? OK, result.result]
  } catch (err) {
    return [unknownError(err), undefined]
  }
}
