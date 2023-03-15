//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core, {
  Doc,
  DOMAIN_BLOB,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_MODEL,
  DOMAIN_TX,
  TxCreateDoc,
  TxCollectionCUD,
  AttachedDoc
} from '@hcengineering/core'

async function fillCreatedBy (client: MigrationClient): Promise<void> {
  const h = client.hierarchy
  const domains = h.domains()
  for (const domain of domains) {
    if (
      domain === DOMAIN_TX ||
      domain === DOMAIN_MODEL ||
      domain === DOMAIN_BLOB ||
      domain === DOMAIN_DOC_INDEX_STATE
    ) {
      continue
    }
    try {
      const objects = await client.find<Doc>(
        domain,
        { createdBy: { $exists: false } },
        { projection: { _id: 1, modifiedBy: 1 } }
      )
      if (objects.length === 0) {
        continue
      }
      const txes = await client.find<TxCreateDoc<Doc>>(
        DOMAIN_TX,
        {
          _class: core.class.TxCreateDoc,
          objectId: { $in: Array.from(objects.map((it) => it._id)) }
        },
        { projection: { _id: 1, modifiedBy: 1, createdBy: 1, objectId: 1 } }
      )

      const txes2 = (
        await client.find<TxCollectionCUD<Doc, AttachedDoc>>(
          DOMAIN_TX,
          {
            _class: core.class.TxCollectionCUD,
            'tx._class': core.class.TxCreateDoc,
            'tx.objectId': { $in: Array.from(objects.map((it) => it._id)) }
          },
          { projection: { _id: 1, modifiedBy: 1, createdBy: 1, tx: 1 } }
        )
      ).map((it) => it.tx as unknown as TxCreateDoc<Doc>)

      const txMap = new Map(txes.concat(txes2).map((p) => [p.objectId, p]))

      console.log('migrateCreateBy', domain, objects.length)
      await client.bulk(
        domain,
        objects.map((it) => {
          const createTx = txMap.get(it._id)
          return {
            filter: { _id: it._id },
            update: {
              createdBy: createTx?.modifiedBy ?? it.modifiedBy
            }
          }
        })
      )
    } catch (err) {}
  }
}
export const coreOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await fillCreatedBy(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
