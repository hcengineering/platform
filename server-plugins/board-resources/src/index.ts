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

import type { Tx, TxCreateDoc, TxRemoveDoc } from '@anticrm/core'
import type { TriggerControl } from '@anticrm/server-core'
import type { Card, CardLabel } from '@anticrm/board'
import board from '@anticrm/board'
import core, { TxProcessor } from '@anticrm/core'

/**
 * @public
 */
export async function OnLabelDelete (tx: Tx, { findAll, hierarchy, txFactory }: TriggerControl): Promise<Tx[]> {
  if (tx._class !== core.class.TxRemoveDoc) {
    return []
  }

  const rmTx = tx as TxRemoveDoc<CardLabel>
  if (!hierarchy.isDerived(rmTx.objectClass, board.class.CardLabel)) {
    return []
  }

  const createTx = (
    await findAll(
      core.class.TxCreateDoc,
      {
        objectId: rmTx.objectId
      },
      { limit: 1 }
    )
  )[0]
  if (createTx === undefined) {
    return []
  }

  const label = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<CardLabel>)
  const cards = await findAll<Card>(board.class.Card, { space: label.attachedTo as any, labels: label._id })
  return cards.map((card) =>
    txFactory.createTxUpdateDoc<Card>(card._class, card.space, card._id, { $pull: { labels: label._id as any } })
  )
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnLabelDelete
  }
})
