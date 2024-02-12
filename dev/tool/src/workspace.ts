//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import contact from '@hcengineering/contact'
import core, {
  type Client as CoreClient,
  type BackupClient,
  DOMAIN_TX,
  type Tx,
  type WorkspaceId,
  type Ref,
  type Doc
} from '@hcengineering/core'
import { getWorkspaceDB } from '@hcengineering/mongo'
import { MongoClient } from 'mongodb'
import { generateModelDiff, printDiff } from './mdiff'
import { connect } from '@hcengineering/server-tool'

export async function diffWorkspace (mongoUrl: string, workspace: WorkspaceId, rawTxes: Tx[]): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspace)

    console.log('diffing transactions...')

    const currentModel = await db
      .collection(DOMAIN_TX)
      .find<Tx>({
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      objectClass: { $ne: contact.class.PersonAccount }
    })
      .toArray()

    const txes = rawTxes.filter((tx) => {
      return (
        tx.objectSpace === core.space.Model &&
        tx.modifiedBy === core.account.System &&
        (tx as any).objectClass !== contact.class.PersonAccount
      )
    })

    const { diffTx, dropTx } = await generateModelDiff(currentModel, txes)
    if (diffTx.length > 0) {
      console.log('DIFF Transactions:')

      printDiff(diffTx)
    }
    if (dropTx.length > 0) {
      console.log('Broken Transactions:')
      for (const tx of dropTx) {
        console.log(JSON.stringify(tx, undefined, 2))
      }
    }
  } finally {
    await client.close()
  }
}

export async function updateField (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  transactorUrl: string,
  cmd: { objectId: string, objectClass: string, type: string, attribute: string, value: string, domain: string }
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  const client = new MongoClient(mongoUrl)
  let valueToPut: string | number = cmd.value
  if (cmd.type === 'number') valueToPut = parseFloat(valueToPut)
  try {
    try {
      await client.connect()
      const db = getWorkspaceDB(client, workspaceId)
      await db
        .collection(cmd.domain)
        .updateOne({ _id: cmd.objectId as Ref<Doc> }, { $set: { [cmd.attribute]: valueToPut } })
    } finally {
      await client.close()
    }
  } finally {
    await connection.close()
  }
}
