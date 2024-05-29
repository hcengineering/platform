//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type CollaboratorClient, getClient as getCollaboratorClient } from '@hcengineering/collaborator-client'
import type {
  Class,
  CollaborativeDoc,
  Data,
  Doc,
  Hierarchy,
  Markup,
  MarkupOptions,
  MeasureContext,
  Ref,
  Tx,
  TxCUD,
  TxCreateDoc,
  TxRemoveDoc,
  TxUpdateDoc,
  WorkspaceId
} from '@hcengineering/core'
import core, { TxProcessor, systemAccountEmail } from '@hcengineering/core'
import { removeCollaborativeDoc } from '@hcengineering/collaboration'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { type TriggerControl } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'

function getCollaborator (workspace: WorkspaceId, hierarchy: Hierarchy): CollaboratorClient {
  const token = generateToken(systemAccountEmail, workspace, {})
  const collaboratorUrl = getMetadata(serverCore.metadata.CollaboratorUrl) ?? ''
  return getCollaboratorClient(hierarchy, workspace, token, collaboratorUrl)
}

async function updateMarkup (
  ctx: MeasureContext,
  _class: Ref<Class<Doc>>,
  doc: Data<Doc>,
  markup: MarkupOptions<Doc>,
  hierarchy: Hierarchy,
  workspace: WorkspaceId
): Promise<void> {
  if (markup.$markup === undefined) return

  const collaborator = getCollaborator(workspace, hierarchy)

  for (const [k, v] of Object.entries<Markup>(markup.$markup)) {
    const attr = hierarchy.getAttribute(_class, k)
    if (!hierarchy.isDerived(attr.type._class, core.class.TypeCollaborativeDoc)) continue

    const collaborativeDoc = (doc as any)[k] as CollaborativeDoc
    if (collaborativeDoc !== undefined) {
      await ctx.with('update-content', {}, async () => {
        await collaborator.updateContent(collaborativeDoc, k, v)
      })
    }
  }
}

/**
 * @public
 */
export async function MarkupTrigger (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const etx = TxProcessor.extractTx(tx) as TxCUD<Doc>

  if (etx._class === core.class.TxCreateDoc) {
    return await OnMarkupCreate(tx, control)
  }
  if (etx._class === core.class.TxUpdateDoc) {
    return await OnMarkupUpdate(tx, control)
  }

  return []
}

async function OnMarkupCreate (tx: Tx, { hierarchy, workspace, ctx }: TriggerControl): Promise<Tx[]> {
  const createTx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>

  if (createTx.attributes.$markup !== undefined) {
    await updateMarkup(ctx, createTx.objectClass, createTx.attributes, createTx.attributes, hierarchy, workspace)
  }

  return []
}

async function OnMarkupUpdate (tx: Tx, { hierarchy, workspace, ctx, findAll }: TriggerControl): Promise<Tx[]> {
  const updateTx = TxProcessor.extractTx(tx) as TxUpdateDoc<Doc>

  if (updateTx.operations.$markup !== undefined) {
    const rawDoc = (await findAll(updateTx.objectClass, updateTx.objectId))[0]
    if (rawDoc !== undefined) {
      const doc = TxProcessor.updateDoc2Doc(rawDoc, updateTx)
      await updateMarkup(ctx, updateTx.objectClass, doc, updateTx.operations, hierarchy, workspace)
    }
  }

  return []
}

/**
 * @public
 */
export async function OnDelete (
  tx: Tx,
  { hierarchy, storageAdapter, workspace, removedMap, ctx }: TriggerControl
): Promise<Tx[]> {
  const rmTx = TxProcessor.extractTx(tx) as TxRemoveDoc<Doc>

  if (rmTx._class !== core.class.TxRemoveDoc) {
    return []
  }

  // Obtain document being deleted
  const doc = removedMap.get(rmTx.objectId)

  // Ids of files to delete from storage
  const toDelete: CollaborativeDoc[] = []

  const attributes = hierarchy.getAllAttributes(rmTx.objectClass)
  for (const attribute of attributes.values()) {
    if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)) {
      const value = (doc as any)[attribute.name] as CollaborativeDoc
      if (value !== undefined) {
        toDelete.push(value)
      }
    }
  }

  // TODO This is not accurate way to delete collaborative document
  // Even though we are deleting it here, the document can be currently in use by someone else
  // and when editing session ends, the collborator service will recreate the document again
  await removeCollaborativeDoc(storageAdapter, workspace, toDelete, ctx)

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    MarkupTrigger,
    OnDelete
  }
})
