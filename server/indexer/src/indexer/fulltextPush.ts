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

import { Analytics } from '@hcengineering/analytics'
import core, {
  type AnyAttribute,
  type ArrOf,
  type Branding,
  type Class,
  type Doc,
  type DocIndexState,
  type DocumentQuery,
  type DocumentUpdate,
  extractDocKey,
  getFullTextContext,
  type Hierarchy,
  isFullTextAttribute,
  type MeasureContext,
  RateLimiter,
  type Ref,
  toIdMap,
  type WorkspaceId
} from '@hcengineering/core'
import { type DbAdapter, type FullTextAdapter, type IndexedDoc, type SessionFindAll } from '@hcengineering/server-core'
import { updateDocWithPresenter } from '../mapper'
import { jsonToText, markupToJSON } from '@hcengineering/text'
import {
  contentStageId,
  type DocUpdateHandler,
  fieldStateId,
  type FullTextPipeline,
  type FullTextPipelineStage,
  fullTextPushStageId,
  summaryStageId
} from './types'
import { collectPropagate, collectPropagateClasses, docKey, isCustomAttr } from './utils'

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

  constructor (
    private readonly dbStorageFindAll: SessionFindAll,
    readonly fulltextAdapter: FullTextAdapter,
    readonly workspace: WorkspaceId,
    readonly branding: Branding | null
  ) {}

  async initialize (ctx: MeasureContext, storage: DbAdapter, pipeline: FullTextPipeline): Promise<void> {
    // Just do nothing
    try {
      const r = await this.fulltextAdapter.initMapping()
      for (const [k, v] of Object.entries(r)) {
        this.dimmVectors[k] = Array.from(Array(v).keys()).map((it) => 0)
      }
    } catch (err: any) {
      Analytics.handleError(err)
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

  allAttrs = new WeakMap<Class<Doc>, Map<string, AnyAttribute>>()

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline, ctx: MeasureContext): Promise<void> {
    const bulk: IndexedDoc[] = []

    const part = [...toIndex]

    const parentsMap = new Map<Ref<DocIndexState>, DocIndexState>()

    const pushQueue = new RateLimiter(5)
    while (part.length > 0) {
      const toIndexPart = part.splice(0, 50)

      const childIds = toIndexPart
        .filter((it) => {
          const fctx = getFullTextContext(pipeline.hierarchy, it.objectClass)
          return fctx.childProcessingAllowed ?? true
        })
        .map((it) => it._id)

      const allChildDocs = await ctx.with(
        'find-child',
        {},
        async (ctx) =>
          await this.dbStorageFindAll(ctx, core.class.DocIndexState, {
            attachedTo: childIds.length === 1 ? childIds[0] : { $in: childIds }
          })
      )

      // spaces
      const spaceDocs = toIdMap(
        await ctx.with(
          'find-spaces',
          {},
          async (ctx) =>
            await this.dbStorageFindAll(ctx, core.class.DocIndexState, {
              _id: {
                $in: toIndexPart.map(
                  (doc) =>
                    (doc.attributes[docKey('space', { _class: doc.objectClass })] ?? doc.space) as Ref<DocIndexState>
                )
              }
            })
        )
      )

      for (const doc of toIndexPart) {
        if (pipeline.cancelling) {
          return
        }
        const elasticDoc = createElasticDoc(doc)
        try {
          ctx.withSync('updateDoc2Elastic', {}, (ctx) => {
            updateDoc2Elastic(this.allAttrs, ctx, doc.attributes, elasticDoc, undefined, undefined, pipeline.hierarchy)
          })

          // Include all child attributes
          const childDocs = allChildDocs.filter((it) => it.attachedTo === doc._id)
          if (childDocs.length > 0) {
            for (const c of childDocs) {
              const fctx = getFullTextContext(pipeline.hierarchy, c.objectClass)
              if (fctx.parentPropagate ?? true) {
                ctx.withSync('updateDoc2Elastic', {}, (ctx) => {
                  updateDoc2Elastic(
                    this.allAttrs,
                    ctx,
                    c.attributes,
                    elasticDoc,
                    c._id,
                    undefined,
                    pipeline.hierarchy,
                    true
                  )
                })
              }
            }
          }
          let parentDoc: DocIndexState | undefined
          if (doc.attachedToClass != null && doc.attachedTo != null) {
            const propagate: Ref<Class<Doc>>[] = collectPropagate(pipeline, doc.attachedToClass)
            if (propagate.some((it) => pipeline.hierarchy.isDerived(doc.objectClass, it))) {
              // We need to include all parent content into this one.
              parentDoc =
                parentsMap.get(doc.attachedTo as Ref<DocIndexState>) ??
                (await ctx.with('find-parent', {}, async (ctx) =>
                  (
                    await this.dbStorageFindAll(
                      ctx,
                      core.class.DocIndexState,
                      {
                        _id: doc.attachedTo as Ref<DocIndexState>
                      },
                      { limit: 1 }
                    )
                  ).shift()
                ))
              if (parentDoc !== undefined) {
                parentsMap.set(parentDoc._id, parentDoc)
                const ppdoc = parentDoc
                ctx.withSync('updateDoc2Elastic', {}, (ctx) => {
                  updateDoc2Elastic(
                    this.allAttrs,
                    ctx,
                    ppdoc.attributes,
                    elasticDoc,
                    ppdoc._id,
                    undefined,
                    pipeline.hierarchy,
                    true
                  )
                })

                const collectClasses = collectPropagateClasses(pipeline, parentDoc.objectClass)
                if (collectClasses.length > 0) {
                  const collections = await this.dbStorageFindAll<DocIndexState>(ctx, core.class.DocIndexState, {
                    attachedTo: parentDoc._id,
                    objectClass: { $in: collectClasses }
                  })
                  for (const c of collections) {
                    ctx.withSync('updateDoc2Elastic', {}, (ctx) => {
                      updateDoc2Elastic(
                        this.allAttrs,
                        ctx,
                        c.attributes,
                        elasticDoc,
                        c._id,
                        undefined,
                        pipeline.hierarchy,
                        true
                      )
                    })
                  }
                }
              }
            }
          }
          const spaceDoc = spaceDocs.get(
            (doc.attributes[docKey('space', { _class: doc.objectClass })] ?? doc.space) as Ref<DocIndexState>
          )

          await updateDocWithPresenter(pipeline.hierarchy, doc, elasticDoc, { parentDoc, spaceDoc }, this.branding)

          this.checkIntegrity(elasticDoc)
          bulk.push(elasticDoc)
        } catch (err: any) {
          Analytics.handleError(err)
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

      void pushQueue.add(async () => {
        try {
          try {
            await ctx.with('push-elastic', {}, async () => {
              await this.fulltextAdapter.updateMany(bulk)
            })
          } catch (err: any) {
            Analytics.handleError(err)
            // Try to push one by one
            await ctx.with('push-elastic-by-one', {}, async () => {
              for (const d of bulk) {
                try {
                  await this.fulltextAdapter.update(d.id, d)
                } catch (err2: any) {
                  Analytics.handleError(err2)
                }
              }
            })
          }
          if (!pipeline.cancelling) {
            for (const doc of toIndexPart) {
              await pipeline.update(doc._id, true, {})
            }
          }
        } catch (err: any) {
          Analytics.handleError(err)
        }
      })
    }
    await pushQueue.waitProcessing()
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
    _class: [upd.objectClass, ...(upd.mixins ?? [])],
    modifiedBy: upd.modifiedBy,
    modifiedOn: upd.modifiedOn,
    space: [upd.space],
    attachedTo: upd.attachedTo,
    attachedToClass: upd.attachedToClass
  }
  return doc
}
function updateDoc2Elastic (
  allAttrs: WeakMap<Class<Doc>, Map<string, AnyAttribute>>,
  ctx: MeasureContext,
  attributes: Record<string, any>,
  doc: IndexedDoc,
  docIdOverride?: Ref<DocIndexState>,
  refAttribute?: string,
  hierarchy?: Hierarchy,
  isChildOrParentDoc?: boolean
): void {
  for (const [k, v] of Object.entries(attributes)) {
    if (v == null) {
      continue
    }
    let { _class, attr, docId, extra, digest } = extractDocKey(k)
    if (attr.length === 0) {
      continue
    }

    let vv: any = v
    if (vv != null && extra.includes('base64')) {
      ctx.withSync('buffer-from', {}, () => {
        vv = Buffer.from(v, 'base64').toString()
      })
    }
    try {
      if (vv != null) {
        const cachedClass = _class ?? doc._class[0]
        if (hierarchy?.hasClass(cachedClass) ?? false) {
          const cl = hierarchy?.getClass(cachedClass) as Class<Doc>
          let attrs = cl !== undefined ? allAttrs.get(cl) : undefined

          if (attrs === undefined && cachedClass != null) {
            attrs = new Map()
            if (attrs !== undefined) {
              allAttrs.set(cl, attrs)
            }
          }
          const attribute = attrs?.get(attr) ?? hierarchy?.findAttribute(cachedClass, attr)
          if (attribute !== undefined && attrs !== undefined) {
            attrs.set(attr, attribute)
            allAttrs.set(cl, attrs)
          }
          if (attribute !== undefined) {
            if (
              isFullTextAttribute(attribute) ||
              (isChildOrParentDoc === true &&
                !(
                  attribute.type._class === core.class.RefTo ||
                  (attribute.type._class === core.class.ArrOf &&
                    (attribute.type as ArrOf<any>).of._class === core.class.RefTo)
                ))
            ) {
              let vvv = vv
              if (attribute.type._class === core.class.TypeMarkup) {
                ctx.withSync('markup-to-json-text', {}, () => {
                  vvv = jsonToText(markupToJSON(vv))
                })
              }
              if (!(doc.fulltextSummary ?? '').includes(vvv)) {
                doc.fulltextSummary = (doc.fulltextSummary ?? '') + vvv + '\n'
                continue
              }
            }
          }
        }
      }
    } catch (err: any) {
      Analytics.handleError(err)
    }

    docId = docIdOverride ?? docId
    if (docId === undefined) {
      if (typeof vv !== 'object' || isCustomAttr(k)) {
        doc[k] = vv
      }
      continue
    }
    const docIdAttr = docKey(attr, { _class, extra: extra.filter((it) => it !== 'base64'), digest })
    if (vv !== null) {
      // Since we replace array of values, we could ignore null
      doc[docIdAttr] =
        doc[docIdAttr] == null
          ? []
          : typeof doc[docIdAttr] === 'string' || !Array.isArray(doc[docIdAttr])
            ? [doc[docIdAttr]]
            : doc[docIdAttr]
      if (vv !== '') {
        if (typeof vv !== 'object') {
          doc[docIdAttr] = Array.from(new Set([...doc[docIdAttr], vv]))
        }
      }
    }
  }

  const spaceKey = docKey('space', { _class: core.class.Doc })
  if (doc[spaceKey] !== undefined) {
    const existingSpaces = Array.isArray(doc.space) ? doc.space : [doc.space]
    const newSpaces = Array.isArray(doc[spaceKey]) ? doc[spaceKey] : [doc[spaceKey]]
    doc.space = [...existingSpaces, ...newSpaces].filter((it, idx, arr) => arr.indexOf(it) === idx)
  }
}
