//
// Copyright © 2022 Hardcore Engineering Inc.
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

import core, { AnyAttribute, Hierarchy, Tx, TxRemoveDoc } from '@hcengineering/core'
import type { TriggerControl } from '@hcengineering/server-core'
import view from '@hcengineering/view'

/**
 * @public
 */
export async function OnCustomAttributeRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const hierarchy = control.hierarchy
    const ptx = tx as TxRemoveDoc<AnyAttribute>
    if (!checkTx(ptx, hierarchy)) {
      continue
    }
    const attribute = control.removedMap.get(ptx.objectId) as AnyAttribute
    if (attribute === undefined) {
      continue
    }
    const preferences = await control.findAll(control.ctx, view.class.ViewletPreference, {
      config: attribute.name,
      space: core.space.Workspace
    })
    for (const preference of preferences) {
      const tx = control.txFactory.createTxUpdateDoc(preference._class, preference.space, preference._id, {
        $pull: { config: attribute.name }
      })
      result.push(tx)
    }
  }
  return result
}

function checkTx (ptx: TxRemoveDoc<AnyAttribute>, hierarchy: Hierarchy): boolean {
  if (ptx._class !== core.class.TxRemoveDoc) {
    return false
  }

  if (!hierarchy.isDerived(ptx.objectClass, core.class.Attribute)) {
    return false
  }
  return true
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnCustomAttributeRemove
  }
})
