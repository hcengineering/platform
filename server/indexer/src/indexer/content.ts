//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  getFullTextIndexableAttributes,
  type Blob,
  type Class,
  type Doc,
  type DocIndexState,
  type DocumentQuery,
  type DocumentUpdate,
  type MeasureContext,
  type Ref,
  type WorkspaceId
} from '@hcengineering/core'
import {
  type ContentTextAdapter,
  type DbAdapter,
  type IndexedDoc,
  type StorageAdapter
} from '@hcengineering/server-core'
import {
  contentStageId,
  fieldStateId,
  type DocUpdateHandler,
  type FullTextPipeline,
  type FullTextPipelineStage
} from './types'
import { docKey, docUpdKey } from './utils'
/**
 * @public
 */
export class ContentRetrievalStage implements FullTextPipelineStage {
  require = []
  stageId = contentStageId

  extra = ['content', 'base64']

  enabled = true

  // Clear all except following.
  clearExcept: string[] = [fieldStateId, contentStageId]

  updateFields: DocUpdateHandler[] = []

  textLimit = 100 * 1024

  constructor (
    readonly storageAdapter: StorageAdapter | undefined,
    readonly workspace: WorkspaceId,
    readonly metrics: MeasureContext,
    private readonly contentAdapter: ContentTextAdapter
  ) {}

  async initialize (ctx: MeasureContext, storage: DbAdapter, pipeline: FullTextPipeline): Promise<void> {
    // Just do nothing
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
    for (const doc of toIndex) {
      if (pipeline.cancelling) {
        return
      }
      await this.updateContent(doc, pipeline)
    }
  }

  async updateContent (doc: DocIndexState, pipeline: FullTextPipeline): Promise<void> {
    const attributes = getFullTextIndexableAttributes(pipeline.hierarchy, doc.objectClass)
    // Copy content attributes as well.
    const update: DocumentUpdate<DocIndexState> = {}

    if (pipeline.cancelling) {
      return
    }

    for (const [, val] of Object.entries(attributes)) {
      if (val.type._class === core.class.TypeBlob) {
        // We need retrieve value of attached document content.
        const ref = doc.attributes[docKey(val.name, { _class: val.attributeOf })] as Ref<Doc>
        if (ref !== undefined && ref !== '') {
          try {
            const docInfo: Blob | undefined = await this.storageAdapter?.stat(this.metrics, this.workspace, ref)
            if (docInfo !== undefined && docInfo.size < 30 * 1024 * 1024) {
              // We have blob, we need to decode it to string.
              const contentType = (docInfo.contentType ?? '').split(';')[0]

              if (!contentType.includes('image')) {
                const digest = docInfo.etag
                const digestKey = docKey(val.name, { _class: val.attributeOf, digest: true })
                if (doc.attributes[digestKey] !== digest) {
                  ;(update as any)[docUpdKey(digestKey)] = digest

                  const readable = await this.storageAdapter?.get(this.metrics, this.workspace, ref)

                  if (readable !== undefined) {
                    let textContent = await this.metrics.with('fetch', {}, () =>
                      this.contentAdapter.content(ref, contentType, readable)
                    )
                    readable?.destroy()

                    textContent = textContent
                      .split(/ +|\t+|\f+/)
                      .filter((it) => it)
                      .join(' ')
                      .split(/\n\n+/)
                      .join('\n')

                    // trim to large content
                    if (textContent.length > this.textLimit) {
                      textContent = textContent.slice(0, this.textLimit)
                    }
                    textContent = Buffer.from(textContent).toString('base64')
                    ;(update as any)[docUpdKey(val.name, { _class: val.attributeOf, extra: this.extra })] = textContent

                    if (doc.attachedTo != null) {
                      const parentUpdate: DocumentUpdate<DocIndexState> = {}

                      ;(parentUpdate as any)[
                        docUpdKey(val.name, { _class: val.attributeOf, docId: doc._id, extra: this.extra })
                      ] = textContent

                      // We do not need to pull stage, just update elastic with document.
                      await pipeline.update(doc.attachedTo as Ref<DocIndexState>, true, parentUpdate)
                    }
                  }
                }
              }
            }
          } catch (err: any) {
            if (((err?.message ?? '') as string).includes('NoSuchKeyError')) {
              // Ignore error
            } else {
              const wasError = (doc as any).error !== undefined

              if (wasError) {
                continue
              }
              Analytics.handleError(err)
              await pipeline.update(doc._id, false, {
                [docKey('error')]: JSON.stringify({ message: err.message, err })
              })
              // Print error only first time, and update it in doc index
              this.metrics.error('failed to get content for', { error: err })
            }
          }
        }
      }
    }

    await pipeline.update(doc._id, true, update)
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    // will be handled by field processor
    for (const doc of docs) {
      await pipeline.update(doc._id, true, {})
    }
  }
}
