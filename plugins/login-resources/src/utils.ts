//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { Status, OK, unknownError, getMetadata, serialize, unknownStatus } from '@anticrm/platform'
import type { Request, Response } from '@anticrm/platform'
import type { Workspace } from '@anticrm/account'

import login from '@anticrm/login'
import { fetchMetadataLocalStorage, getCurrentLocation, navigate } from '@anticrm/ui'

export interface LoginInfo {
  token: string
  endpoint: string
  email: string
}

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
  const email = getMetadata(login.metadata.LoginEmail) ?? ''
  if (overrideToken !== undefined) {
    const endpoint = getMetadata(login.metadata.OverrideEndpoint)
    if (endpoint !== undefined) {
      return [OK, { token: overrideToken, endpoint, email }]
    }
  }

  const token = fetchMetadataLocalStorage(login.metadata.LoginToken)
  if (token === null) {
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

  const token = fetchMetadataLocalStorage(login.metadata.LoginToken)
  if (token === null) {
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
    console.log(result)
    return result.result
  } catch (err) {
    return []
  }
}

export async function selectWorkspace (workspace: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = fetchMetadataLocalStorage(login.metadata.LoginToken)
  if (token === null) {
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

export async function getWorkspaceHash (): Promise<string> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = fetchMetadataLocalStorage(login.metadata.LoginToken)
  if (token === null) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return ''
  }

  const request: Request<[]> = {
    method: 'getWorkspaceHash',
    params: []
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
  workspaceHash: string
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

  const request: Request<[string, string, string]> = {
    method: 'join',
    params: [email, password, workspaceHash]
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
  workspaceHash: string
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

  const request: Request<[string, string, string, string, string]> = {
    method: 'signUpJoin',
    params: [email, password, first, last, workspaceHash]
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
