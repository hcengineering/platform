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

import { type Builder } from '@hcengineering/model'

import core from '@hcengineering/core'
import serverCore from '@hcengineering/server-core'
import serverAccessGroup from '@hcengineering/server-access-group'

export { serverAccessGroupId } from '@hcengineering/server-access-group'

export function createModel (builder: Builder): void {
  // GroupGrant create / remove / level-update → materialize + reconcile the
  // derived group-collaborators synchronously (immediate visibility).
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAccessGroup.trigger.OnGroupGrantChanged,
    txMatch: {
      objectClass: core.class.GroupGrant
    }
  })

  // AccessGroup membership change → re-reconcile every grant of the group.
  // Async: a membership edit may fan out across many grants / docs.
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAccessGroup.trigger.OnAccessGroupChanged,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: core.class.AccessGroup
    },
    isAsync: true
  })
}
