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

import { AccountRole, Doc, Ref, Timestamp, WorkspaceMode, type BackupStatus } from '@hcengineering/core'
import type { Asset, IntlString, Metadata, Plugin, Resource, Status } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

/**
 * @public
 */
export const loginId = 'login' as Plugin

/**
 * @public
 */
export interface Workspace {
  workspace: string // workspace Url
  workspaceName?: string // A company name
  workspaceId: string // A unique identifier for the workspace

  mode?: WorkspaceMode
  progress?: number

  lastVisit: number
  backupInfo?: BackupStatus
  region?: string
}

/**
 * @public
 */
export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string // worspaceUrl in db
  workspaceId: string // workspace in db (actual ID)
  mode?: WorkspaceMode
  progress?: number
}

/**
 * @public
 */
export interface LoginInfo {
  token: string
  endpoint: string
  confirmed: boolean
  email: string
}

export interface OtpInfo {
  sent: boolean
  retryOn: Timestamp
}

export default plugin(loginId, {
  metadata: {
    AccountsUrl: '' as Asset,
    LoginTokens: '' as Metadata<Record<string, string>>,
    LastToken: '' as Metadata<string>,
    LoginEndpoint: '' as Metadata<string>,
    LoginEmail: '' as Metadata<string>,
    DefaultLoginMethod: '' as Metadata<'otp' | 'password'>,
    DisableSignUp: '' as Metadata<boolean>
  },
  component: {
    LoginApp: '' as AnyComponent,
    InviteLink: '' as AnyComponent
  },
  icon: {
    InviteWorkspace: '' as Asset
  },
  string: {
    LinkValidHours: '' as IntlString,
    EmailMask: '' as IntlString,
    NoLimit: '' as IntlString,
    InviteLimit: '' as IntlString
  },
  function: {
    SendInvite: '' as Resource<(email: string, personId?: Ref<Doc>, role?: AccountRole) => Promise<void>>,
    GetInviteLink: '' as Resource<
    (
      expHours: number,
      mask: string,
      limit: number | undefined,
      role: AccountRole,
      navigateUrl?: string
    ) => Promise<string>
    >,
    LeaveWorkspace: '' as Resource<(email: string) => Promise<void>>,
    ChangePassword: '' as Resource<(oldPassword: string, password: string) => Promise<void>>,
    SelectWorkspace: '' as Resource<
    (workspace: string, token: string | null | undefined) => Promise<[Status, WorkspaceLoginInfo | undefined]>
    >,
    FetchWorkspace: '' as Resource<(workspace: string) => Promise<[Status, WorkspaceLoginInfo | undefined]>>,
    CreateEmployee: '' as Resource<(workspace: string) => Promise<[Status]>>,
    GetWorkspaces: '' as Resource<() => Promise<Workspace[]>>
  }
})
