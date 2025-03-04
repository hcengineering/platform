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

import core, {
  DOMAIN_TX,
  getWorkspaceId,
  type BackupClient,
  type BaseWorkspaceInfo,
  type Class,
  type Client as CoreClient,
  type Doc,
  type MeasureContext,
  type Ref,
  type Tx,
  type WorkspaceUuid
} from '@hcengineering/core'
import { getMongoClient, getWorkspaceMongoDB } from '@hcengineering/mongo'
import { createStorageBackupStorage, restore } from '@hcengineering/server-backup'
import {
  createDummyStorageAdapter,
  wrapPipeline,
  type PipelineFactory,
  type StorageAdapter
} from '@hcengineering/server-core'
import { createStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { connect } from '@hcengineering/server-tool'
import { generateModelDiff, printDiff } from './mdiff'

export async function diffWorkspace (mongoUrl: string, dbName: string, rawTxes: Tx[]): Promise<void> {
  const client = getMongoClient(mongoUrl)
  try {
    const _client = await client.getClient()
    const db = getWorkspaceMongoDB(_client, dbName)

    console.log('diffing transactions...')

    const currentModel = await db
      .collection(DOMAIN_TX)
      .find<Tx>({
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      objectClass: { $ne: 'contact:class:PersonAccount' } // Note: we may keep these transactions in old workspaces for history purposes
    })
      .toArray()

    const txes = rawTxes.filter((tx) => {
      return (
        tx.objectSpace === core.space.Model &&
        tx.modifiedBy === core.account.System &&
        (tx as any).objectClass !== 'contact:class:PersonAccount'
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
    client.close()
  }
}

function setByPath (obj: Record<string, any>, path: string[], value: any): Record<string, any> {
  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]] = current[path[i]] ?? {}
  }
  current[path[path.length - 1]] = value
  return obj
}

export async function updateField (
  workspaceId: WorkspaceUuid,
  transactorUrl: string,
  cmd: { objectId: string, objectClass: string, type: string, attribute: string, value: string, domain: string }
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient

  try {
    const doc = await connection.findOne(cmd.objectClass as Ref<Class<Doc>>, { _id: cmd.objectId as Ref<Doc> })
    if (doc === undefined) {
      console.error('Document not found')
      process.exit(1)
    }
    let valueToPut: string | number | boolean = cmd.value
    if (cmd.type === 'number') valueToPut = parseFloat(valueToPut)
    if (cmd.type === 'boolean') valueToPut = cmd.value === 'true'
    setByPath(doc, cmd.attribute.split('.'), valueToPut)

    await connection.upload(connection.getHierarchy().getDomain(doc?._class), [doc])
  } finally {
    await connection.close()
  }
}

export async function backupRestore (
  ctx: MeasureContext,
  dbURL: string,
  bucketName: string,
  workspace: BaseWorkspaceInfo,
  pipelineFactoryFactory: (mongoUrl: string, storage: StorageAdapter) => PipelineFactory,
  skipDomains: string[]
): Promise<boolean> {
  const storageEnv = process.env.STORAGE
  if (storageEnv === undefined) {
    console.error('please provide STORAGE env')
    process.exit(1)
  }
  if (bucketName.trim() === '') {
    console.error('please provide butket name env')
    process.exit(1)
  }
  const backupStorageConfig = storageConfigFromEnv(storageEnv)

  const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])

  const workspaceStorage = createDummyStorageAdapter()
  const pipelineFactory = pipelineFactoryFactory(dbURL, workspaceStorage)

  try {
    const storage = await createStorageBackupStorage(
      ctx,
      storageAdapter,
      getWorkspaceId(bucketName),
      workspace.workspace
    )
    const wsUrl: WorkspaceIdWithUrl = {
      name: workspace.workspace,
      uuid: workspace.uuid,
      workspaceName: workspace.workspaceName ?? '',
      workspaceUrl: workspace.workspaceUrl ?? ''
    }
    const result: boolean = await ctx.with('restore', { workspace: workspace.workspace }, (ctx) =>
      restore(ctx, '', getWorkspaceId(workspace.workspace), storage, {
        date: -1,
        skip: new Set(skipDomains),
        recheck: false,
        storageAdapter: workspaceStorage,
        getConnection: async () => {
          return wrapPipeline(ctx, await pipelineFactory(ctx, wsUrl, true, () => {}, null), wsUrl)
        }
      })
    )
    return result
  } finally {
    await storageAdapter.close()
  }
}
