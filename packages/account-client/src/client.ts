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
  type AccountInfo,
  type AccountRole,
  type AccountUuid,
  BackupStatus,
  concatLink,
  Data,
  type Person,
  type PersonId,
  type PersonInfo,
  type PersonUuid,
  type SocialIdType,
  Version,
  type WorkspaceInfoWithStatus,
  type WorkspaceMemberInfo,
  WorkspaceMode,
  type WorkspaceUserOperation,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import type {
  AccountAggregatedInfo,
  Integration,
  IntegrationKey,
  IntegrationSecret,
  IntegrationSecretKey,
  LoginInfo,
  LoginInfoByToken,
  LoginInfoRequestData,
  LoginInfoWithWorkspaces,
  MailboxInfo,
  MailboxOptions,
  MailboxSecret,
  OtpInfo,
  ProviderInfo,
  RegionInfo,
  SocialId,
  WorkspaceLoginInfo,
  WorkspaceOperation
} from './types'
import { getClientTimezone } from './utils'

/** @public */
export interface AccountClient {
  // Static methods
  getProviders: () => Promise<ProviderInfo[]>

  // RPC
  getUserWorkspaces: () => Promise<WorkspaceInfoWithStatus[]>
  selectWorkspace: (
    workspaceUrl: string,
    kind?: 'external' | 'internal' | 'byregion',
    externalRegions?: string[]
  ) => Promise<WorkspaceLoginInfo>
  validateOtp: (email: string, code: string, password?: string, action?: 'verify') => Promise<LoginInfo>
  loginOtp: (email: string) => Promise<OtpInfo>
  getLoginInfoByToken: (data?: LoginInfoRequestData) => Promise<LoginInfoByToken>
  getLoginWithWorkspaceInfo: () => Promise<LoginInfoWithWorkspaces>
  restorePassword: (password: string) => Promise<LoginInfo>
  confirm: () => Promise<LoginInfo>
  requestPasswordReset: (email: string) => Promise<void>
  sendInvite: (email: string, role: AccountRole) => Promise<void>
  resendInvite: (email: string, role: AccountRole) => Promise<void>
  createInviteLink: (
    email: string,
    role: AccountRole,
    autoJoin: boolean,
    firstName: string,
    lastName: string,
    navigateUrl?: string,
    expHours?: number
  ) => Promise<string>
  leaveWorkspace: (account: AccountUuid) => Promise<LoginInfo | null>
  changeUsername: (first: string, last: string) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  signUpJoin: (
    email: string,
    password: string,
    first: string,
    last: string,
    inviteId: string,
    workspaceUrl: string
  ) => Promise<WorkspaceLoginInfo>
  join: (email: string, password: string, inviteId: string, workspaceUrl: string) => Promise<WorkspaceLoginInfo>
  createInvite: (exp: number, emailMask: string, limit: number, role: AccountRole) => Promise<string>
  /**
   * @param options.personalized
   * If true, will generate a link with a personalized token for one person access
   * If false, will generate a link with an open-ended account in the token. Every token use will generate a new account.
   * When false, notBefore and expiration parameters are mandatory.
   * @param options.notBefore - not valid before; timestamp in seconds
   * @param options.expiration - expires after; timestamp in seconds
   */
  createAccessLink: (
    role: AccountRole,
    options?: {
      firstName?: string
      lastName?: string
      navigateUrl?: string
      extra?: Record<string, any>
      spaces?: string[]
      notBefore?: number
      expiration?: number
      personalized?: boolean
    }
  ) => Promise<string>
  checkJoin: (inviteId: string) => Promise<WorkspaceLoginInfo>
  checkAutoJoin: (inviteId: string, firstName?: string, lastName?: string) => Promise<WorkspaceLoginInfo>
  getWorkspaceInfo: (updateLastVisit?: boolean) => Promise<WorkspaceInfoWithStatus>
  getWorkspacesInfo: (workspaces: WorkspaceUuid[]) => Promise<WorkspaceInfoWithStatus[]>
  updateLastVisit: (workspaces: WorkspaceUuid[]) => Promise<void>
  getRegionInfo: () => Promise<RegionInfo[]>
  createWorkspace: (name: string, region?: string) => Promise<WorkspaceLoginInfo>
  signUpOtp: (email: string, first: string, last: string) => Promise<OtpInfo>
  /**
   * Deprecated. Only to be used for dev setups without mail service.
   */
  signUp: (email: string, password: string, first: string, last: string) => Promise<LoginInfo>
  login: (email: string, password: string) => Promise<LoginInfo>
  loginAsGuest: () => Promise<LoginInfo>
  isReadOnlyGuest: () => Promise<boolean>
  getPerson: () => Promise<Person>
  getPersonInfo: (account: PersonUuid) => Promise<PersonInfo>
  getSocialIds: (includeDeleted?: boolean) => Promise<SocialId[]>
  getWorkspaceMembers: () => Promise<WorkspaceMemberInfo[]>
  updateWorkspaceRole: (account: string, role: AccountRole) => Promise<void>
  updateAllowReadOnlyGuests: (
    readOnlyGuestsAllowed: boolean
  ) => Promise<{ guestPerson: Person, guestSocialIds: SocialId[] } | undefined>
  updateAllowGuestSignUp: (guestSignUpAllowed: boolean) => Promise<void>
  updateWorkspaceName: (name: string) => Promise<void>
  deleteWorkspace: () => Promise<void>
  findPersonBySocialKey: (socialKey: string, requireAccount?: boolean) => Promise<PersonUuid | undefined>
  findPersonBySocialId: (socialId: PersonId, requireAccount?: boolean) => Promise<PersonUuid | undefined>
  findSocialIdBySocialKey: (socialKey: string) => Promise<PersonId | undefined>
  findFullSocialIdBySocialKey: (socialKey: string) => Promise<SocialId | undefined>
  findFullSocialIds: (socialIds: PersonId[]) => Promise<SocialId[]>
  getMailboxOptions: () => Promise<MailboxOptions>
  getMailboxSecret: (mailbox: string) => Promise<MailboxSecret | undefined>
  createMailbox: (name: string, domain: string) => Promise<{ mailbox: string, socialId: PersonId }>
  getMailboxes: () => Promise<MailboxInfo[]>
  deleteMailbox: (mailbox: string) => Promise<void>
  listAccounts: (search?: string, skip?: number, limit?: number) => Promise<AccountAggregatedInfo[]>
  deleteAccount: (uuid: AccountUuid) => Promise<void>

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
  listWorkspaces: (region?: string | null, mode?: WorkspaceMode | null) => Promise<WorkspaceInfoWithStatus[]>
  performWorkspaceOperation: (
    workspaceId: string | string[],
    event: WorkspaceUserOperation,
    ...params: any
  ) => Promise<boolean>
  assignWorkspace: (email: string, workspaceUuid: string, role: AccountRole) => Promise<void>
  updateBackupInfo: (info: BackupStatus) => Promise<void>
  updateWorkspaceRoleBySocialKey: (socialKey: string, targetRole: AccountRole) => Promise<void>
  ensurePerson: (
    socialType: SocialIdType,
    socialValue: string,
    firstName: string,
    lastName: string
  ) => Promise<{ uuid: PersonUuid, socialId: PersonId }>
  addSocialIdToPerson: (
    person: PersonUuid,
    type: SocialIdType,
    value: string,
    confirmed: boolean,
    displayValue?: string
  ) => Promise<PersonId>
  updateSocialId: (personId: PersonId, displayValue: string) => Promise<PersonId>
  exchangeGuestToken: (token: string) => Promise<string>
  /**
   * Releases the target social id for the target account.
   * If called with user's token it releases the social id for the user's account.
   * @param personUuid Required for services
   * @param type Social id type
   * @param value Social id value
   * @param deleteIntegrations Deletes associated integrations if true. Otherwise, throws an error if any.
   * @returns Deleted social id with updated isDeleted flag and key/value
   */
  releaseSocialId: (
    personUuid: PersonUuid | undefined,
    type: SocialIdType,
    value: string,
    deleteIntegrations?: boolean
  ) => Promise<SocialId>
  createIntegration: (integration: Integration) => Promise<void>
  updateIntegration: (integration: Integration) => Promise<void>
  deleteIntegration: (integrationKey: IntegrationKey) => Promise<void>
  getIntegration: (integrationKey: IntegrationKey) => Promise<Integration | null>
  listIntegrations: (filter: Partial<IntegrationKey>) => Promise<Integration[]>
  addIntegrationSecret: (integrationSecret: IntegrationSecret) => Promise<void>
  updateIntegrationSecret: (integrationSecret: IntegrationSecret) => Promise<void>
  deleteIntegrationSecret: (integrationSecretKey: IntegrationSecretKey) => Promise<void>
  getIntegrationSecret: (integrationSecretKey: IntegrationSecretKey) => Promise<IntegrationSecret | null>
  listIntegrationsSecrets: (filter: Partial<IntegrationSecretKey>) => Promise<IntegrationSecret[]>
  getAccountInfo: (uuid: AccountUuid) => Promise<AccountInfo>
  mergeSpecifiedPersons: (primaryPerson: PersonUuid, secondaryPerson: PersonUuid) => Promise<void>
  mergeSpecifiedAccounts: (primaryAccount: AccountUuid, secondaryAccount: AccountUuid) => Promise<void>
  addEmailSocialId: (email: string) => Promise<OtpInfo>
  addHulyAssistantSocialId: () => Promise<PersonId>

  setCookie: () => Promise<void>
  deleteCookie: () => Promise<void>
}

/** @public */
export function getClient (accountsUrl?: string, token?: string, retryTimeoutMs?: number): AccountClient {
  if (accountsUrl === undefined) {
    throw new Error('Accounts url not specified')
  }

  return new AccountClientImpl(accountsUrl, token, retryTimeoutMs)
}

interface Request {
  method: string
  params: Record<string, any>
}

class AccountClientImpl implements AccountClient {
  private readonly request: RequestInit
  private readonly rpc: typeof this._rpc

  constructor (
    private readonly url: string,
    private readonly token?: string,
    retryTimeoutMs?: number
  ) {
    if (url === '') {
      throw new Error('Accounts url not specified')
    }

    const isBrowser = typeof window !== 'undefined'

    this.request = {
      keepalive: true,
      headers: {
        ...(this.token === undefined
          ? {}
          : {
              Authorization: 'Bearer ' + this.token
            })
      },
      ...(isBrowser ? { credentials: 'include' } : {})
    }
    this.rpc = withRetryUntilTimeout(this._rpc.bind(this), retryTimeoutMs ?? 5000)
  }

  async getProviders (): Promise<ProviderInfo[]> {
    return await withRetryUntilMaxAttempts(async () => {
      const response = await fetch(concatLink(this.url, '/providers'))

      return await response.json()
    })()
  }

  private async _rpc<T>(request: Request): Promise<T> {
    const timezone = getClientTimezone()
    const meta: Record<string, string> = timezone !== undefined ? { 'x-timezone': timezone } : {}
    const response = await fetch(this.url, {
      ...this.request,
      headers: {
        ...this.request.headers,
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
        ...meta
      },
      method: 'POST',
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

    const result = { ...ws, ...status, processingAttemps: status.processingAttempts ?? 0 }
    delete result.status

    return result
  }

  async getUserWorkspaces (): Promise<WorkspaceInfoWithStatus[]> {
    const request = {
      method: 'getUserWorkspaces' as const,
      params: {}
    }

    return (await this.rpc<any[]>(request)).map((ws) => this.flattenStatus(ws))
  }

  async selectWorkspace (
    workspaceUrl: string,
    kind: 'external' | 'internal' | 'byregion' = 'external',
    externalRegions: string[] = []
  ): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'selectWorkspace' as const,
      params: { workspaceUrl, kind, externalRegions }
    }

    return await this.rpc(request)
  }

  async validateOtp (email: string, code: string, password?: string, action?: 'verify'): Promise<LoginInfo> {
    const request = {
      method: 'validateOtp' as const,
      params: { email, code, password, action }
    }

    return await this.rpc(request)
  }

  async loginOtp (email: string): Promise<OtpInfo> {
    const request = {
      method: 'loginOtp' as const,
      params: { email }
    }

    return await this.rpc(request)
  }

  async getLoginInfoByToken (data?: LoginInfoRequestData): Promise<LoginInfoByToken> {
    const request = {
      method: 'getLoginInfoByToken' as const,
      params: data ?? {}
    }

    return await this.rpc(request)
  }

  async getLoginWithWorkspaceInfo (): Promise<LoginInfoWithWorkspaces> {
    const request = {
      method: 'getLoginWithWorkspaceInfo' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async restorePassword (password: string): Promise<LoginInfo> {
    const request = {
      method: 'restorePassword' as const,
      params: { password }
    }

    return await this.rpc(request)
  }

  async confirm (): Promise<LoginInfo> {
    const request = {
      method: 'confirm' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async requestPasswordReset (email: string): Promise<void> {
    const request = {
      method: 'requestPasswordReset' as const,
      params: { email }
    }

    await this.rpc(request)
  }

  async sendInvite (email: string, role: AccountRole): Promise<void> {
    const request = {
      method: 'sendInvite' as const,
      params: { email, role }
    }

    await this.rpc(request)
  }

  async resendInvite (email: string, role: AccountRole): Promise<void> {
    const request = {
      method: 'resendInvite' as const,
      params: { email, role }
    }

    await this.rpc(request)
  }

  async createInviteLink (
    email: string,
    role: AccountRole,
    autoJoin: boolean,
    firstName: string,
    lastName: string,
    navigateUrl?: string,
    expHours?: number
  ): Promise<string> {
    const request = {
      method: 'createInviteLink' as const,
      params: { email, role, autoJoin, firstName, lastName, navigateUrl, expHours }
    }

    return await this.rpc(request)
  }

  async createAccessLink (
    role: AccountRole,
    options?: {
      firstName?: string
      lastName?: string
      navigateUrl?: string
      extra?: Record<string, any>
      spaces?: string[]
      notBefore?: number
      expiration?: number
      personalized?: boolean
    }
  ): Promise<string> {
    const params: any = { ...(options ?? {}), role }
    if (params.extra != null) {
      params.extra = JSON.stringify(params.extra)
    }

    const request = {
      method: 'createAccessLink' as const,
      params
    }

    return await this.rpc(request)
  }

  async leaveWorkspace (account: AccountUuid): Promise<LoginInfo | null> {
    const request = {
      method: 'leaveWorkspace' as const,
      params: { account }
    }

    return await this.rpc(request)
  }

  async changeUsername (first: string, last: string): Promise<void> {
    const request = {
      method: 'changeUsername' as const,
      params: { first, last }
    }

    await this.rpc(request)
  }

  async changePassword (oldPassword: string, newPassword: string): Promise<void> {
    const request = {
      method: 'changePassword' as const,
      params: { oldPassword, newPassword }
    }

    await this.rpc(request)
  }

  async signUpJoin (
    email: string,
    password: string,
    first: string,
    last: string,
    inviteId: string,
    workspaceUrl: string
  ): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'signUpJoin' as const,
      params: { email, password, first, last, inviteId, workspaceUrl }
    }

    return await this.rpc(request)
  }

  async join (email: string, password: string, inviteId: string, workspaceUrl: string): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'join' as const,
      params: { email, password, inviteId, workspaceUrl }
    }

    return await this.rpc(request)
  }

  async createInvite (exp: number, emailMask: string, limit: number, role: AccountRole): Promise<string> {
    const request = {
      method: 'createInvite' as const,
      params: { exp, emailMask, limit, role }
    }

    return await this.rpc(request)
  }

  async checkJoin (inviteId: string): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'checkJoin' as const,
      params: { inviteId }
    }

    return await this.rpc(request)
  }

  async checkAutoJoin (inviteId: string, firstName?: string, lastName?: string): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'checkAutoJoin' as const,
      params: { inviteId, firstName, lastName }
    }

    return await this.rpc(request)
  }

  async getWorkspacesInfo (ids: WorkspaceUuid[]): Promise<WorkspaceInfoWithStatus[]> {
    const request = {
      method: 'getWorkspacesInfo' as const,
      params: { ids }
    }
    const infos: any[] = await this.rpc(request)
    return Array.from(infos).map((it) => this.flattenStatus(it))
  }

  async updateLastVisit (ids: WorkspaceUuid[]): Promise<void> {
    const request = {
      method: 'updateLastVisit' as const,
      params: { ids }
    }
    await this.rpc(request)
  }

  async getWorkspaceInfo (updateLastVisit: boolean = false): Promise<WorkspaceInfoWithStatus> {
    const request = {
      method: 'getWorkspaceInfo' as const,
      params: updateLastVisit ? { updateLastVisit: true } : {}
    }

    return this.flattenStatus(await this.rpc(request))
  }

  async getRegionInfo (): Promise<RegionInfo[]> {
    const request = {
      method: 'getRegionInfo' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async createWorkspace (workspaceName: string, region?: string): Promise<WorkspaceLoginInfo> {
    const request = {
      method: 'createWorkspace' as const,
      params: { workspaceName, region }
    }

    return await this.rpc(request)
  }

  async signUpOtp (email: string, firstName: string, lastName: string): Promise<OtpInfo> {
    const request = {
      method: 'signUpOtp' as const,
      params: { email, firstName, lastName }
    }

    return await this.rpc(request)
  }

  async signUp (email: string, password: string, firstName: string, lastName: string): Promise<LoginInfo> {
    const request = {
      method: 'signUp' as const,
      params: { email, password, firstName, lastName }
    }

    return await this.rpc(request)
  }

  async login (email: string, password: string): Promise<LoginInfo> {
    const request = {
      method: 'login' as const,
      params: { email, password }
    }

    return await this.rpc(request)
  }

  async loginAsGuest (): Promise<LoginInfo> {
    const request = {
      method: 'loginAsGuest' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async isReadOnlyGuest (): Promise<boolean> {
    const request = {
      method: 'isReadOnlyGuest' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async getPerson (): Promise<Person> {
    const request = {
      method: 'getPerson' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async getPersonInfo (account: PersonUuid): Promise<PersonInfo> {
    const request = {
      method: 'getPersonInfo' as const,
      params: { account }
    }

    return await this.rpc(request)
  }

  async getSocialIds (includeDeleted?: boolean): Promise<SocialId[]> {
    const request = {
      method: 'getSocialIds' as const,
      params: { includeDeleted }
    }

    return await this.rpc(request)
  }

  async workerHandshake (region: string, version: Data<Version>, operation: WorkspaceOperation): Promise<void> {
    const request = {
      method: 'workerHandshake' as const,
      params: { region, version, operation }
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
      params: { region, version, operation }
    }

    const result = await this.rpc(request)
    if (result == null) {
      return null
    }

    return this.flattenStatus(result)
  }

  async updateWorkspaceInfo (
    workspaceUuid: string,
    event: string,
    version: Data<Version>,
    progress: number,
    message?: string
  ): Promise<void> {
    const request = {
      method: 'updateWorkspaceInfo' as const,
      params: { workspaceUuid, event, version, progress, message }
    }

    await this.rpc(request)
  }

  async updateAllowReadOnlyGuests (
    readOnlyGuestsAllowed: boolean
  ): Promise<{ guestPerson: Person, guestSocialIds: SocialId[] } | undefined> {
    const request = {
      method: 'updateAllowReadOnlyGuests' as const,
      params: { readOnlyGuestsAllowed }
    }

    return await this.rpc(request)
  }

  async updateAllowGuestSignUp (guestSignUpAllowed: boolean): Promise<void> {
    const request = {
      method: 'updateAllowGuestSignUp' as const,
      params: { guestSignUpAllowed }
    }

    await this.rpc(request)
  }

  async getWorkspaceMembers (): Promise<WorkspaceMemberInfo[]> {
    const request = {
      method: 'getWorkspaceMembers' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async updateWorkspaceRole (targetAccount: string, targetRole: AccountRole): Promise<void> {
    const request = {
      method: 'updateWorkspaceRole' as const,
      params: { targetAccount, targetRole }
    }

    await this.rpc(request)
  }

  async updateWorkspaceName (name: string): Promise<void> {
    const request = {
      method: 'updateWorkspaceName' as const,
      params: { name }
    }

    await this.rpc(request)
  }

  async deleteWorkspace (): Promise<void> {
    const request = {
      method: 'deleteWorkspace' as const,
      params: {}
    }

    await this.rpc(request)
  }

  async findPersonBySocialKey (socialString: string, requireAccount?: boolean): Promise<PersonUuid | undefined> {
    const request = {
      method: 'findPersonBySocialKey' as const,
      params: { socialString, requireAccount }
    }

    return await this.rpc(request)
  }

  async findPersonBySocialId (socialId: PersonId, requireAccount?: boolean): Promise<PersonUuid | undefined> {
    const request = {
      method: 'findPersonBySocialId' as const,
      params: { socialId, requireAccount }
    }

    return await this.rpc(request)
  }

  async findSocialIdBySocialKey (socialKey: string): Promise<PersonId | undefined> {
    const request = {
      method: 'findSocialIdBySocialKey' as const,
      params: { socialKey }
    }

    return await this.rpc(request)
  }

  async findFullSocialIdBySocialKey (socialKey: string): Promise<SocialId | undefined> {
    const request = {
      method: 'findFullSocialIdBySocialKey' as const,
      params: { socialKey }
    }
    return await this.rpc(request)
  }

  async findFullSocialIds (socialIds: PersonId[]): Promise<SocialId[]> {
    const request = {
      method: 'findFullSocialIds' as const,
      params: { socialIds }
    }
    return await this.rpc(request)
  }

  async listWorkspaces (region?: string | null, mode: WorkspaceMode | null = null): Promise<WorkspaceInfoWithStatus[]> {
    const request = {
      method: 'listWorkspaces' as const,
      params: { region, mode }
    }

    return ((await this.rpc<any[]>(request)) ?? []).map((ws) => this.flattenStatus(ws))
  }

  async performWorkspaceOperation (
    workspaceId: string | string[],
    event: WorkspaceUserOperation,
    ...params: any
  ): Promise<boolean> {
    const request = {
      method: 'performWorkspaceOperation' as const,
      params: { workspaceId, event, params }
    }

    return await this.rpc(request)
  }

  async updateBackupInfo (backupInfo: BackupStatus): Promise<void> {
    const request = {
      method: 'updateBackupInfo' as const,
      params: { backupInfo }
    }

    await this.rpc(request)
  }

  async assignWorkspace (email: string, workspaceUuid: string, role: AccountRole): Promise<void> {
    const request = {
      method: 'assignWorkspace' as const,
      params: { email, workspaceUuid, role }
    }

    await this.rpc(request)
  }

  async updateWorkspaceRoleBySocialKey (socialKey: string, targetRole: AccountRole): Promise<void> {
    const request = {
      method: 'updateWorkspaceRoleBySocialKey' as const,
      params: { socialKey, targetRole }
    }

    await this.rpc(request)
  }

  async ensurePerson (
    socialType: SocialIdType,
    socialValue: string,
    firstName: string,
    lastName: string
  ): Promise<{ uuid: PersonUuid, socialId: PersonId }> {
    const request = {
      method: 'ensurePerson' as const,
      params: { socialType, socialValue, firstName, lastName }
    }

    return await this.rpc(request)
  }

  async exchangeGuestToken (token: string): Promise<string> {
    const request = {
      method: 'exchangeGuestToken' as const,
      params: { token }
    }

    return await this.rpc(request)
  }

  async addSocialIdToPerson (
    person: PersonUuid,
    type: SocialIdType,
    value: string,
    confirmed: boolean,
    displayValue?: string
  ): Promise<PersonId> {
    const request = {
      method: 'addSocialIdToPerson' as const,
      params: { person, type, value, confirmed, displayValue }
    }

    return await this.rpc(request)
  }

  async updateSocialId (personId: PersonId, displayValue: string): Promise<PersonId> {
    const request = {
      method: 'updateSocialId' as const,
      params: { personId, displayValue }
    }
    return await this.rpc(request)
  }

  async getMailboxOptions (): Promise<MailboxOptions> {
    const request = {
      method: 'getMailboxOptions' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async getMailboxSecret (mailbox: string): Promise<MailboxSecret | undefined> {
    const request = {
      method: 'getMailboxSecret' as const,
      params: { mailbox }
    }

    return await this.rpc(request)
  }

  async createMailbox (name: string, domain: string): Promise<{ mailbox: string, socialId: PersonId }> {
    const request = {
      method: 'createMailbox' as const,
      params: { name, domain }
    }

    return await this.rpc(request)
  }

  async getMailboxes (): Promise<MailboxInfo[]> {
    const request = {
      method: 'getMailboxes' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async deleteMailbox (mailbox: string): Promise<void> {
    const request = {
      method: 'deleteMailbox' as const,
      params: { mailbox }
    }

    await this.rpc(request)
  }

  async listAccounts (search?: string, skip?: number, limit?: number): Promise<AccountAggregatedInfo[]> {
    const request = {
      method: 'listAccounts' as const,
      params: { search, skip, limit }
    }

    return await this.rpc(request)
  }

  async deleteAccount (uuid: AccountUuid): Promise<void> {
    const request = {
      method: 'deleteAccount' as const,
      params: { uuid }
    }

    await this.rpc(request)
  }

  async releaseSocialId (
    personUuid: PersonUuid | undefined,
    type: SocialIdType,
    value: string,
    deleteIntegrations = false
  ): Promise<SocialId> {
    const request = {
      method: 'releaseSocialId' as const,
      params: { personUuid, type, value, deleteIntegrations }
    }

    return await this.rpc(request)
  }

  async createIntegration (integration: Integration): Promise<void> {
    const request = {
      method: 'createIntegration' as const,
      params: integration
    }

    await this.rpc(request)
  }

  async updateIntegration (integration: Integration): Promise<void> {
    const request = {
      method: 'updateIntegration' as const,
      params: integration
    }

    await this.rpc(request)
  }

  async deleteIntegration (integrationKey: IntegrationKey): Promise<void> {
    const request = {
      method: 'deleteIntegration' as const,
      params: integrationKey
    }

    await this.rpc(request)
  }

  async getIntegration (integrationKey: IntegrationKey): Promise<Integration | null> {
    const request = {
      method: 'getIntegration' as const,
      params: integrationKey
    }

    return await this.rpc(request)
  }

  async listIntegrations (filter: Partial<IntegrationKey>): Promise<Integration[]> {
    const request = {
      method: 'listIntegrations' as const,
      params: filter
    }

    return await this.rpc(request)
  }

  async addIntegrationSecret (integrationSecret: IntegrationSecret): Promise<void> {
    const request = {
      method: 'addIntegrationSecret' as const,
      params: integrationSecret
    }

    await this.rpc(request)
  }

  async updateIntegrationSecret (integrationSecret: IntegrationSecret): Promise<void> {
    const request = {
      method: 'updateIntegrationSecret' as const,
      params: integrationSecret
    }

    await this.rpc(request)
  }

  async deleteIntegrationSecret (integrationSecretKey: IntegrationSecretKey): Promise<void> {
    const request = {
      method: 'deleteIntegrationSecret' as const,
      params: integrationSecretKey
    }

    await this.rpc(request)
  }

  async getIntegrationSecret (integrationSecretKey: IntegrationSecretKey): Promise<IntegrationSecret | null> {
    const request = {
      method: 'getIntegrationSecret' as const,
      params: integrationSecretKey
    }

    return await this.rpc(request)
  }

  async listIntegrationsSecrets (filter: Partial<IntegrationSecretKey>): Promise<IntegrationSecret[]> {
    const request = {
      method: 'listIntegrationsSecrets' as const,
      params: filter
    }

    return await this.rpc(request)
  }

  async getAccountInfo (uuid: AccountUuid): Promise<AccountInfo> {
    const request = {
      method: 'getAccountInfo' as const,
      params: { accountId: uuid }
    }

    return await this.rpc(request)
  }

  async mergeSpecifiedPersons (primaryPerson: PersonUuid, secondaryPerson: PersonUuid): Promise<void> {
    const request = {
      method: 'mergeSpecifiedPersons' as const,
      params: { primaryPerson, secondaryPerson }
    }

    await this.rpc(request)
  }

  async mergeSpecifiedAccounts (primaryAccount: AccountUuid, secondaryAccount: AccountUuid): Promise<void> {
    const request = {
      method: 'mergeSpecifiedAccounts' as const,
      params: { primaryAccount, secondaryAccount }
    }

    await this.rpc(request)
  }

  async addEmailSocialId (email: string): Promise<OtpInfo> {
    const request = {
      method: 'addEmailSocialId' as const,
      params: { email }
    }

    return await this.rpc(request)
  }

  async addHulyAssistantSocialId (): Promise<PersonId> {
    const request = {
      method: 'addHulyAssistantSocialId' as const,
      params: {}
    }

    return await this.rpc(request)
  }

  async setCookie (): Promise<void> {
    const url = concatLink(this.url, '/cookie')
    const response = await fetch(url, { ...this.request, method: 'PUT' })

    if (!response.ok) {
      const result = await response.json()
      if (result.error != null) {
        throw new PlatformError(result.error)
      }
    }
  }

  async deleteCookie (): Promise<void> {
    const url = concatLink(this.url, '/cookie')
    const response = await fetch(url, { ...this.request, method: 'DELETE' })

    if (!response.ok) {
      const result = await response.json()
      if (result.error != null) {
        throw new PlatformError(result.error)
      }
    }
  }
}

function withRetry<T, F extends (...args: any[]) => Promise<T>> (
  f: F,
  shouldFail: (err: any, attempt: number) => boolean,
  intervalMs: number = 25
): F {
  return async function (...params: any[]): Promise<T> {
    let attempt = 0
    while (true) {
      try {
        return await f(...params)
      } catch (err: any) {
        if (shouldFail(err, attempt)) {
          throw err
        }

        attempt++
        await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
        if (intervalMs < 1000) {
          intervalMs += 100
        }
      }
    }
  } as F
}

const connectionErrorCodes = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND']

function withRetryUntilTimeout<T, F extends (...args: any[]) => Promise<T>> (f: F, timeoutMs: number = 5000): F {
  const timeout = Date.now() + timeoutMs
  const shouldFail = (err: any): boolean => !connectionErrorCodes.includes(err?.cause?.code) || timeout < Date.now()

  return withRetry(f, shouldFail)
}

function withRetryUntilMaxAttempts<T, F extends (...args: any[]) => Promise<T>> (f: F, maxAttempts: number = 5): F {
  const shouldFail = (err: any, attempt: number): boolean =>
    !connectionErrorCodes.includes(err?.cause?.code) || attempt === maxAttempts

  return withRetry(f, shouldFail)
}
