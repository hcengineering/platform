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

import type { Plugin, Asset, Metadata, StatusCode } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { AnyComponent } from '@anticrm/ui'

// /**
//  * @public
//  */
// export interface LoginInfo {
//   email: string
//   workspace: string
//   server: string
//   port: string
//   token: string
//   secondFactorEnabled: boolean
// }

/**
 * @public
 */
export const loginId = 'login' as Plugin

export default plugin(loginId, {
  metadata: {
    AccountsUrl: '' as Asset,
    UploadUrl: '' as Asset,
    TelegramUrl: '' as Asset,
    LoginToken: '' as Metadata<string>,
    LoginEndpoint: '' as Metadata<string>,
    LoginEmail: '' as Metadata<string>,
    OverrideLoginToken: '' as Metadata<string>, // debug purposes
    OverrideEndpoint: '' as Metadata<string>
  },
  component: {
    LoginApp: '' as AnyComponent
  },
  status: {
    AccountNotFound: '' as StatusCode<{account: string}>,
    WorkspaceNotFound: '' as StatusCode<{workspace: string}>,
    InvalidPassword: '' as StatusCode<{account: string}>,
    AccountAlreadyExists: '' as StatusCode<{account: string}>,
    WorkspaceAlreadyExists: '' as StatusCode<{workspace: string}>
  }
})
