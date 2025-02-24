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

import { Analytics } from '@hcengineering/analytics'
import { AccountRole, concatLink, type BaseWorkspaceInfo, type Doc, type Ref } from '@hcengineering/core'
import { loginId, type LoginInfo, type OtpInfo, type Workspace, type WorkspaceLoginInfo } from '@hcengineering/login'
import platform, {
  OK,
  PlatformError,
  Severity,
  Status,
  getMetadata,
  setMetadata,
  translate,
  unknownError,
  unknownStatus
} from '@hcengineering/platform'
import presentation, { isAdminUser } from '@hcengineering/presentation'
import {
  fetchMetadataLocalStorage,
  getCurrentLocation,
  locationStorageKeyId,
  locationToUrl,
  navigate,
  setMetadataLocalStorage,
  type Location
} from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'

import { LoginEvents } from './analytics'
import { type Pages } from './index'
import login from './plugin'

/**
 * Perform a login operation to required workspace with user credentials.
 */
export async function doLogin (email: string, password: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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
    if (result.error == null) {
      Analytics.handleEvent(LoginEvents.LoginPassword, { email, ok: true })
      Analytics.setUser(email)
    } else {
      Analytics.handleEvent(LoginEvents.LoginPassword, { email, ok: false })
      await handleStatusError('Login error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    console.error('login error', err)
    Analytics.handleEvent(LoginEvents.LoginPassword, { email, ok: false })
    Analytics.handleError(err)
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
    if (result.error == null) {
      Analytics.handleEvent(LoginEvents.SignUpEmail, { email, ok: true })
      Analytics.setUser(email)
    } else {
      Analytics.handleEvent(LoginEvents.SignUpEmail, { email, ok: false })
      await handleStatusError('Sign up error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleError(err)
    Analytics.handleEvent(LoginEvents.SignUpEmail, { email, ok: false })
    return [unknownError(err), undefined]
  }
}

export async function signUpOtp (email: string): Promise<[Status, OtpInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const request = {
    method: 'signUpOtp',
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
    if (result.error == null) {
      Analytics.handleEvent('signUpOtp')
      Analytics.setUser(email)
    } else {
      await handleStatusError('Sign up error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

export async function createWorkspace (
  workspaceName: string,
  region?: string
): Promise<[Status, (LoginInfo & { workspace: string }) | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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
    params: [workspaceName, region]
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
    if (result.error == null) {
      Analytics.handleEvent(LoginEvents.CreateWorkspace, { name: workspaceName, ok: true })
      Analytics.setWorkspace(workspaceName)
    } else {
      Analytics.handleEvent(LoginEvents.CreateWorkspace, { name: workspaceName, ok: false })
      await handleStatusError('Create workspace error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleEvent(LoginEvents.CreateWorkspace, { name: workspaceName, ok: false })
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

function getLastVisitDays (it: Pick<Workspace, 'lastVisit'>): number {
  return Math.floor((Date.now() - it.lastVisit) / (1000 * 3600 * 24))
}
function getWorkspaceSize (it: Pick<Workspace, 'backupInfo'>): number {
  let sz = 0
  sz += it.backupInfo?.dataSize ?? 0
  sz += it.backupInfo?.blobsSize ?? 0
  sz += it.backupInfo?.backupSize ?? 0
  return sz
}

export async function getWorkspaces (): Promise<Workspace[]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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
    const workspaces: Workspace[] = result.result

    workspaces.sort((a, b) => {
      const adays = getLastVisitDays(a)
      const bdays = getLastVisitDays(b)
      if (adays === bdays) {
        return getWorkspaceSize(b) - getWorkspaceSize(a)
      }
      return b.lastVisit - a.lastVisit
    })

    return workspaces
  } catch (err: any) {
    return []
  }
}

// performWorkspaceOperation

export async function performWorkspaceOperation (
  workspace: string | string[],
  operation: 'archive' | 'migrate-to' | 'unarchive' | 'delete',
  ...params: any[]
): Promise<boolean> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  if (!isAdminUser()) {
    throw new PlatformError(unknownError('Non admin user'))
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return true
  }

  const request = {
    method: 'performWorkspaceOperation',
    params: [workspace, operation, ...params] as any[]
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
    return (result.result as boolean) ?? false
  } catch (err: any) {
    return false
  }
}

export async function getAllWorkspaces (): Promise<BaseWorkspaceInfo[]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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
    method: 'getAllWorkspaces',
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
    const workspaces: BaseWorkspaceInfo[] = result.result

    workspaces.sort((a, b) => {
      const adays = getLastVisitDays(a)
      const bdays = getLastVisitDays(b)
      if (adays === bdays) {
        return getWorkspaceSize(b) - getWorkspaceSize(a)
      }
      return b.lastVisit - a.lastVisit
    })

    return workspaces
  } catch (err: any) {
    return []
  }
}

export async function getAccount (doNavigate: boolean = true): Promise<LoginInfo | undefined> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token) ?? fetchMetadataLocalStorage(login.metadata.LastToken)
  if (token === undefined) {
    if (doNavigate) {
      const loc = getCurrentLocation()
      loc.path[1] = 'login'
      loc.path.length = 2
      navigate(loc)
    }
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
  } catch (err: any) {
    Analytics.handleError(err)
  }
}

export interface RegionInfo {
  region: string
  name: string
}

export async function getRegionInfo (doNavigate: boolean = true): Promise<RegionInfo[] | undefined> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token) ?? fetchMetadataLocalStorage(login.metadata.LastToken)
  if (token === undefined) {
    if (doNavigate) {
      const loc = getCurrentLocation()
      loc.path[1] = 'login'
      loc.path.length = 2
      navigate(loc)
    }
    return
  }

  const request = {
    method: 'getRegionInfo',
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
  } catch (err: any) {
    Analytics.handleError(err)
  }
}

export async function selectWorkspace (
  workspace: string,
  token?: string | null | undefined
): Promise<[Status, WorkspaceLoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  token = token ?? getMetadata(presentation.metadata.Token) ?? fetchMetadataLocalStorage(login.metadata.LastToken)
  if (token === undefined) {
    const loc = getCurrentLocation()
    loc.path[0] = 'login'
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
    return [unknownStatus('Please login'), undefined]
  }

  const request = {
    method: 'selectWorkspace',
    params: [workspace, 'external']
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
    if (result.error == null) {
      Analytics.handleEvent(LoginEvents.SelectWorkspace, { name: workspace, ok: true })
      Analytics.setWorkspace(workspace)
    } else {
      Analytics.handleEvent(LoginEvents.SelectWorkspace, { name: workspace, ok: false })
      await handleStatusError('Select workspace error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleEvent(LoginEvents.SelectWorkspace, { name: workspace, ok: false })
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

export async function fetchWorkspace (workspace: string): Promise<[Status, WorkspaceLoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    return [unknownStatus('Please login'), undefined]
  }

  const request = {
    method: 'getWorkspaceInfo',
    params: [token]
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
    if (result.error == null) {
      Analytics.handleEvent('Fetch workspace')
      Analytics.setWorkspace(workspace)
    } else {
      await handleStatusError('Fetch workspace error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

export async function unArchive (workspaceId: string, token: string): Promise<boolean> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  if (token === undefined) {
    return false
  }

  const request = {
    method: 'performWorkspaceOperation',
    params: [workspaceId, 'unarchive']
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
    return (await response.json()).result
  } catch (err: any) {
    Analytics.handleError(err)
    return false
  }
}
export async function createMissingEmployee (workspace: string): Promise<[Status]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    return [unknownStatus('Please login')]
  }

  const request = {
    method: 'createMissingEmployee',
    params: [token]
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
    if (result.error == null) {
      Analytics.handleEvent('Create missing employee')
      Analytics.setWorkspace(workspace)
    } else {
      await handleStatusError('Fetch workspace error', result.error)
    }
    return [result.error ?? OK]
  } catch (err: any) {
    Analytics.handleError(err)
    return [unknownError(err)]
  }
}

export function setLoginInfo (loginInfo: WorkspaceLoginInfo): void {
  const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
  tokens[loginInfo.workspace] = loginInfo.token

  setMetadata(presentation.metadata.Token, loginInfo.token)
  setMetadataLocalStorage(login.metadata.LastToken, loginInfo.token)

  setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
  setMetadataLocalStorage(login.metadata.LoginEndpoint, loginInfo.endpoint)
  setMetadataLocalStorage(login.metadata.LoginEmail, loginInfo.email)
}

export function navigateToWorkspace (
  workspace: string,
  loginInfo?: WorkspaceLoginInfo,
  navigateUrl?: string,
  replace = false
): void {
  if (loginInfo == null) {
    return
  }
  setMetadata(presentation.metadata.Token, loginInfo.token)
  setMetadata(presentation.metadata.Workspace, loginInfo.workspace)
  setMetadata(presentation.metadata.WorkspaceId, loginInfo.workspaceId)
  setLoginInfo(loginInfo)

  if (navigateUrl !== undefined) {
    try {
      const loc = JSON.parse(decodeURIComponent(navigateUrl)) as Location
      if (loc.path[1] === workspace) {
        navigate(loc, replace)
        return
      }
    } catch (err: any) {
      // Json parse error could be ignored
    }
  }
  const last = localStorage.getItem(`${locationStorageKeyId}_${workspace}`)
  if (last !== null) {
    navigate(JSON.parse(last), replace)
  } else {
    navigate({ path: [workbenchId, workspace] }, replace)
  }
}

export async function checkJoined (inviteId: string): Promise<[Status, WorkspaceLoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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
  } catch (err: any) {
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

export async function getInviteLink (
  expHours: number,
  mask: string,
  limit: number | undefined,
  role: AccountRole,
  navigateUrl?: string
): Promise<string> {
  const inviteId = await getInviteLinkId(expHours, mask, limit ?? -1, role)
  const loc = getCurrentLocation()
  loc.path[0] = loginId
  loc.path[1] = 'join'
  loc.path.length = 2
  loc.query = {
    inviteId
  }
  if (navigateUrl !== undefined) {
    loc.query.navigateUrl = navigateUrl
  }
  loc.fragment = undefined

  const url = locationToUrl(loc)

  const frontUrl = getMetadata(presentation.metadata.FrontUrl)
  const host = frontUrl ?? document.location.origin
  return concatLink(host, url)
}

export async function getInviteLinkId (
  expHours: number,
  emailMask: string,
  limit: number,
  role: AccountRole = AccountRole.User,
  personId?: Ref<Doc>
): Promise<string> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  const exp = expHours < 0 ? -1 : expHours * 1000 * 60 * 60

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

  const params = [exp, emailMask, limit, role]
  if (personId !== undefined) {
    params.push(personId)
  }

  const request = {
    method: 'getInviteLink',
    params
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
  Analytics.handleEvent('Get invite link')
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
    if (result.error == null) {
      Analytics.handleEvent('Join')
      Analytics.setUser(email)
    } else {
      await handleStatusError('Join error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleError(err)
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
    if (result.error == null) {
      Analytics.handleEvent('Signup Join')
      Analytics.setUser(email)
    } else {
      await handleStatusError('Sign up join error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

export async function changePassword (oldPassword: string, password: string): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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
    const err = new PlatformError(resp.error)
    Analytics.handleError(err)
    throw err
  }
}

export async function changeUsername (first: string, last: string): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token) as string

  const request = {
    method: 'changeUsername',
    params: [first, last]
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
    const err = new PlatformError(resp.error)
    Analytics.handleError(err)
    throw err
  }
}

export async function leaveWorkspace (email: string): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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

export async function sendInvite (email: string, personId?: Ref<Doc>, role?: AccountRole): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token) as string

  const params = [email, personId, role]

  const request = {
    method: 'sendInvite',
    params
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

export async function resendInvite (email: string): Promise<void> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token) as string

  const params = [email]

  const request = {
    method: 'resendInvite',
    params
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
    if (result.error != null) {
      await handleStatusError('Request password error', result.error)
    }
    return result.error ?? OK
  } catch (err: any) {
    Analytics.handleError(err)
    return unknownError(err)
  }
}

export async function confirm (email: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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
    if (result.error != null) {
      await handleStatusError('Confirm email error', result.error)
    } else {
      Analytics.handleEvent('Confirm email')
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleError(err)
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
    if (result.error != null) {
      await handleStatusError('Restore password error', result.error)
    } else {
      Analytics.handleEvent('Restore password')
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

async function handleStatusError (message: string, err: Status): Promise<void> {
  if (
    err.code === platform.status.InvalidPassword ||
    err.code === platform.status.AccountNotFound ||
    err.code === platform.status.InvalidOtp
  ) {
    // No need to send to analytics
    return
  }
  const label = await translate(err.code, err.params, 'en')
  Analytics.handleError(new Error(`${message}: ${label}`))
}

export function getLoc (path: Pages): Location {
  const loc = getCurrentLocation()
  loc.path[1] = path
  loc.path.length = 2
  return loc
}

export function goTo (path: Pages, clearQuery: boolean = false): void {
  const loc = getLoc(path)
  if (clearQuery) {
    loc.query = undefined
  }
  navigate(loc, clearQuery)
}

export function getHref (path: Pages): string {
  const url = locationToUrl(getLoc(path))
  const frontUrl = getMetadata(presentation.metadata.FrontUrl)
  const host = frontUrl ?? document.location.origin
  return host + url
}

export async function afterConfirm (clearQuery = false): Promise<void> {
  const joinedWS = await getWorkspaces()
  if (joinedWS.length === 0) {
    goTo('createWorkspace', clearQuery)
  } else if (joinedWS.length === 1) {
    const result = (await selectWorkspace(joinedWS[0].workspace, null))[1]
    if (result !== undefined) {
      setMetadata(presentation.metadata.Token, result.token)
      setMetadata(presentation.metadata.Workspace, result.workspace)
      setMetadata(presentation.metadata.WorkspaceId, result.workspaceId)
      setMetadataLocalStorage(login.metadata.LastToken, result.token)
      setLoginInfo(result)

      navigateToWorkspace(joinedWS[0].workspace, result, undefined, clearQuery)
    }
  } else {
    goTo('selectWorkspace', clearQuery)
  }
}

export async function getLoginInfoFromQuery (): Promise<LoginInfo | undefined> {
  const token = getCurrentLocation().query?.token

  if (token === undefined) {
    return undefined
  }

  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
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
  } catch (err: any) {
    Analytics.handleError(err)
  }
}

export async function getProviders (): Promise<string[]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(concatLink(accountsUrl, '/providers'))
      const result = await response.json()
      return result
    } catch (err: any) {
      if (i === 4) {
        Analytics.handleError(err)
        return []
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
    }
  }
  return []
}

export async function sendOtp (email: string): Promise<[Status, OtpInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const request = {
    method: 'sendOtp',
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

    if (result.error == null) {
      Analytics.handleEvent('sendOtp')
      Analytics.setUser(email)
    } else {
      await handleStatusError('Send otp error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    console.error('Send otp error', err)
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

export async function loginWithOtp (email: string, otp: string): Promise<[Status, LoginInfo | undefined]> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const request = {
    method: 'validateOtp',
    params: [email, otp]
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

    if (result.error == null) {
      Analytics.handleEvent(LoginEvents.LoginOtp, { email, ok: true })
      Analytics.setUser(email)
    } else {
      Analytics.handleEvent(LoginEvents.LoginOtp, { email, ok: false })
      await handleStatusError('Login with otp error', result.error)
    }
    return [result.error ?? OK, result.result]
  } catch (err: any) {
    console.error('Login with otp error', err)
    Analytics.handleEvent(LoginEvents.LoginOtp, { email, ok: false })
    Analytics.handleError(err)
    return [unknownError(err), undefined]
  }
}

export async function doLoginNavigate (
  result: LoginInfo | undefined,
  updateStatus: (status: Status) => void,
  navigateUrl?: string
): Promise<void> {
  if (result !== undefined) {
    setMetadata(presentation.metadata.Token, result.token)
    setMetadataLocalStorage(login.metadata.LastToken, result.token)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
    setMetadataLocalStorage(login.metadata.LoginEmail, result.email)

    if (navigateUrl !== undefined) {
      try {
        const loc = JSON.parse(decodeURIComponent(navigateUrl)) as Location
        const workspace = loc.path[1]
        if (workspace !== undefined) {
          const workspaces = await getWorkspaces()
          if (workspaces.find((p) => p.workspace === workspace) !== undefined) {
            updateStatus(new Status(Severity.INFO, login.status.ConnectingToServer, {}))

            const [loginStatus, result] = await selectWorkspace(workspace, undefined)
            updateStatus(loginStatus)
            navigateToWorkspace(workspace, result, navigateUrl)
            return
          }
        }
      } catch (err: any) {
        // Json parse error could be ignored
      }
    }
    const loc = getCurrentLocation()
    loc.path[1] = result.confirmed ? 'selectWorkspace' : 'confirmationSend'
    loc.path.length = 2
    if (navigateUrl !== undefined) {
      loc.query = { ...loc.query, navigateUrl }
    }
    navigate(loc)
  }
}
