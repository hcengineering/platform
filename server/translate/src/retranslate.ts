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
  FullTextPipeline,
  IndexedDoc
} from '@hcengineering/server-core'

import got from 'got'
import { translateStateId, TranslationStage } from './types'

/**
 * @public
 */
export class LibRetranslateStage implements TranslationStage {
  require = [fieldStateId, contentStageId]
  stageId = translateStateId

  updateFields: DocUpdateHandler[] = []
  clearExcept: string[] = [fieldStateId, contentStageId, translateStateId]

  langExtra = 'en'

  limit = 100

  constructor (
    readonly metrics: MeasureContext,
    private readonly url: string,
    private readonly token: string,
    readonly workspaceId: WorkspaceId
  ) {}

  async search (
    _classes: Ref<Class<Doc>>[],
    query: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    return { docs: [], pass: true }
  }

  async update (doc: DocIndexState, update: DocumentUpdate<DocIndexState>, elastic: Partial<IndexedDoc>): Promise<void> {
    for (const [k] of Array.from(Object.keys(update))) {
      const { _class, attr, docId, extra } = extractDocKey(k)
      if (!extra.includes('en')) {
        // Fill translation document update request.
        ;(update as any)[docUpdKey(attr, { _class, docId, extra: [...extra, ''] })] = ''
      }
    }
  }

  async collect (toIndex: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
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
        const langResponse = await got.post(this.url + '/detect', {
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
                const translation = await got.post(this.url + '/translate', {
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
              const parentElasticUpdate: Partial<IndexedDoc> = {}

              ;(parentUpdate as any)[docUpdKey(attr, { _class, docId: doc._id, extra: [...extra, this.langExtra] })] =
                base64Content
              parentElasticUpdate[docKey(attr, { _class, docId: doc._id, extra: [...extra, ...this.langExtra] })] =
                base64Content

              await pipeline.update(doc.attachedTo as Ref<DocIndexState>, false, parentUpdate, parentElasticUpdate)
            }
          }
        }
      }
    } catch (err: any) {
      const wasError = doc.attributes.error !== undefined

      await pipeline.update(doc._id, false, { [docKey('error')]: JSON.stringify(err) }, {})
      if (wasError) {
        return
      }
      // Print error only first time, and update it in doc index
      console.error(err)
      return
    }

    await pipeline.update(doc._id, true, update, elasticUpdate, true)
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    // will be handled by field processor
  }
}
