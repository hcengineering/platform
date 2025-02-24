//
// Copyright © 2023 Hardcore Engineering Inc.
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

import core, {
  Account,
  AccountRole,
  systemAccountUuid,
  TxProcessor,
  type Doc,
  type Hierarchy,
  type MeasureContext,
  type SessionData,
  type Tx,
  type TxCUD
} from '@hcengineering/core'

export function isOwner (account: Account, ctx: MeasureContext<SessionData>): boolean {
  return account.role === AccountRole.Owner || isSystem(account, ctx)
}

export function isSystem (account: Account, ctx: MeasureContext<SessionData>): boolean {
  return account.uuid === systemAccountUuid
}

export function filterBroadcastOnly (tx: Tx[], hierarchy: Hierarchy): Tx[] {
  const ftx = tx.filter((it) => {
    if (TxProcessor.isExtendsCUD(it._class)) {
      const cud = it as TxCUD<Doc>
      const bonly = hierarchy.getClassifierProp(cud.objectClass, 'broadcastOnly')
      if (bonly === true) {
        return false
      }
      try {
        const objClass = hierarchy.getClass(cud.objectClass)
        const mix = hierarchy.hasMixin(objClass, core.mixin.TransientConfiguration)
        if (mix && hierarchy.as(objClass, core.mixin.TransientConfiguration).broadcastOnly) {
          hierarchy.setClassifierProp(cud.objectClass, 'broadcastOnly', true)
          // We do not need to store a broadcast only transactions into model.
          return false
        }
      } catch {
        return true
      }
    }
    return true
  })
  return ftx
}
