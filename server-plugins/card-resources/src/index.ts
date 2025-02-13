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

import { AnyAttribute, Tx, TxCreateDoc, TxProcessor } from '@hcengineering/core'
import card from '@hcengineering/card'
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnAttribute
  }
})
