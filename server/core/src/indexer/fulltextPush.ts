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

import core, {
  AnyAttribute,
  ArrOf,
  Class,
  Doc,
  DocIndexState,
  DocumentQuery,
  DocumentUpdate,
  extractDocKey,
  IndexKind,
  MeasureContext,
  Ref,
  ServerStorage,
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
import { collectPropagate, collectPropagateClasses, docKey, getFullTextContext } from './utils'

/**
 * @public
 */
export class FullTextPushStage implements FullTextPipelineStage {
  require = [fieldStateId, contentStageId, summaryStageId]
  stageId = fullTextPushStageId

  enabled = true

  updateFields: DocUpdateHandler[] = []

  limit = 10

  dimmVectors: Record<string, number[]> = {}

  field_enabled = '_use'

  stageValue: boolean | string = true

  constructor (
    private readonly dbStorage: ServerStorage,
    readonly fulltextAdapter: FullTextAdapter,
    readonly workspace: WorkspaceId
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

  async indexRefAttributes (
    attributes: Map<string, AnyAttribute>,
    doc: DocIndexState,
    elasticDoc: IndexedDoc,
    metrics: MeasureContext
  ): Promise<void> {
    for (const attribute in doc.attributes) {
      const { attr } = extractDocKey(attribute)
      const attrObj = attributes.get(attr)
      if (
        attrObj !== null &&
        attrObj !== undefined &&
        attrObj.index === IndexKind.FullText &&
        (attrObj.type._class === core.class.RefTo ||
          (attrObj.type._class === core.class.ArrOf && (attrObj.type as ArrOf<any>).of._class === core.class.RefTo))
      ) {
        const attrStringValue = doc.attributes[attribute]
        if (attrStringValue !== undefined && attrStringValue !== null && attrStringValue !== '') {
          const refs = attrStringValue.split(',')
          const refDocs = await metrics.with(
            'ref-docs',
            {},
            async (ctx) =>
              await this.dbStorage.findAll(ctx, core.class.DocIndexState, {
                _id: { $in: refs }
              })
          )
          if (refDocs.length > 0) {
            refDocs.forEach((c) => {
              updateDoc2Elastic(c.attributes, elasticDoc, c._id)
            })
          }
        }
      }
    }
  }

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline, metrics: MeasureContext): Promise<void> {
    const bulk: IndexedDoc[] = []

    const part = [...toIndex]
    while (part.length > 0) {
      const toIndexPart = part.splice(0, 1000)

      const allChildDocs = await metrics.with(
        'find-child',
        {},
        async (ctx) =>
          await this.dbStorage.findAll(ctx, core.class.DocIndexState, {
            attachedTo: { $in: toIndexPart.map((it) => it._id) }
          })
      )

      for (const doc of toIndexPart) {
        if (pipeline.cancelling) {
          return
        }
        const elasticDoc = createElasticDoc(doc)
        try {
          updateDoc2Elastic(doc.attributes, elasticDoc)

          // Include all child attributes
          const childDocs = allChildDocs.filter((it) => it.attachedTo === doc._id)
          if (childDocs.length > 0) {
            for (const c of childDocs) {
              const ctx = getFullTextContext(pipeline.hierarchy, c.objectClass)
              if (ctx.parentPropagate ?? true) {
                updateDoc2Elastic(c.attributes, elasticDoc, c._id)
              }
            }
          }

          if (doc.attachedToClass != null && doc.attachedTo != null) {
            const propagate: Ref<Class<Doc>>[] = collectPropagate(pipeline, doc.attachedToClass)
            if (propagate.some((it) => pipeline.hierarchy.isDerived(doc.objectClass, it))) {
              // We need to include all parent content into this one.
              const [parentDoc] = await metrics.with(
                'find-parent',
                {},
                async (ctx) =>
                  await this.dbStorage.findAll(ctx, core.class.DocIndexState, {
                    _id: doc.attachedTo as Ref<DocIndexState>
                  })
              )
              if (parentDoc !== undefined) {
                updateDoc2Elastic(parentDoc.attributes, elasticDoc, parentDoc._id)

                const ctx = collectPropagateClasses(pipeline, parentDoc.objectClass)
                if (ctx.length > 0) {
                  for (const p of ctx) {
                    const collections = await this.dbStorage.findAll(
                      metrics.newChild('propagate', {}),
                      core.class.DocIndexState,
                      { attachedTo: parentDoc._id, objectClass: p }
                    )
                    for (const c of collections) {
                      updateDoc2Elastic(c.attributes, elasticDoc, c._id)
                    }
                  }
                }
              }
            }
          }

          const allAttributes = pipeline.hierarchy.getAllAttributes(elasticDoc._class)

          // Include child ref attributes
          await this.indexRefAttributes(allAttributes, doc, elasticDoc, metrics)

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
        for (const doc of toIndex) {
          await pipeline.update(doc._id, true, {})
        }
      } catch (err: any) {
        console.error(err)
      }
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
function updateDoc2Elastic (attributes: Record<string, any>, doc: IndexedDoc, docIdOverride?: Ref<DocIndexState>): void {
  for (const [k, v] of Object.entries(attributes)) {
    if (v == null) {
      continue
    }
    let { _class, attr, docId, extra } = extractDocKey(k)
    if (attr.length === 0) {
      continue
    }

    let vv: any = v
    if (vv != null && extra.includes('base64')) {
      vv = Buffer.from(v, 'base64').toString()
    }

    docId = docIdOverride ?? docId
    if (docId === undefined) {
      if (typeof vv !== 'object') {
        doc[k] = vv
      }
      continue
    }
    const docIdAttr = '|' + docKey(attr, { _class, extra: extra.filter((it) => it !== 'base64') })
    if (vv !== null) {
      // Since we replace array of values, we could ignore null
      doc[docIdAttr] = [...(doc[docIdAttr] ?? [])]
      if (vv !== '') {
        if (typeof vv !== 'object') {
          doc[docIdAttr].push(vv)
        }
      }
    }
  }
}
