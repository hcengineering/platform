//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2026 TraceX SAS.
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

import core from './component'

export * from './audit'
export * from './classes'
export * from './autoJoinRoles'
export * from './client'
export * from './collaboration'
export {
  coreId,
  systemAccountUuid,
  readOnlyGuestAccountUuid,
  docGuestAccountUuid,
  systemAccountEmail,
  systemAccount,
  configUserAccountUuid
} from './component'
export * from './hierarchy'
export * from './identifier'
export * from '@hcengineering/measurements'
export * from './memdb'
export * from './modulePermissions'
export * from './objvalue'
export * from './operations'
export * from './operator'
export * from './query'
export type * from './server'
export * from './storage'
export * from './tx'
export * from './utils'
export type * from './backup'
export * from './status'
export * from './clone'
export * from './common'
export * from './time'
export * from './benchmark'
export * from './collaborators'
export * from './objectAccess'
export type * from './versioning'

export default core
