import { AccountRole, type Timestamp } from '@hcengineering/core'

export interface LoginInfo {
  account: string
  token?: string
}

/**
   * @public
   */
export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string // worspace uuid
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
