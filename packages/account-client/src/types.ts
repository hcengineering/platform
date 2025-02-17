import {
  PersonId,
  WorkspaceDataId,
  WorkspaceUuid,
  type AccountRole,
  type PersonUuid,
  type Timestamp
} from '@hcengineering/core'

export interface LoginInfo {
  account: PersonUuid
  name?: string
  socialId?: PersonId
  token?: string
}

/**
 * @public
 */
export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: WorkspaceUuid // worspace uuid
  workspaceDataId?: WorkspaceDataId
  workspaceUrl: string
  endpoint: string
  token: string
  role: AccountRole
}

export interface OtpInfo {
  sent: boolean
  retryOn: Timestamp
}

export interface RegionInfo {
  region: string
  name: string
}

export type WorkspaceOperation = 'create' | 'upgrade' | 'all' | 'all+backup'
