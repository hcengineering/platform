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
  CollaborativeDoc,
  CreateData,
  Doc,
  Hierarchy,
  Markup,
  Mixin,
  MixinData,
  Ref,
  Tx,
  TxCUD,
  TxCreateDoc,
  TxMixin,
  TxRemoveDoc,
  WorkspaceId
} from '@hcengineering/core'
import core, { TxProcessor, collaborativeDocParse, systemAccountEmail } from '@hcengineering/core'
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
  const cudTx = TxProcessor.extractTx(tx) as TxCUD<Doc>

  let mixin: Ref<Mixin<Doc>> | undefined
  let attributes: CreateData<Doc> | MixinData<Doc, Doc>
  if (cudTx._class === core.class.TxCreateDoc) {
    attributes = (cudTx as TxCreateDoc<Doc>).attributes
  } else if (cudTx._class === core.class.TxMixin) {
    attributes = (cudTx as TxMixin<Doc, Doc>).attributes
    mixin = (cudTx as TxMixin<Doc, Doc>).mixin
  } else {
    return []
  }

  const res: Tx[] = []

  if (attributes?.$markup !== undefined) {
    const collaborator = getCollaborator(workspace, hierarchy)

    for (const [k, v] of Object.entries<Markup>(attributes.$markup)) {
      const attr = hierarchy.getAttribute(mixin ?? cudTx.objectClass, k)
      if (!hierarchy.isDerived(attr.type._class, core.class.TypeCollaborativeDoc)) continue

      const collaborativeDoc = (attributes as any)[k] as CollaborativeDoc
      if (collaborativeDoc !== undefined) {
        const { lastVersionId } = collaborativeDocParse(collaborativeDoc)

        await ctx.with('update-content', {}, async () => {
          // TODO Here we need to save proper revision id that can be used to fetch
          // the document revision, currenlty it is HEAD that is always the latest one
          // We cannot rely on update from collaborator because it will be an extra update
          await collaborator.updateContent(collaborativeDoc, k, v, {
            versionId: lastVersionId,
            versionName: lastVersionId,
            createdBy: tx.modifiedBy
          })
        })
      }
    }
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
    OnDelete
  }
})
