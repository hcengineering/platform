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
import { type AccountRole, Data, type Person, SocialId, Version, type WorkspaceInfoWithStatus, concatLink } from '@hcengineering/core'
// TODO: type AccountClient properly with below
// import type { AccountMethods } from '@hcengineering/account'
import {
  PlatformError
} from '@hcengineering/platform'
import type { LoginInfo, OtpInfo, WorkspaceLoginInfo, RegionInfo } from './types'

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
  sendInvite: (email: string, personId?: any, role?: AccountRole) => Promise<void>
  leaveWorkspace: (email: string) => Promise<void>
  changeUsername: (first: string, last: string) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  signUpJoin: (email: string, password: string, first: string, last: string, inviteId: string) => Promise<WorkspaceLoginInfo>
  join: (email: string, password: string, inviteId: string) => Promise<WorkspaceLoginInfo>
  createInviteLink: (exp: number, emailMask: string, limit: number, role: AccountRole, personId?: any) => Promise<string>
  checkJoin: (inviteId: string) => Promise<WorkspaceLoginInfo>
  getWorkspaceInfo: (updateLastVisit?: boolean) => Promise<WorkspaceInfoWithStatus>
  getRegionInfo: () => Promise<RegionInfo[]>
  createWorkspace: (name: string, region?: string) => Promise<WorkspaceLoginInfo>
  signUpOtp: (email: string, first: string, last: string) => Promise<OtpInfo>
  signUp: (email: string, password: string, first: string, last: string) => Promise<LoginInfo>
  login: (email: string, password: string) => Promise<LoginInfo>
  getPerson: () => Promise<Person>
  getSocialIds: () => Promise<SocialId[]>

  // Service methods
  workerHandshake: (region: string, version: Data<Version>, operation: 'create' | 'upgrade' | 'all') => Promise<void>
  getPendingWorkspace: (region: string, version: Data<Version>, operation: 'create' | 'upgrade' | 'all') => Promise<WorkspaceInfoWithStatus>
  updateWorkspaceInfo: (wsUuid: string, event: string, version: Data<Version>, progress: number, message?: string) => Promise<void>
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

  private async rpc<T> (request: Request): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
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

  async getUserWorkspaces (): Promise<WorkspaceInfoWithStatus[]> {
    const request = {
      method: 'getUserWorkspaces' as const,
      params: []
    }

    return await this.rpc(request)
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

  async sendInvite (email: string, personId?: any, role?: AccountRole): Promise<void> {
    const request = {
      method: 'sendInvite' as const,
      params: [email, personId, role]
    }

    await this.rpc(request)
  }

  async leaveWorkspace (email: string): Promise<void> {
    const request = {
      method: 'leaveWorkspace' as const,
      params: [email]
    }

    await this.rpc(request)
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

  async signUpJoin (email: string, password: string, first: string, last: string, inviteId: string): Promise<WorkspaceLoginInfo> {
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

  async createInviteLink (exp: number, emailMask: string, limit: number, role: AccountRole, personId?: any): Promise<string> {
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

    const workspace = await this.rpc(request) as any
    const workspaceStatus = workspace.status
    const result = { ...workspace, ...workspaceStatus }
    delete result.status

    return result
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

  async workerHandshake (region: string, version: Data<Version>, operation: 'create' | 'upgrade' | 'all'): Promise<void> {
    const request = {
      method: 'workerHandshake' as const,
      params: [region, version, operation]
    }

    await this.rpc(request)
  }

  async getPendingWorkspace (region: string, version: Data<Version>, operation: 'create' | 'upgrade' | 'all'): Promise<WorkspaceInfoWithStatus> {
    const request = {
      method: 'getPendingWorkspace' as const,
      params: [region, version, operation]
    }

    return await this.rpc(request)
  }

  async updateWorkspaceInfo (wsUuid: string, event: string, version: Data<Version>, progress: number, message?: string): Promise<void> {
    const request = {
      method: 'updateWorkspaceInfo' as const,
      params: [wsUuid, event, version, progress, message]
    }

    await this.rpc(request)
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
