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

import {
  Class,
  Doc,
  DocIndexState,
  DocumentQuery,
  DocumentUpdate,
  extractDocKey,
  MeasureContext,
  Ref,
  Storage,
  WorkspaceId
} from '@hcengineering/core'
import { FullTextAdapter, IndexedDoc } from '../types'
import { summaryStageId } from './summary'
import {
  contentStageId,
  DocUpdateHandler,
  fieldStateId,
  FullTextPipeline,
  FullTextPipelineStage,
  fullTextPushStageId
} from './types'
import { docKey } from './utils'

/**
 * @public
 */
export class FullTextPushStage implements FullTextPipelineStage {
  require = [fieldStateId, contentStageId, summaryStageId]
  stageId = fullTextPushStageId

  enabled = true

  updateFields: DocUpdateHandler[] = []

  limit = 100

  dimmVectors: Record<string, number[]> = {}

  field_enabled = '_use'

  constructor (
    readonly fulltextAdapter: FullTextAdapter,
    readonly workspace: WorkspaceId,
    readonly metrics: MeasureContext
  ) {}

  async initialize (storage: Storage, pipeline: FullTextPipeline): Promise<void> {
    // Just do nothing
    try {
      const r = await this.fulltextAdapter.initMapping()
      for (const [k, v] of Object.entries(r)) {
        this.dimmVectors[k] = Array.from(Array(v).keys()).map((it) => 0)
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  async update (doc: DocIndexState, update: DocumentUpdate<DocIndexState>): Promise<void> {}

  checkIntegrity (indexedDoc: IndexedDoc): void {
    for (const [k, dimms] of Object.entries(this.dimmVectors)) {
      if (indexedDoc[k] === undefined || indexedDoc[k].length !== dimms.length) {
        indexedDoc[k] = dimms
        indexedDoc[`${k}${this.field_enabled}`] = false
      }
    }
  }

  async search (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size?: number,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    return { docs: [], pass: true }
  }

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    const bulk: IndexedDoc[] = []
    for (const doc of toIndex) {
      if (pipeline.cancelling) {
        return
      }
      if (pipeline.cancelling) {
        return
      }

      try {
        const elasticDoc = createElasticDoc(doc)
        updateDoc2Elastic(doc.attributes, elasticDoc)
        this.checkIntegrity(elasticDoc)
        bulk.push(elasticDoc)
      } catch (err: any) {
        const wasError = (doc as any).error !== undefined

        await pipeline.update(doc._id, false, { [docKey('error')]: JSON.stringify({ message: err.message, err }) })
        if (wasError) {
          continue
        }
        // Print error only first time, and update it in doc index
        console.error(err)
        continue
      }
    }
    // Perform bulk update to elastic
    try {
      await this.fulltextAdapter.updateMany(bulk)
    } catch (err: any) {
      console.error(err)
    }
    for (const doc of toIndex) {
      await pipeline.update(doc._id, true, {})
    }
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    await this.fulltextAdapter.remove(docs.map((it) => it._id))
    // will be handled by field processor
    for (const doc of docs) {
      await pipeline.update(doc._id, true, {})
    }
  }
}

/**
 * @public
 */
export function createElasticDoc (upd: DocIndexState): IndexedDoc {
  const doc = {
    id: upd._id,
    _class: upd.objectClass,
    modifiedBy: upd.modifiedBy,
    modifiedOn: upd.modifiedOn,
    space: upd.space,
    attachedTo: upd.attachedTo,
    attachedToClass: upd.attachedToClass
  }
  return doc
}
function updateDoc2Elastic (attributes: Record<string, any>, doc: IndexedDoc): IndexedDoc {
  for (const [k, v] of Object.entries(attributes)) {
    const { _class, attr, docId, extra } = extractDocKey(k)

    let vv: any = v
    if (extra.includes('base64')) {
      vv = Buffer.from(v, 'base64').toString()
    }
    if (docId === undefined) {
      doc[k] = vv
      continue
    }
    const docIdAttr = '|' + docKey(attr, { _class, extra: extra.filter((it) => it !== 'base64') })
    if (vv !== null) {
      // Since we replace array of values, we could ignore null
      doc[docIdAttr] = [...(doc[docIdAttr] ?? []), vv]
    }
  }
  return doc
}
