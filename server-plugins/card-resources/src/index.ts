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

import core, { AnyAttribute, Tx, TxCreateDoc, TxProcessor, TxRemoveDoc } from '@hcengineering/core'
import card, { MasterTag } from '@hcengineering/card'
import view from '@hcengineering/view'
import { TriggerControl } from '@hcengineering/server-core'

async function OnAttribute (ctx: TxCreateDoc<AnyAttribute>[], control: TriggerControl): Promise<Tx[]> {
  const attr = TxProcessor.createDoc2Doc(ctx[0])
  if (control.hierarchy.isDerived(attr.attributeOf, card.class.Card)) {
    const desc = control.hierarchy.getDescendants(attr.attributeOf)
    const res: Tx[] = []
    for (const des of desc) {
      const viewlets = control.modelDb.findAllSync(view.class.Viewlet, { attachTo: des })
      for (const viewlet of viewlets) {
        viewlet.config.push(attr.name)
        res.push(
          control.txFactory.createTxUpdateDoc(viewlet._class, viewlet.space, viewlet._id, {
            config: viewlet.config
          })
        )
        const prefs = await control.findAll(control.ctx, view.class.ViewletPreference, { attachedTo: viewlet._id })
        for (const pref of prefs) {
          res.push(
            control.txFactory.createTxUpdateDoc(pref._class, pref.space, pref._id, {
              config: viewlet.config
            })
          )
        }
      }
    }
    return res
  }
  return []
}

async function OnMasterTagRemove (ctx: TxRemoveDoc<MasterTag>[], control: TriggerControl): Promise<Tx[]> {
  const removeTx = ctx[0]
  const removedTag = control.removedMap.get(removeTx.objectId)
  if (removedTag === undefined) return []
  const res: Tx[] = []
  // should remove objects if masterTag
  if (removedTag._class === card.class.MasterTag) {
    const cards = await control.findAll(control.ctx, removeTx.objectId, {})
    for (const card of cards) {
      res.push(control.txFactory.createTxRemoveDoc(card._class, card.space, card._id))
    }
  }
  const desc = control.hierarchy.getDescendants(removeTx.objectId)
  for (const des of desc) {
    if (des === removeTx.objectId) continue
    res.push(control.txFactory.createTxRemoveDoc(card.class.MasterTag, core.space.Model, des))
  }

  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnAttribute,
    OnMasterTagRemove
  }
})
