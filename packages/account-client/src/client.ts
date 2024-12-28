//
// Copyright © 2024 Hardcore Engineering Inc.
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
import {
  type AccountRole,
  Data,
  type Person,
  PersonUuid,
  SocialId,
  Version,
  type WorkspaceInfoWithStatus,
  type WorkspaceMemberInfo,
  concatLink
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import type { LoginInfo, OtpInfo, WorkspaceLoginInfo, RegionInfo, WorkspaceOperation } from './types'

/** @public */
export interface AccountClient {
  // Static methods
  getProviders: () => Promise<string[]>

  // RPC
  getUserWorkspaces: () => Promise<WorkspaceInfoWithStatus[]>
  selectWorkspace: (workspaceUrl: string) => Promise<WorkspaceLoginInfo>
  validateOtp: (email: string, code: string) => Promise<LoginInfo>
  loginOtp: (email: string) => Promise<OtpInfo>
  getLoginInfoByToken: () => Promise<LoginInfo | WorkspaceLoginInfo>
  restorePassword: (password: string) => Promise<LoginInfo>
  confirm: () => Promise<LoginInfo>
  requestPasswordReset: (email: string) => Promise<void>
  sendInvite: (email: string, role?: AccountRole) => Promise<void>
  leaveWorkspace: (account: string) => Promise<LoginInfo | null>
  changeUsername: (first: string, last: string) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  signUpJoin: (
    email: string,
    password: string,
    first: string,
    last: string,
    inviteId: string
  ) => Promise<WorkspaceLoginInfo>
  join: (email: string, password: string, inviteId: string) => Promise<WorkspaceLoginInfo>
  createInviteLink: (
    exp: number,
    emailMask: string,
    limit: number,
    role: AccountRole,
    personId?: any
  ) => Promise<string>
  checkJoin: (inviteId: string) => Promise<WorkspaceLoginInfo>
  getWorkspaceInfo: (updateLastVisit?: boolean) => Promise<WorkspaceInfoWithStatus>
  getRegionInfo: () => Promise<RegionInfo[]>
  createWorkspace: (name: string, region?: string) => Promise<WorkspaceLoginInfo>
  signUpOtp: (email: string, first: string, last: string) => Promise<OtpInfo>
  signUp: (email: string, password: string, first: string, last: string) => Promise<LoginInfo>
  login: (email: string, password: string) => Promise<LoginInfo>
  getPerson: () => Promise<Person>
  getSocialIds: () => Promise<SocialId[]>
  getWorkspaceMembers: () => Promise<WorkspaceMemberInfo[]>
  updateWorkspaceRole: (account: string, role: AccountRole) => Promise<void>
  updateWorkspaceName: (name: string) => Promise<void>
  deleteWorkspace: () => Promise<void>
  findPerson: (socialString: string) => Promise<PersonUuid | undefined>

  // Service methods
  workerHandshake: (region: string, version: Data<Version>, operation: WorkspaceOperation) => Promise<void>
  getPendingWorkspace: (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation
  ) => Promise<WorkspaceInfoWithStatus | null>
  updateWorkspaceInfo: (
    wsUuid: string,
    event: string,
    version: Data<Version>,
    progress: number,
    message?: string
  ) => Promise<void>
  listWorkspaces: (region?: string | null, includeDisabled?: boolean) => Promise<WorkspaceInfoWithStatus[]>
  performWorkspaceOperation: (
    workspaceId: string | string[],
    event: 'archive' | 'migrate-to' | 'unarchive',
    ...params: any
  ) => Promise<boolean>
}

/** @public */
export function getClient (accountsUrl?: string, token?: string): AccountClient {
  if (accountsUrl === undefined) {
    throw new Error('Accounts url not specified')
  }

  return new AccountClientImpl(accountsUrl, token)
}

interface Request {
  method: string // TODO: replace with AccountMethods
  params: any[]
}

class AccountClientImpl implements AccountClient {
  constructor (
    private readonly url: string,
    private readonly token?: string
  ) {
    if (url === '') {
      throw new Error('Accounts url not specified')
    }
  }

  async getProviders (): Promise<string[]> {
    return await retry(5, async () => {
      const response = await fetch(concatLink(this.url, '/providers'))

      return await response.json()
    })
  }

  private async rpc<T>(request: Request): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      keepalive: true,
      headers: {
        ...(this.token === undefined
          ? {}
          : {
              Authorization: 'Bearer ' + this.token
            }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    const result = await response.json()
    if (result.error != null) {
      throw new PlatformError(result.error)
    }

    return result.result
  }

  private flattenStatus (ws: any): WorkspaceInfoWithStatus {
    if (ws === undefined) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, {}))
    }

    const status = ws.status
    if (status === undefined) {
      return ws
    }

    const result = { ...ws, ...status }
    delete result.status

    return result
  }

  async getUserWorkspaces (): Promise<WorkspaceInfoWithStatus[]> {
    const request = {
      method: 'getUserWorkspaces' as const,
      params: []
    }

    return (await this.rpc<any[]>(request)).map((ws) => this.flattenStatus(ws))
  }

  async selectWorkspace (workspaceUrl: string): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'selectWorkspace' as const,
      params: [workspaceUrl, 'external']
    }

    return await this.rpc(request)
  }

  async validateOtp (email: string, code: string): Promise<LoginInfo> {
    const request = {
      method: 'validateOtp' as const,
      params: [email, code]
    }

    return await this.rpc(request)
  }

  async loginOtp (email: string): Promise<OtpInfo> {
    const request = {
      method: 'loginOtp' as const,
      params: [email]
    }

    return await this.rpc(request)
  }

  async getLoginInfoByToken (): Promise<LoginInfo | WorkspaceLoginInfo> {
    const request = {
      method: 'getLoginInfoByToken' as const,
      params: []
    }

    return await this.rpc(request)
  }

  async restorePassword (password: string): Promise<LoginInfo> {
    const request = {
      method: 'restorePassword' as const,
      params: [password]
    }

    return await this.rpc(request)
  }

  async confirm (): Promise<LoginInfo> {
    const request = {
      method: 'confirm' as const,
      params: []
    }

    return await this.rpc(request)
  }

  async requestPasswordReset (email: string): Promise<void> {
    const request = {
      method: 'requestPasswordReset' as const,
      params: [email]
    }

    await this.rpc(request)
  }

  async sendInvite (email: string, role?: AccountRole): Promise<void> {
    const request = {
      method: 'sendInvite' as const,
      params: [email, role]
    }

    await this.rpc(request)
  }

  async leaveWorkspace (account: string): Promise<LoginInfo | null> {
    const request = {
      method: 'leaveWorkspace' as const,
      params: [account]
    }

    return await this.rpc(request)
  }

  async changeUsername (first: string, last: string): Promise<void> {
    const request = {
      method: 'changeUsername' as const,
      params: [first, last]
    }

    await this.rpc(request)
  }

  async changePassword (oldPassword: string, newPassword: string): Promise<void> {
    const request = {
      method: 'changePassword' as const,
      params: [oldPassword, newPassword]
    }

    await this.rpc(request)
  }

  async signUpJoin (
    email: string,
    password: string,
    first: string,
    last: string,
    inviteId: string
  ): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'signUpJoin' as const,
      params: [email, password, first, last, inviteId]
    }

    return await this.rpc(request)
  }

  async join (email: string, password: string, inviteId: string): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'join' as const,
      params: [email, password, inviteId]
    }

    return await this.rpc(request)
  }

  async createInviteLink (
    exp: number,
    emailMask: string,
    limit: number,
    role: AccountRole,
    personId?: any
  ): Promise<string> {
    const request = {
      method: 'createInviteLink' as const,
      params: [exp, emailMask, limit, role, personId]
    }

    return await this.rpc(request)
  }

  async checkJoin (inviteId: string): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'checkJoin' as const,
      params: [inviteId]
    }

    return await this.rpc(request)
  }

  async getWorkspaceInfo (updateLastVisit: boolean = false): Promise<WorkspaceInfoWithStatus> {
    const request = {
      method: 'getWorkspaceInfo' as const,
      params: updateLastVisit ? [true] : []
    }

    return this.flattenStatus(await this.rpc(request))
  }

  async getRegionInfo (): Promise<RegionInfo[]> {
    const request = {
      method: 'getRegionInfo' as const,
      params: []
    }

    return await this.rpc(request)
  }

  async createWorkspace (name: string, region?: string): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'createWorkspace' as const,
      params: [name, region]
    }

    return await this.rpc(request)
  }

  async signUpOtp (email: string, first: string, last: string): Promise<OtpInfo> {
    const request = {
      method: 'signUpOtp' as const,
      params: [email, first, last]
    }

    return await this.rpc(request)
  }

  async signUp (email: string, password: string, first: string, last: string): Promise<LoginInfo> {
    const request = {
      method: 'signUp' as const,
      params: [email, password, first, last]
    }

    return await this.rpc(request)
  }

  async login (email: string, password: string): Promise<LoginInfo> {
    const request = {
      method: 'login' as const,
      params: [email, password]
    }

    return await this.rpc(request)
  }

  async getPerson (): Promise<Person> {
    const request = {
      method: 'getPerson' as const,
      params: []
    }

    return await this.rpc(request)
  }

  async getSocialIds (): Promise<SocialId[]> {
    const request = {
      method: 'getSocialIds' as const,
      params: []
    }

    return await this.rpc(request)
  }

  async workerHandshake (region: string, version: Data<Version>, operation: WorkspaceOperation): Promise<void> {
    const request = {
      method: 'workerHandshake' as const,
      params: [region, version, operation]
    }

    await this.rpc(request)
  }

  async getPendingWorkspace (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation
  ): Promise<WorkspaceInfoWithStatus | null> {
    const request = {
      method: 'getPendingWorkspace' as const,
      params: [region, version, operation]
    }

    const result = await this.rpc(request)
    if (result == null) {
      return null
    }

    return this.flattenStatus(result)
  }

  async updateWorkspaceInfo (
    wsUuid: string,
    event: string,
    version: Data<Version>,
    progress: number,
    message?: string
  ): Promise<void> {
    const request = {
      method: 'updateWorkspaceInfo' as const,
      params: [wsUuid, event, version, progress, message]
    }

    await this.rpc(request)
  }

  async getWorkspaceMembers (): Promise<WorkspaceMemberInfo[]> {
    const request = {
      method: 'getWorkspaceMembers' as const,
      params: []
    }

    return await this.rpc(request)
  }

  async updateWorkspaceRole (account: string, role: AccountRole): Promise<void> {
    const request = {
      method: 'updateWorkspaceRole' as const,
      params: [account, role]
    }

    await this.rpc(request)
  }

  async updateWorkspaceName (name: string): Promise<void> {
    const request = {
      method: 'updateWorkspaceName' as const,
      params: [name]
    }

    await this.rpc(request)
  }

  async deleteWorkspace (): Promise<void> {
    const request = {
      method: 'deleteWorkspace' as const,
      params: []
    }

    await this.rpc(request)
  }

  async findPerson (socialString: string): Promise<PersonUuid | undefined> {
    const request = {
      method: 'findPerson' as const,
      params: [socialString]
    }

    return await this.rpc(request)
  }

  async listWorkspaces (region?: string | null, includeDisabled?: boolean): Promise<WorkspaceInfoWithStatus[]> {
    const request = {
      method: 'listWorkspaces' as const,
      params: []
    }

    return (await this.rpc<any[]>(request)).map((ws) => this.flattenStatus(ws))
  }

  async performWorkspaceOperation (
    workspaceId: string | string[],
    event: 'archive' | 'migrate-to' | 'unarchive',
    ...params: any
  ): Promise<boolean> {
    const request = {
      method: 'performWorkspaceOperation' as const,
      params: [workspaceId, event, ...params]
    }

    return await this.rpc(request)
  }
}

async function retry<T> (retries: number, op: () => Promise<T>, delay: number = 100): Promise<T> {
  let error: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      error = err
      if (retries !== 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw error
}
