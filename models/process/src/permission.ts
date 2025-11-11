//
// Copyright © 2025 Hardcore Engineering Inc.
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

import core from '@hcengineering/core'
import process from '.'
import { type Builder } from '@hcengineering/model'
import { ExecutionStatus } from '@hcengineering/process'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: process.string.RunProcessPermission,
      txClass: core.class.TxCreateDoc,
      objectClass: process.class.Execution,
      scope: 'space'
    },
    process.permission.RunProcess
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: process.string.CancelProcessPermission,
      txClass: core.class.TxUpdateDoc,
      objectClass: process.class.Execution,
      txMatch: {
        'operations.status': ExecutionStatus.Cancelled
      },
      scope: 'space'
    },
    process.permission.CancelProcess
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: process.string.ForbidRunProcessPermission,
      txClass: core.class.TxCreateDoc,
      objectClass: process.class.Execution,
      scope: 'space',
      forbid: true
    },
    process.permission.ForbidRunProcess
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: process.string.ForbidCancelProcessPermission,
      txClass: core.class.TxUpdateDoc,
      objectClass: process.class.Execution,
      txMatch: {
        'operations.status': ExecutionStatus.Cancelled
      },
      scope: 'space',
      forbid: true
    },
    process.permission.ForbidCancelProcess
  )
}
