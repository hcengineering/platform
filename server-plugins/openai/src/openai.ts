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
  Class,
  Doc,
  DocIndexState,
  DocumentQuery,
  DocumentUpdate,
  docUpdKey,
  IndexStageState,
  MeasureContext,
  Ref,
  Storage,
  WorkspaceId
} from '@hcengineering/core'
import {
  contentStageId,
  docKey,
  DocUpdateHandler,
  fieldStateId,
  FullSummaryStage,
  FullTextAdapter,
  FullTextPipeline,
  FullTextPipelineStage,
  IndexedDoc,
  isIndexingRequired,
  loadIndexStageStage,
  RateLimitter
} from '@hcengineering/server-core'

import got from 'got'

import { chunks } from './encoder/encoder'
import openaiPlugin, { openAIRatelimitter } from './plugin'

/**
 * @public
 */
export const openAIstage = 'emb-v5'

/**
 * @public
 */
export interface OpenAIEmbeddingResponse {
  data: {
    embedding: number[]
  }[]
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

/**
 * @public
 */
export class OpenAIEmbeddingsStage implements FullTextPipelineStage {
  require = [fieldStateId, contentStageId]
  stageId = openAIstage

  treshold = 50

  unauthorized = false

  field = 'openai_embedding'
  field_enabled = '_use'

  enabled = false

  clearExcept?: string[] = undefined
  updateFields: DocUpdateHandler[] = []

  copyToState = true

  model = 'text-embedding-ada-002'

  tokenLimit = 8191

  endpoint = 'https://api.openai.com/v1/embeddings'
  token = ''

  rate = 5

  stageValue: boolean | string = true

  limitter = new RateLimitter(() => ({ rate: this.rate }))

  indexState?: IndexStageState

  async update (doc: DocIndexState, update: DocumentUpdate<DocIndexState>): Promise<void> {}

  constructor (readonly adapter: FullTextAdapter, readonly workspaceId: WorkspaceId) {}

  updateSummary (summary: FullSummaryStage): void {
    summary.fieldFilter.push((attr, value) => {
      const tMarkup = attr.type._class === core.class.TypeMarkup
      const lowerCase: string = value.toLocaleLowerCase()
      if (tMarkup && (lowerCase.includes('gpt:') || lowerCase.includes('gpt Answer:'))) {
        return false
      }
      return true
    })
  }

  async initialize (storage: Storage, pipeline: FullTextPipeline): Promise<void> {
    try {
      // Just do nothing
      const config = await storage.findAll(openaiPlugin.class.OpenAIConfiguration, {})
      let needCheck = 0
      if (config.length > 0) {
        if (this.enabled !== config[0].embeddings) {
          needCheck++
          this.enabled = config[0].embeddings
        }
        if (this.token !== config[0].token) {
          this.token = config[0].token
          needCheck++
        }
        const ep = (config[0].endpoint + '/embeddings').replace('//', '/')
        if (this.endpoint !== ep) {
          this.endpoint = ep
          needCheck++
        }
        if (this.tokenLimit !== config[0].tokenLimit) {
          this.tokenLimit = config[0].tokenLimit
          needCheck++
        }
      } else {
        this.enabled = false
      }

      if (needCheck > 0 && this.enabled) {
        // Initialize field embedding
        const emb = await this.getEmbedding('dummy')
        const dim = emb.data[0].embedding.length
        this.field = `${this.field}_${dim}`
        this.field_enabled = this.field + this.field_enabled

        await this.adapter.initMapping({ key: this.field, dims: dim })
      }
    } catch (err: any) {
      console.error(err)
      this.enabled = false
    }

    ;[this.stageValue, this.indexState] = await loadIndexStageStage(storage, this.indexState, this.stageId, 'config', {
      enabled: this.enabled,
      endpoint: this.endpoint,
      field: this.field,
      mode: this.model,
      copyToState: this.copyToState,
      stripNewLines: true
    })
  }

  async getEmbedding (text: string): Promise<OpenAIEmbeddingResponse> {
    if (this.token === '') {
      return {
        data: [
          {
            embedding: []
          }
        ],
        usage: {
          total_tokens: 0,
          prompt_tokens: 0
        }
      }
    }
    let l = this.tokenLimit
    let response: OpenAIEmbeddingResponse | undefined
    while (true) {
      const chs = chunks(text, l)
      let chunkChange = false
      for (const c of chs) {
        try {
          const embeddingData = await openAIRatelimitter.exec(
            async () =>
              await got.post(this.endpoint, {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${this.token}`
                },
                json: {
                  input: c,
                  model: this.model
                },
                timeout: 15000
              })
          )
          const res = JSON.parse(embeddingData.body) as OpenAIEmbeddingResponse
          if (response === undefined) {
            response = res
          } else {
            // Combine parts
            response.data[0].embedding = response.data[0].embedding.map((it, idx) => it + res.data[0].embedding[idx])
            response.usage.prompt_tokens += res.usage.prompt_tokens
            response.usage.total_tokens += res.usage.total_tokens
          }
        } catch (err: any) {
          const msg = (err.message ?? '') as string
          if (msg.includes('maximum context length is')) {
            // We need to split chunks and try again.
            l = l / 2
            chunkChange = true
            response = undefined
            break
          }
          throw err
        }
      }
      if (chunkChange) {
        continue
      }
      break
    }
    if (response === undefined) {
      throw new Error('Failed to retrieve embedding')
    }
    return response
  }

  async search (
    _classes: Ref<Class<Doc>>[],
    query: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    if (this.token === '' || !this.enabled) {
      return {
        docs: [],
        pass: true
      }
    }
    if (query.$search === undefined) return { docs: [], pass: true }
    const queryString = query.$search.replace('\n ', ' ')
    const embeddingData = await this.getEmbedding(queryString)
    const embedding = embeddingData.data[0].embedding
    const docs = await this.adapter.searchEmbedding(_classes, query, embedding, {
      size,
      from,
      minScore: -9,
      embeddingBoost: 10,
      field: this.field,
      field_enable: this.field_enabled,
      fulltextBoost: 1
    })
    return {
      docs,
      pass: docs.length === 0
    }
  }

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline, metrics: MeasureContext): Promise<void> {
    if (!this.enabled) {
      return
    }
    for (const doc of toIndex) {
      if (pipeline.cancelling) {
        return
      }
      await this.limitter.add(() => this.collectDoc(doc, pipeline, metrics))
    }
    await this.limitter.waitProcessing()
  }

  async collectDoc (doc: DocIndexState, pipeline: FullTextPipeline, metrics: MeasureContext): Promise<void> {
    if (pipeline.cancelling) {
      return
    }
    const needIndex = isIndexingRequired(pipeline, doc)

    // Copy content attributes as well.
    const update: DocumentUpdate<DocIndexState> = {}

    // Mark as empty by default and matck dimm size for elastic
    await this.update(doc, update)

    // No need to index this class, mark embeddings as empty ones.
    if (!needIndex) {
      await pipeline.update(doc._id, this.stageValue, {})
      return
    }

    try {
      if (this.unauthorized) {
        return
      }
      const embeddingText = doc.fullSummary ?? ''

      if (embeddingText.length > this.treshold) {
        //  replace newlines, which can negatively affect performance. Based on OpenAI examples.
        const embeddText = embeddingText.replace('\n ', ' ')

        console.log('calculate embeddings:', doc.objectClass, doc._id)

        let embeddingData: OpenAIEmbeddingResponse | undefined
        while (true) {
          try {
            embeddingData = await metrics.with('fetch-embeddings', {}, async () => await this.getEmbedding(embeddText))
            break
          } catch (err: any) {
            if (((err.message as string) ?? '').includes('connect ECONNREFUSED')) {
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
            if (err.message === 'Response code 429 (Too Many Requests)') {
              await new Promise((resolve) => setTimeout(resolve, 1000))
              continue
            }
            throw new Error(err)
          }
        }

        const embedding: number[] = embeddingData.data[0].embedding

        await this.adapter.update(doc._id, {
          [this.field]: embedding,
          [this.field_enabled]: true
        })
        if (this.copyToState) {
          ;(update as any)[docUpdKey(this.field)] = embedding
        } else {
          ;(update as any)[docUpdKey(this.field)] = embedding.length
        }
        ;(update as any)[docUpdKey(this.field_enabled)] = true
      }
    } catch (err: any) {
      if (err.message === 'Response code 401 (Unauthorized)') {
        this.unauthorized = true
      }
      const wasError = doc.attributes.error !== undefined

      await pipeline.update(doc._id, false, { [docKey('error')]: JSON.stringify(err) })
      if (wasError) {
        return
      }
      // Print error only first time, and update it in doc index
      console.error(err)
    }

    await pipeline.update(doc._id, this.stageValue, update)
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    // will be handled by field processor
    for (const doc of docs) {
      await pipeline.update(doc._id, this.stageValue, {})
    }
  }
}
