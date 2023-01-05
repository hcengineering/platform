//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import type { Doc, Ref, Tx, TxCollectionCUD, TxCreateDoc, TxRemoveDoc } from '@hcengineering/core'
import type { TriggerControl } from '@hcengineering/server-core'
import type { Attachment } from '@hcengineering/attachment'
import attachment from '@hcengineering/attachment'
import core, { TxProcessor } from '@hcengineering/core'

const findCreateTx = async (
  id: Ref<Attachment>,
  findAll: TriggerControl['findAll']
): Promise<TxCreateDoc<Attachment> | undefined> => {
  const createTx = (await findAll<TxCreateDoc<Attachment>>(core.class.TxCreateDoc, { objectId: id }))[0]

  if (createTx !== undefined) {
    return createTx
  }

  const colTx = (
    await findAll<TxCollectionCUD<Doc, Attachment>>(core.class.TxCollectionCUD, {
      'tx._class': core.class.TxCreateDoc,
      'tx.objectClass': attachment.class.Attachment,
      'tx.objectId': id
    })
  )[0]

  if (colTx === undefined) return

  return colTx.tx as TxCreateDoc<Attachment>
}

/**
 * @public
 */
export async function OnAttachmentDelete (
  tx: Tx,
  { findAll, hierarchy, fulltextFx, storageFx }: TriggerControl
): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  if (actualTx._class !== core.class.TxRemoveDoc) {
    return []
  }

  const rmTx = actualTx as TxRemoveDoc<Attachment>

  if (!hierarchy.isDerived(rmTx.objectClass, attachment.class.Attachment)) {
    return []
  }

  const createTx = await findCreateTx(rmTx.objectId, findAll)

  if (createTx === undefined) {
    return []
  }

  const attach = TxProcessor.createDoc2Doc(createTx)

  fulltextFx(async (adapter) => {
    await adapter.remove([attach.file as Ref<Doc>])
  })

  storageFx(async (adapter, bucket) => {
    await adapter.remove(bucket, [attach.file])
  })

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnAttachmentDelete
  }
})
