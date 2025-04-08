import {
  type AccountUuid,
  PersonId,
  WorkspaceDataId,
  WorkspaceUuid,
  type AccountRole,
  type Timestamp,
  type SocialId as SocialIdBase,
  PersonUuid
} from '@hcengineering/core'

export interface LoginInfo {
  account: AccountUuid
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

export interface WorkspaceInviteInfo {
  workspace: WorkspaceUuid
  email?: string
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

export interface MailboxOptions {
  availableDomains: string[]
  minNameLength: number
  maxNameLength: number
  maxMailboxCount: number
}

export interface MailboxInfo {
  mailbox: string
  aliases: string[]
  appPasswords: string[]
}

export interface Integration {
  socialId: PersonId
  kind: string // Integration kind. E.g. 'github', 'mail', 'telegram-bot', 'telegram' etc.
  workspaceUuid?: WorkspaceUuid
  data?: Record<string, any>
}

export interface SocialId extends SocialIdBase {
  personUuid: PersonUuid
}

export type IntegrationKey = Omit<Integration, 'data'>

export interface IntegrationSecret {
  socialId: PersonId
  kind: string // Integration kind. E.g. 'github', 'mail', 'telegram-bot', 'telegram' etc.
  workspaceUuid?: WorkspaceUuid
  key: string // Key for the secret in the integration. Different secrets for the same integration must have different keys. Can be any string. E.g. '', 'user_app_1' etc.
  secret: string
}

export type IntegrationSecretKey = Omit<IntegrationSecret, 'secret'>
