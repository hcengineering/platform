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
  docUpdKey,
  extractDocKey,
  fieldStateId,
  FullTextPipeline,
  IndexedDoc,
  loadIndexStageStage
} from '@hcengineering/server-core'

import got from 'got'
import translatePlugin from './plugin'
import { translateStateId, TranslationStage } from './types'

/**
 * @public
 */
export class LibRetranslateStage implements TranslationStage {
  require = [fieldStateId, contentStageId]
  stageId = translateStateId

  updateFields: DocUpdateHandler[] = []

  langExtra = 'en'

  clearExcept?: string[] = undefined

  enabled = false

  token: string = ''
  endpoint: string = ''

  stageValue: boolean | string = true

  indexState?: IndexStageState

  constructor (readonly workspaceId: WorkspaceId) {}

  async initialize (storage: Storage, pipeline: FullTextPipeline): Promise<void> {
    // Just do nothing
    try {
      const config = await storage.findAll(translatePlugin.class.TranslateConfiguration, {})
      if (config.length > 0) {
        this.enabled = config[0].enabled
        this.token = config[0].token
        this.endpoint = config[0].endpoint
      } else {
        this.enabled = false
      }
    } catch (err: any) {
      console.error(err)
      this.enabled = false
    }

    ;[this.stageValue, this.indexState] = await loadIndexStageStage(storage, this.indexState, this.stageId, 'config', {
      enabled: this.enabled,
      endpoint: this.endpoint
    })
  }

  async search (
    _classes: Ref<Class<Doc>>[],
    query: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    return { docs: [], pass: true }
  }

  async update (doc: DocIndexState, update: DocumentUpdate<DocIndexState>): Promise<void> {
    for (const [k] of Array.from(Object.keys(update))) {
      const { _class, attr, docId, extra } = extractDocKey(k)
      if (!extra.includes('en')) {
        // Fill translation document update request.
        ;(update as any)[docUpdKey(attr, { _class, docId, extra: [...extra, ''] })] = ''
      }
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
      await this.retranslate(doc, pipeline)
    }
  }

  async isEnglish (text: string): Promise<boolean> {
    let english = false
    try {
      if (text.length > 0) {
        const langResponse = await got.post(this.endpoint + '/detect', {
          headers: {
            'Content-Type': 'application/json'
          },
          json: {
            q: text,
            api_key: this.token
          }
        })
        english = JSON.parse(langResponse.body).some((it: any) => it.language === 'en' && it.confidence * 100 > 90)
      }
    } catch (err: any) {
      // Coult not detect language
      // console.error(err)
    }
    return english
  }

  async retranslate (doc: DocIndexState, pipeline: FullTextPipeline): Promise<void> {
    // Copy content attributes as well.
    const update: DocumentUpdate<DocIndexState> = {}
    const elasticUpdate: Partial<IndexedDoc> = {}

    if (pipeline.cancelling) {
      return
    }
    try {
      for (const [attrKey, v] of Object.entries(doc.attributes)) {
        if (pipeline.cancelling) {
          return
        }
        const { _class, attr, docId, extra } = extractDocKey(attrKey)

        // Translate only non english value and non child value.
        if (!extra.includes(this.langExtra) && docId === undefined) {
          const enContent = doc.attributes[`${docKey(attr, { _class, docId })}`]

          let sourceContent = v as string
          if (extra.includes('base64')) {
            sourceContent = Buffer.from(sourceContent, 'base64').toString()
          }

          // If value is cleared
          if (enContent === undefined || enContent === '') {
            let toTranslate = `${sourceContent}\n`
            // Remove extra spaces and extra new lines.
            toTranslate = toTranslate
              .split(/ |\t|\f/)
              .filter((it) => it)
              .join(' ')
              .split(/\n+/)
              .join('\n')

            let english = false
            try {
              if (toTranslate.length > 0) {
                english = await this.isEnglish(toTranslate)
              }
            } catch (err: any) {
              // Coult not detect language
              console.error(err)
            }

            let translatedText = ''
            if (!english) {
              try {
                const st = Date.now()
                console.log('retranslate:begin: ', doc._id, attr)
                const translation = await got.post(this.endpoint + '/translate', {
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  json: {
                    q: toTranslate,
                    source: 'auto',
                    target: 'en',
                    format: 'text',
                    api_key: this.token
                  }
                })

                const response: any = JSON.parse(translation.body)
                console.log('retranslate:', doc._id, attr, Date.now() - st, response.translatedText.length)
                translatedText = response.translatedText
              } catch (err: any) {
                console.error(err)
              }
            } else {
              translatedText = ''
              console.log('retranslate: Not required', doc._id, attr)
            }
            const base64Content = Buffer.from(translatedText).toString('base64')
            ;(update as any)[`${docUpdKey(attr, { _class, extra: [...extra, this.langExtra] })}`] = base64Content
            elasticUpdate[`${docKey(attr, { _class, extra: [...extra, this.langExtra] })}`] = base64Content

            if (doc.attachedTo != null) {
              const parentUpdate: DocumentUpdate<DocIndexState> = {}

              ;(parentUpdate as any)[docUpdKey(attr, { _class, docId: doc._id, extra: [...extra, this.langExtra] })] =
                base64Content

              await pipeline.update(doc.attachedTo as Ref<DocIndexState>, false, parentUpdate)
            }
          }
        }
      }
    } catch (err: any) {
      const wasError = doc.attributes.error !== undefined

      await pipeline.update(doc._id, false, { [docKey('error')]: JSON.stringify(err) })
      if (wasError) {
        return
      }
      // Print error only first time, and update it in doc index
      console.error(err)
      return
    }

    await pipeline.update(doc._id, this.stageValue, update, true)
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    // will be handled by field processor
    for (const doc of docs) {
      await pipeline.update(doc._id, this.stageValue, {})
    }
  }
}
