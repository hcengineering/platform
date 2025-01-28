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

import { type WorkspaceUuid, type MeasureContext, type Ref } from '@hcengineering/core'
import documents, { type DocumentMeta, type ProjectMeta } from '@hcengineering/controlled-documents'
import { DOMAIN_DOCUMENTS } from '@hcengineering/model-controlled-documents'
import { type Db } from 'mongodb'
import { makeRank } from '@hcengineering/task'

export async function addControlledDocumentRank (
  ctx: MeasureContext,
  db: Db,
  workspaceId: WorkspaceUuid
): Promise<void> {
  const collections = await db.listCollections().toArray()
  if (collections.find((it) => it.name === DOMAIN_DOCUMENTS) === undefined) {
    ctx.error('skipping migration, no collection found', { workspace: workspaceId })
    return
  }

  const prjMeta = await db
    .collection<ProjectMeta>(DOMAIN_DOCUMENTS)
    .find({ _class: documents.class.ProjectMeta })
    .toArray()

  const docMeta = await db
    .collection<DocumentMeta>(DOMAIN_DOCUMENTS)
    .find({ _class: documents.class.DocumentMeta })
    .toArray()

  const docMetaById = new Map<Ref<DocumentMeta>, DocumentMeta>()
  for (const doc of docMeta) {
    docMetaById.set(doc._id, doc)
  }

  prjMeta.sort((a, b) => {
    const titleA = docMetaById.get(a.meta)?.title ?? ''
    const titleB = docMetaById.get(b.meta)?.title ?? ''
    return titleA.localeCompare(titleB, undefined, { numeric: true })
  })

  let rank = makeRank(undefined, undefined)
  for (const doc of prjMeta) {
    await db.collection(DOMAIN_DOCUMENTS).updateOne({ _id: doc._id }, { $set: { rank } })
    rank = makeRank(rank, undefined)
  }
}
