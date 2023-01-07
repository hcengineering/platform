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
  AISearchContext,
  Class,
  Doc,
  DocIndexState,
  DocumentQuery,
  DocumentUpdate,
  Hierarchy,
  MeasureContext,
  Ref,
  WorkspaceId
} from '@hcengineering/core'
import {
  contentStageId,
  docKey,
  DocUpdateHandler,
  docUpdKey,
  extractDocKey,
  fieldStateId,
  FullTextAdapter,
  FullTextPipeline,
  FullTextPipelineStage,
  IndexedDoc,
  isFullTextAttribute
} from '@hcengineering/server-core'

import got from 'got'

import { decode, encode } from './encoder/encoder'

/**
 * @public
 */
export const openAIstage = 'emb-v1'

/**
 * @public
 */
export class OpenAIEmbeddingsStage implements FullTextPipelineStage {
  require = [fieldStateId, contentStageId]
  stageId = openAIstage

  treshold = 50

  unauthorized = false

  field = 'openai_embedding'
  field_enabled = 'openai_embedding_use'
  limit = 100

  fieldInit: Promise<void> | undefined

  clearExcept: string[] = [fieldStateId, contentStageId, openAIstage]
  updateFields: DocUpdateHandler[] = []

  model = 'text-embedding-ada-002'

  // If specified, index only fields with content speciffied.
  matchExtra = [] // 'content', 'base64'] // '#en'
  index = 0

  emptyValue = Array.from(Array(1536).keys()).map((it) => 0)

  tokenLimit = 8191 + 2456

  async update (doc: DocIndexState, update: DocumentUpdate<DocIndexState>, elastic: Partial<IndexedDoc>): Promise<void> {
    ;(update as any)[docUpdKey(this.field)] = []
    ;(elastic as any)[docKey(this.field)] = this.emptyValue
    ;(elastic as any)[docKey(this.field_enabled)] = false
  }

  constructor (
    readonly adapter: FullTextAdapter,
    readonly metrics: MeasureContext,
    private readonly token: string,
    readonly workspaceId: WorkspaceId
  ) {
    this.fieldInit = adapter.initMapping(this.field, 1536)
    if (this.token === '') {
      // Change stage in case of token is empty, to force reindex if enabled.
      this.stageId += '%'
    }
  }

  async search (
    _classes: Ref<Class<Doc>>[],
    query: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    if (this.token === '') {
      return {
        docs: [],
        pass: true
      }
    }
    await this.fieldInit
    if (query.$search === undefined) return { docs: [], pass: true }
    const embeddingData = await got.post('https://api.openai.com/v1/embeddings', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      json: {
        input: query.$search,
        model: 'text-embedding-ada-002'
      }
    })
    const jsonData = JSON.parse(embeddingData.body)
    const embedding = jsonData.data[0].embedding
    console.log('search embedding', embedding)
    const docs = await this.adapter.searchEmbedding(_classes, query, embedding, {
      size,
      from,
      minScore: 0,
      embeddingBoost: 100,
      field: this.field,
      field_enable: this.field_enabled,
      fulltextBoost: 1
    })
    return {
      docs,
      pass: docs.length === 0
    }
  }

  limitTokens (text: string): string {
    const tokens = encode(text)

    let assumption = ''
    if (tokens.length > this.tokenLimit) {
      assumption = decode(tokens.slice(0, this.tokenLimit))
      text = text.slice(0, assumption.length)
    }
    return text
  }

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    await this.fieldInit
    for (const doc of toIndex) {
      if (pipeline.cancelling) {
        return
      }
      const needIndex = isIndexingRequired(pipeline, doc)

      // Copy content attributes as well.
      const update: DocumentUpdate<DocIndexState> = {}
      const elasticUpdate: Partial<IndexedDoc> = {}

      if (!needIndex) {
        // No need to index this class.
        ;(update as any)[docUpdKey(this.field)] = []
        elasticUpdate[docKey(this.field)] = this.emptyValue

        await pipeline.update(doc._id, true, {}, {})
        continue
      }

      if (this.token === '') {
        // No token, just do nothing.
        await pipeline.update(doc._id, true, {}, {})
        continue
      }

      try {
        if (this.unauthorized) {
          continue
        }
        const embeddingText = await this.extractIndexedValues(doc, pipeline.hierarchy)

        if (embeddingText.length > this.treshold) {
          let embeddText = embeddingText
          console.log('calculate embeddings:', doc.objectClass, doc._id)
          let jsonData: any
          const shrink = false
          while (true) {
            try {
              const embeddingData = await this.metrics.with(
                'fetch-embeddings',
                {},
                async () =>
                  await got.post('https://api.openai.com/v1/embeddings', {
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${this.token}`
                    },
                    json: {
                      input: embeddText,
                      model: this.model
                    }
                  })
              )
              jsonData = JSON.parse(embeddingData.body)
              break
            } catch (err: any) {
              if (err.message === 'Response code 429 (Too Many Requests)') {
                await new Promise((resolve) => setTimeout(resolve, 1000))
                continue
              }
              if (!shrink) {
                try {
                  embeddText = this.limitTokens(embeddText)
                } catch (err: any) {
                  console.error(err)
                }
              }
              throw new Error(err)
            }
          }

          const embedding: number[] = jsonData.data[0].embedding
          ;(update as any)[docUpdKey(this.field)] = embedding
          ;(update as any)[docUpdKey(this.field + '_model')] = this.model
          ;(update as any)[docUpdKey(this.field + '_prompt_tokens')] = jsonData.usage.prompt_tokens
          ;(update as any)[docUpdKey(this.field + '_total_tokens')] = jsonData.usage.total_tokens
          elasticUpdate[docKey(this.field)] = embedding
          if (embedding.length > 0) {
            ;(update as any)[docUpdKey(this.field_enabled)] = true
            elasticUpdate[docKey(this.field_enabled)] = true
          }
        }
      } catch (err: any) {
        if (err.message === 'Response code 401 (Unauthorized)') {
          this.unauthorized = true
        }
        const wasError = doc.attributes.error !== undefined

        await pipeline.update(doc._id, false, { [docKey('error')]: JSON.stringify(err) }, {})
        if (wasError) {
          continue
        }
        // Print error only first time, and update it in doc index
        console.error(err)
        continue
      }

      // We need to collect all fields and prepare embedding document.

      await pipeline.update(doc._id, true, update, elasticUpdate, true)
    }
  }

  /**
   * @public
   */
  async extractIndexedValues (doc: DocIndexState, hierarchy: Hierarchy): Promise<string> {
    const attributes: Record<string, string> = {}
    const currentReplacement: Record<string, string> = {}

    for (const [k, v] of Object.entries(doc.attributes)) {
      try {
        const { _class, attr, extra } = extractDocKey(k)

        let sourceContent = v as string
        if (extra.includes('base64')) {
          sourceContent = Buffer.from(sourceContent, 'base64').toString()
        }

        if (_class === undefined) {
          // Skip all helper fields.
          continue
        }
        // if (!(await isEnglish(v))) {
        //   continue
        // }
        if (!this.matchExtra.every((it) => extra.includes(it))) {
          continue
        }
        // Check if attribute is indexable
        const keyAttr = hierarchy.getAttribute(_class, attr)
        if (!isFullTextAttribute(keyAttr)) {
          continue
        }

        const repl = extra.join('#')

        if ((currentReplacement[attr] ?? '').length <= repl.length) {
          attributes[k] = sourceContent
          currentReplacement[attr] = repl
        }
      } catch (err: any) {
        console.log(err)
      }
    }
    let embeddingText = ''
    for (const [, v] of Object.entries(attributes)) {
      // Check if attribute is text one.
      embeddingText += v
    }

    // Trim empty inner space.
    embeddingText = (embeddingText ?? '')
      .split(/ +|\n+|\t+/)
      .filter((it) => it)
      .join(' ')
    return embeddingText
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    // will be handled by field processor
  }
}

/**
 * @public
 */
export function isIndexingRequired (pipeline: FullTextPipeline, doc: DocIndexState): boolean {
  let objClass = pipeline.hierarchy.getClass(doc.objectClass)

  let needIndex = false
  while (true) {
    if (pipeline.hierarchy.hasMixin(objClass, core.mixin.AISearchContext)) {
      needIndex = pipeline.hierarchy.as<Class<Doc>, AISearchContext>(objClass, core.mixin.AISearchContext).index
      break
    }
    if (objClass.extends === undefined) {
      break
    }
    objClass = pipeline.hierarchy.getClass(objClass.extends)
  }
  return needIndex
}
