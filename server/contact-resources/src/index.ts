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

import type { Tx, TxCreateDoc, TxRemoveDoc, TxUpdateDoc } from '@anticrm/core'
import core from '@anticrm/core'
import type { TriggerControl } from '@anticrm/server-core'
import type { Contact } from '@anticrm/contact'
import contact from '@anticrm/contact'

/**
 * @public
 */
export async function OnContactDelete (tx: Tx, { findAll, hierarchy, storageFx }: TriggerControl): Promise<Tx[]> {
  if (tx._class !== core.class.TxRemoveDoc) {
    return []
  }

  const rmTx = tx as TxRemoveDoc<Contact>

  if (!hierarchy.isDerived(rmTx.objectClass, contact.class.Contact)) {
    return []
  }

  const createTx = (await findAll<TxCreateDoc<Contact>>(core.class.TxCreateDoc, { objectId: rmTx.objectId }))[0]
  if (createTx === undefined) {
    return []
  }

  const updateTxes = await findAll<TxUpdateDoc<Contact>>(core.class.TxUpdateDoc, { objectId: rmTx.objectId })
  const avatar: string | undefined = [createTx.attributes.avatar, ...updateTxes.map((x) => x.operations.avatar)]
    .filter((x): x is string => x !== undefined)
    .slice(-1)[0]

  if (avatar === undefined) {
    return []
  }

  storageFx(async (adapter, bucket) => {
    await adapter.removeObject(bucket, avatar)
  })

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnContactDelete
  }
})
