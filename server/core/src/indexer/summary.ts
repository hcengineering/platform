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
  docUpdKey,
  extractDocKey,
  FullTextSearchContext,
  Hierarchy,
  isFullTextAttribute,
  Ref,
  Storage
} from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import { IndexedDoc } from '../types'
import { contentStageId, DocUpdateHandler, fieldStateId, FullTextPipeline, FullTextPipelineStage } from './types'
import { convert } from 'html-to-text'

/**
 * @public
 */
export const summaryStageId = 'sum-v1_1'

/**
 * @public
 */
export class FullSummaryStage implements FullTextPipelineStage {
  require = [fieldStateId, contentStageId]
  stageId = summaryStageId

  enabled = true

  clearExcept?: string[] = undefined

  updateFields: DocUpdateHandler[] = []

  // If specified, index only fields with content speciffied.
  matchExtra: string[] = [] // 'content', 'base64'] // '#en'

  summaryField = 'summary'

  fieldFilter: ((attr: AnyAttribute, value: string) => boolean)[] = []

  async initialize (storage: Storage, pipeline: FullTextPipeline): Promise<void> {}

  async search (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size?: number,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    return { docs: [], pass: true }
  }

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    for (const doc of toIndex) {
      if (pipeline.cancelling) {
        return
      }

      const needIndex = isIndexingRequired(pipeline, doc)

      // No need to index this class, mark embeddings as empty ones.
      if (!needIndex) {
        await pipeline.update(doc._id, true, {})
        continue
      }

      const update: DocumentUpdate<DocIndexState> = {}

      const embeddingText = await extractIndexedValues(doc, pipeline.hierarchy, {
        matchExtra: this.matchExtra,
        fieldFilter: this.fieldFilter
      })
      ;(update as any)[docUpdKey(this.summaryField)] = embeddingText

      await pipeline.update(doc._id, true, update)
    }
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    // will be handled by field processor
    for (const doc of docs) {
      await pipeline.update(doc._id, true, {})
    }
  }
}

/**
 * @public
 */
export function isIndexingRequired (pipeline: FullTextPipeline, doc: DocIndexState): boolean {
  let objClass = pipeline.hierarchy.getClass(doc.objectClass)

  let needIndex = false
  while (true) {
    if (pipeline.hierarchy.hasMixin(objClass, core.mixin.FullTextSearchContext)) {
      needIndex = pipeline.hierarchy.as<Class<Doc>, FullTextSearchContext>(
        objClass,
        core.mixin.FullTextSearchContext
      ).fullTextSummary
      break
    }
    if (objClass.extends === undefined) {
      break
    }
    objClass = pipeline.hierarchy.getClass(objClass.extends)
  }
  return needIndex
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
    try {
      const { _class, attr, extra, docId } = extractDocKey(k)

      let sourceContent = `${v as string}`.trim()
      if (extra.includes('base64')) {
        sourceContent = Buffer.from(sourceContent, 'base64').toString().trim()
      }
      if (sourceContent.length === 0) {
        continue
      }

      if (_class === undefined) {
        // Skip all helper fields.
        continue
      }

      if (!opt.matchExtra.every((it) => extra.includes(it))) {
        continue
      }
      // Check if attribute is indexable
      let keyAttr: AnyAttribute
      try {
        keyAttr = hierarchy.getAttribute(_class, attr)
      } catch (err: any) {
        // Skip if there is no attribute.
        continue
      }

      if (keyAttr.type._class === core.class.TypeMarkup) {
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
