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
  Class,
  Doc,
  DocIndexState,
  DocumentQuery,
  DocumentUpdate,
  extractDocKey,
  Hierarchy,
  IndexStageState,
  isFullTextAttribute,
  MeasureContext,
  Ref,
  ServerStorage,
  Storage
} from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import { convert } from 'html-to-text'
import { IndexedDoc } from '../types'
import { contentStageId, DocUpdateHandler, fieldStateId, FullTextPipeline, FullTextPipelineStage } from './types'
import {
  collectPropagate,
  collectPropagateClasses,
  getFullTextContext,
  loadIndexStageStage,
  isCustomAttr
} from './utils'

/**
 * @public
 */
export const summaryStageId = 'sum-v5'

/**
 * @public
 */
export class FullSummaryStage implements FullTextPipelineStage {
  require = [fieldStateId, contentStageId]
  stageId = summaryStageId

  enabled = true

  clearExcept?: string[] = undefined

  updateFields: DocUpdateHandler[] = []

  // If specified, index only fields with content specified.
  matchExtra: string[] = [] // 'content', 'base64'] // '#en'

  fieldFilter: ((attr: AnyAttribute, value: string) => boolean)[] = []

  stageValue: boolean | string = true

  indexState?: IndexStageState

  // Summary should be not a bigger what 1mb of data.
  summaryLimit = 1024 * 1024

  constructor (private readonly dbStorage: ServerStorage) {}

  async initialize (storage: Storage, pipeline: FullTextPipeline): Promise<void> {
    const indexable = (
      await pipeline.model.findAll(core.class.Class, { [core.mixin.FullTextSearchContext]: { $exists: true } })
    )
      .map((it) => pipeline.hierarchy.as(it, core.mixin.FullTextSearchContext))
      .filter((it) => it.fullTextSummary)
      .map((it) => it._id + (it.propagateClasses ?? []).join('|'))
    indexable.sort()
    ;[this.stageValue, this.indexState] = await loadIndexStageStage(storage, this.indexState, this.stageId, 'config', {
      classes: indexable,
      matchExtra: this.matchExtra
    })
  }

  async search (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size?: number,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    return { docs: [], pass: true }
  }

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline, metrics: MeasureContext): Promise<void> {
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

        const needIndex = isIndexingRequired(pipeline, doc)

        // No need to index this class, mark embeddings as empty ones.
        if (!needIndex) {
          await pipeline.update(doc._id, this.stageValue, {})
          continue
        }

        const update: DocumentUpdate<DocIndexState> = {}

        let embeddingText = await extractIndexedValues(doc, pipeline.hierarchy, {
          matchExtra: this.matchExtra,
          fieldFilter: this.fieldFilter
        })

        // Include all child attributes
        const childDocs = allChildDocs.filter((it) => it.attachedTo === doc._id)
        if (childDocs.length > 0) {
          for (const c of childDocs) {
            const ctx = getFullTextContext(pipeline.hierarchy, c.objectClass)
            if (ctx.parentPropagate ?? true) {
              if (embeddingText.length > this.summaryLimit) {
                break
              }
              embeddingText +=
                '\n' +
                (await extractIndexedValues(c, pipeline.hierarchy, {
                  matchExtra: this.matchExtra,
                  fieldFilter: this.fieldFilter
                }))
            }
          }
        }

        if (doc.attachedToClass != null && doc.attachedTo != null) {
          const propagate: Ref<Class<Doc>>[] = collectPropagate(pipeline, doc.attachedToClass)
          if (propagate.some((it) => pipeline.hierarchy.isDerived(doc.objectClass, it))) {
            // We need to include all parent content into this one.
            const [parentDoc] = await this.dbStorage.findAll(
              metrics.newChild('propagate', {}),
              core.class.DocIndexState,
              { _id: doc.attachedTo as Ref<DocIndexState> }
            )
            if (parentDoc !== undefined) {
              const ctx = collectPropagateClasses(pipeline, parentDoc.objectClass)
              if (ctx.length > 0) {
                for (const p of ctx) {
                  const collections = await this.dbStorage.findAll(
                    metrics.newChild('propagate', {}),
                    core.class.DocIndexState,
                    { attachedTo: parentDoc._id, objectClass: p }
                  )
                  for (const c of collections) {
                    embeddingText +=
                      '\n' +
                      (await extractIndexedValues(c, pipeline.hierarchy, {
                        matchExtra: this.matchExtra,
                        fieldFilter: this.fieldFilter
                      }))
                  }
                }
              }

              if (embeddingText.length > this.summaryLimit) {
                break
              }
              embeddingText +=
                '\n' +
                (await extractIndexedValues(parentDoc, pipeline.hierarchy, {
                  matchExtra: this.matchExtra,
                  fieldFilter: this.fieldFilter
                }))
            }
          }
        }

        update.fullSummary = embeddingText

        await pipeline.update(doc._id, this.stageValue, update)
      }
    }
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    // will be handled by field processor
    for (const doc of docs) {
      await pipeline.update(doc._id, this.stageValue, {})
    }
  }
}

/**
 * @public
 */
export function isIndexingRequired (pipeline: FullTextPipeline, doc: DocIndexState): boolean {
  return getFullTextContext(pipeline.hierarchy, doc.objectClass).fullTextSummary ?? false
}

/**
 * @public
 */
export async function extractIndexedValues (
  doc: DocIndexState,
  hierarchy: Hierarchy,
  opt: {
    matchExtra: string[]
    fieldFilter: ((attr: AnyAttribute, value: string) => boolean)[]
  }
): Promise<string> {
  const attributes: Record<Ref<Class<Doc>>, Record<string, string>> = {}
  const childAttributes: Record<Ref<Class<Doc>>, Record<string, string>> = {}
  const currentReplacement: Record<string, string> = {}

  for (const [k, v] of Object.entries(doc.attributes)) {
    if (v == null) {
      continue
    }
    try {
      const { _class, attr, extra, docId } = extractDocKey(k)
      if (docId !== undefined) {
        continue
      }

      let sourceContent = `${v as string}`.trim()
      if (extra.includes('base64')) {
        sourceContent = Buffer.from(sourceContent, 'base64').toString().trim()
      }
      if (sourceContent.length === 0) {
        continue
      }

      if (isCustomAttr(attr)) {
        const str = v
          .map((pair: { label: string, value: string }) => {
            return `${pair.label} is ${pair.value}`
          })
          .join(' ')
        const cl = doc.objectClass
        attributes[cl] = { ...attributes[cl], [k]: str }
      }

      if (_class === undefined) {
        // Skip all helper fields.
        continue
      }

      if (!opt.matchExtra.every((it) => extra.includes(it))) {
        continue
      }
      // Check if attribute is indexable
      const keyAttr: AnyAttribute | undefined = hierarchy.findAttribute(_class, attr)
      if (keyAttr === undefined) {
        // Skip if there is no attribute.
        continue
      }

      if (keyAttr.type._class === core.class.TypeMarkup || keyAttr.type._class === core.class.TypeCollaborativeMarkup) {
        sourceContent = convert(sourceContent, {
          preserveNewlines: true,
          selectors: [{ selector: 'img', format: 'skip' }]
        })
      }

      if (!opt.fieldFilter.every((it) => it(keyAttr, sourceContent))) {
        // Some of filters not pass value
        continue
      }

      if (!isFullTextAttribute(keyAttr)) {
        continue
      }
      if (keyAttr.type._class === core.class.TypeAttachment && extra.length === 0) {
        // Skip attachment id values.
        continue
      }

      const repl = extra.join('#')

      if ((currentReplacement[attr] ?? '').length <= repl.length) {
        const label = await translate(keyAttr.label, {})
        const cl = _class ?? doc.objectClass

        if (docId === undefined) {
          attributes[cl] = { ...attributes[cl], [k]: `${label} is ${sourceContent}\n` }
        } else {
          childAttributes[cl] = { ...childAttributes[cl], [k]: sourceContent }
        }
        currentReplacement[attr] = repl
      }
    } catch (err: any) {
      console.log(err)
    }
  }
  let embeddingText = ''

  for (const [, vv] of Object.entries(attributes)) {
    embeddingText += '\n'
    for (const [, v] of Object.entries(vv)) {
      // Check if attribute is text one.
      embeddingText += ' ' + v + '\n'
    }
  }

  // Extra child attributes
  for (const [, vv] of Object.entries(childAttributes)) {
    for (const [, v] of Object.entries(vv)) {
      // Check if attribute is text one.
      embeddingText += ' ' + v + '\n'
    }
  }

  // Trim empty inner space.
  embeddingText = (embeddingText ?? '')
    .split(/  +|\t+/)
    .filter((it) => it)
    .join(' ')
  embeddingText = (embeddingText ?? '')
    .split(/\n\n+/)
    .filter((it) => it)
    .join('\n\n')
  return embeddingText.trim()
}
