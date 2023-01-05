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
  ServerStorage
} from '@hcengineering/core'
import { IndexedDoc } from '../types'
import {
  contentStageId,
  DocUpdateHandler,
  fieldStateId as fieldStageId,
  FullTextPipeline,
  FullTextPipelineStage
} from './types'
import { docKey, docUpdKey, getContent, getFullTextAttributes, isFullTextAttribute } from './utils'

/**
 * @public
 */
export class IndexedFieldStage implements FullTextPipelineStage {
  require = []
  stageId = fieldStageId
  clearExcept: string[] = [fieldStageId, contentStageId]

  clearField: string[] = []

  updateFields: DocUpdateHandler[] = []

  limit = 1000

  constructor (readonly dbStorage: ServerStorage, readonly metrics: MeasureContext) {}

  async search (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    return { docs: [], pass: true }
  }

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    const byClass = toIndex.reduce<Record<Ref<Class<Doc>>, DocIndexState[]>>((p, c) => {
      p[c.objectClass] = [...(p[c.objectClass] ?? []), c]
      return p
    }, {})

    const processed: Set<Ref<DocIndexState>> = new Set()

    for (const [v, values] of Object.entries(byClass)) {
      // Obtain real documents
      const valueIds = new Map(values.map((it) => [it._id, it]))
      const objClass = v as Ref<Class<Doc>>
      const docs = await this.dbStorage.findAll(this.metrics, objClass, {
        _id: { $in: Array.from(valueIds.keys()) }
      })
      const attributes = getFullTextAttributes(pipeline.hierarchy, objClass)

      for (const doc of docs) {
        if (pipeline.cancelling) {
          return
        }
        processed.add(doc._id as Ref<DocIndexState>)
        const docState = valueIds.get(doc._id as Ref<DocIndexState>) as DocIndexState

        try {
          // Copy content attributes as well.
          const content = getContent(pipeline.hierarchy, attributes, doc)

          const docUpdate: DocumentUpdate<DocIndexState> = {}
          const elasticUpdate: Partial<IndexedDoc> = {}

          const parentDocUpdate: DocumentUpdate<DocIndexState> = {}
          const parentDocElasticUpdate: Partial<IndexedDoc> = {}

          for (const [, v] of Object.entries(content)) {
            // Check for content changes and collect update
            const dKey = docKey(v.attr.name, { _class: v.attr.attributeOf })
            const dUKey = docUpdKey(v.attr.name, { _class: v.attr.attributeOf })
            if (docState.attributes[dKey] !== v.value) {
              ;(docUpdate as any)[dUKey] = v.value
              elasticUpdate[dKey] = v.value

              // Aswell I need to update my parent with my attributes.
              if (docState.attachedTo != null) {
                ;(parentDocUpdate as any)[docUpdKey(v.attr.name, { _class: v.attr.attributeOf, docId: docState._id })] =
                  v.value
                ;(parentDocElasticUpdate as any)[
                  docKey(v.attr.name, { _class: v.attr.attributeOf, docId: docState._id })
                ] = v.value
              }
            }
          }
          if (docState.attachedTo != null) {
            // We need to clear field stage from parent, so it will be re indexed.
            await pipeline.update(
              docState.attachedTo as Ref<DocIndexState>,
              false,
              parentDocUpdate,
              parentDocElasticUpdate
            )
          }
          await pipeline.update(docState._id, true, docUpdate, elasticUpdate)
        } catch (err: any) {
          console.error(err)
          continue
        }
      }
    }
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    for (const doc of docs) {
      if (doc.attachedTo !== undefined) {
        const attachedTo = doc.attachedTo as Ref<DocIndexState>
        const parentDocUpdate: DocumentUpdate<DocIndexState> = {}
        const parentDocElasticUpdate: Partial<IndexedDoc> = {}

        for (const [k] of Object.entries(doc.attributes)) {
          const { _class, attr, extra, docId } = extractDocKey(k)

          if (_class !== undefined && docId === undefined) {
            const keyAttr = pipeline.hierarchy.getAttribute(_class, attr)
            if (isFullTextAttribute(keyAttr)) {
              ;(parentDocUpdate as any)[docUpdKey(attr, { _class, docId: doc._id, extra })] = null
              ;(parentDocElasticUpdate as any)[docKey(attr, { _class, docId: doc._id, extra })] = null
            }
          }
        }

        if (Object.keys(parentDocUpdate).length > 0) {
          await pipeline.update(attachedTo, false, parentDocUpdate, parentDocElasticUpdate)
        }
      }
    }
  }
}
