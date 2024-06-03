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

import activity, { DocUpdateMessage } from '@hcengineering/activity'
import { type CollaboratorClient, getClient as getCollaboratorClient } from '@hcengineering/collaborator-client'
import type {
  AttachedDoc,
  CollaborativeDoc,
  Data,
  Doc,
  Hierarchy,
  Markup,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxMixin,
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

async function OnMarkupCreate (tx: Tx, { hierarchy, txFactory, workspace, ctx }: TriggerControl): Promise<Tx[]> {
  const createTx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>

  if (createTx._class !== core.class.TxCreateDoc) {
    return []
  }

  const res: Tx[] = []

  if (createTx.attributes.$markup !== undefined) {
    const collaborator = getCollaborator(workspace, hierarchy)
    const versionId = `${Date.now()}`

    const operations: Record<string, any> = {}

    for (const [k, v] of Object.entries<Markup>(createTx.attributes.$markup)) {
      const attr = hierarchy.getAttribute(createTx.objectClass, k)
      if (!hierarchy.isDerived(attr.type._class, core.class.TypeCollaborativeDoc)) continue

      const collaborativeDoc = (createTx.attributes as any)[k] as CollaborativeDoc
      if (collaborativeDoc !== undefined) {
        await ctx.with('update-content', {}, async () => {
          // TODO Here we need to save proper revision id that can be used to fetch
          // the document revision, currenlty it is HEAD that is always the latest one
          // We cannot rely on update from collaborator because it will be an extra update
          operations[k] = await collaborator.updateContent(collaborativeDoc, k, v, {
            versionId,
            versionName: versionId,
            createdBy: tx.modifiedBy
          })
        })
      }
    }

    if (Object.entries(operations).length > 0) {
      if (tx._class === core.class.TxCreateDoc) {
        const markupTx = txFactory.createTxUpdateDoc(
          createTx.objectClass,
          createTx.objectSpace,
          createTx.objectId,
          operations
        )
        res.push(markupTx)
      } else if (tx._class === core.class.TxCollectionCUD) {
        const cudTx = tx as TxCollectionCUD<Doc, AttachedDoc>

        const innerTx = txFactory.createTxUpdateDoc(
          cudTx.tx.objectClass,
          cudTx.tx.objectSpace,
          cudTx.tx.objectId,
          operations
        )

        const outerTx = txFactory.createTxCollectionCUD(
          cudTx.objectClass,
          cudTx.objectId,
          cudTx.objectSpace,
          cudTx.collection,
          innerTx
        )
        res.push(outerTx)
      } else if (tx._class === core.class.TxMixin) {
        const mixinTx = tx as TxMixin<Doc, Doc>
        const markupTx = txFactory.createTxMixin(
          mixinTx.objectId,
          mixinTx.objectClass,
          mixinTx.objectSpace,
          mixinTx.mixin,
          operations
        )
        res.push(markupTx)
      }
    }
  }

  return res
}

async function OnMarkupUpdate (tx: Tx, { hierarchy, workspace, findAll, txFactory }: TriggerControl): Promise<Tx[]> {
  const updateTx = TxProcessor.extractTx(tx) as TxUpdateDoc<Doc>

  if (updateTx._class !== core.class.TxUpdateDoc) {
    return []
  }

  const attrs = []
  for (const attrName in updateTx.operations) {
    const attr = hierarchy.findAttribute(updateTx.objectClass, attrName)
    if (attr !== null && attr !== undefined && hierarchy.isDerived(attr.type._class, core.class.TypeCollaborativeDoc)) {
      attrs.push(attrName)
    }
  }

  if (attrs.length === 0) {
    return []
  }

  const doc = (await findAll(updateTx.objectClass, { _id: updateTx.objectId }))[0]
  if (doc === undefined) {
    return []
  }

  const res: Tx[] = []

  for (const attr of attrs) {
    const collaborator = getCollaborator(workspace, hierarchy)

    const oldMarkup = await collaborator.getContent((doc as any)[attr], attr)
    const newMarkup = await collaborator.getContent((updateTx.operations as any)[attr], attr)

    const rawMessage: Data<DocUpdateMessage> = {
      txId: updateTx._id,
      attachedTo: updateTx.objectId,
      attachedToClass: updateTx.objectClass,
      objectId: updateTx.objectId,
      objectClass: updateTx.objectClass,
      action: 'update',
      collection: 'docUpdateMessages',
      updateCollection:
        tx._class === core.class.TxCollectionCUD
          ? (tx as TxCollectionCUD<Doc, AttachedDoc>).collection
          : undefined,
      attributeUpdates: {
        attrKey: attr,
        attrClass: core.class.TypeMarkup,
        set: [newMarkup],
        added: [],
        removed: [],
        prevValue: oldMarkup,
        isMixin: hierarchy.isDerived(tx._class, core.class.TxMixin)
      }
    }

    const innerTx = txFactory.createTxCreateDoc(
      activity.class.DocUpdateMessage,
      updateTx.space,
      rawMessage,
      undefined,
      updateTx.modifiedOn,
      updateTx.modifiedBy
    )

    const outerTx = txFactory.createTxCollectionCUD(
      rawMessage.attachedToClass,
      rawMessage.attachedTo,
      updateTx.space,
      rawMessage.collection,
      innerTx,
      updateTx.modifiedOn,
      updateTx.modifiedBy
    )

    res.push(outerTx)
  }

  return res
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
    OnMarkupCreate,
    OnMarkupUpdate,
    OnDelete
  }
})
