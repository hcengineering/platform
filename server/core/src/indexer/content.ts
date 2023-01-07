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
  MeasureContext,
  Ref,
  WorkspaceId
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { ContentTextAdapter, IndexedDoc } from '../types'
import { contentStageId, DocUpdateHandler, fieldStateId, FullTextPipeline, FullTextPipelineStage } from './types'
import { docKey, docUpdKey, getFullTextAttributes } from './utils'

/**
 * @public
 */
export class ContentRetrievalStage implements FullTextPipelineStage {
  require = []
  stageId = contentStageId

  extra = ['content', 'base64']
  digest = '^digest'

  // Clear all except following.
  clearExcept: string[] = [fieldStateId, contentStageId]

  updateFields: DocUpdateHandler[] = []

  limit = 100

  constructor (
    readonly storageAdapter: MinioService | undefined,
    readonly workspace: WorkspaceId,
    readonly metrics: MeasureContext,
    private readonly contentAdapter: ContentTextAdapter
  ) {}

  async search (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
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
    const attributes = getFullTextAttributes(pipeline.hierarchy, doc.objectClass)
    // Copy content attributes as well.
    const update: DocumentUpdate<DocIndexState> = {}
    const elasticUpdate: Partial<IndexedDoc> = {}

    if (pipeline.cancelling) {
      return
    }

    try {
      for (const [, val] of Object.entries(attributes)) {
        if (val.type._class === core.class.TypeAttachment) {
          // We need retrieve value of attached document content.
          const ref = doc.attributes[docKey(val.name, { _class: val.attributeOf })] as Ref<Doc>
          if (ref !== undefined && ref !== '') {
            let docInfo: any | undefined
            try {
              docInfo = await this.storageAdapter?.stat(this.workspace, ref)
            } catch (err: any) {
              // not found.
            }
            if (docInfo !== undefined) {
              // We have blob, we need to decode it to string.
              const contentType = (docInfo.metaData['content-type'] as string) ?? ''
              if (!contentType.includes('image')) {
                const digest = docInfo.etag
                if (doc.attributes[docKey(val.name + this.digest, { _class: val.attributeOf })] !== digest) {
                  ;(update as any)[docUpdKey(val.name + this.digest, { _class: val.attributeOf })] = digest

                  const readable = await this.storageAdapter?.get(this.workspace, ref)

                  if (readable !== undefined) {
                    let textContent = await this.metrics.with(
                      'fetch',
                      {},
                      async () => await this.contentAdapter.fetch(ref, contentType, readable)
                    )

                    textContent = textContent
                      .split(/ |\t|\f/)
                      .filter((it) => it)
                      .join(' ')
                      .split(/\n+/)
                      .join('\n')

                    // if (textContent.length > 100 * 1024) {
                    //   textContent = textContent.substring(0, 100 * 1024) // Allow only first 128kb of data.
                    // }

                    textContent = Buffer.from(textContent).toString('base64')
                    ;(update as any)[docUpdKey(val.name, { _class: val.attributeOf, extra: this.extra })] = textContent
                    elasticUpdate[docKey(val.name, { _class: val.attributeOf, extra: this.extra })] = textContent

                    if (doc.attachedTo != null) {
                      const parentUpdate: DocumentUpdate<DocIndexState> = {}
                      const parentElasticUpdate: Partial<IndexedDoc> = {}

                      ;(parentUpdate as any)[
                        docUpdKey(val.name, { _class: val.attributeOf, docId: doc._id, extra: this.extra })
                      ] = textContent
                      parentElasticUpdate[
                        docKey(val.name, { _class: val.attributeOf, docId: doc._id, extra: this.extra })
                      ] = textContent

                      // We do not need to pull stage, just update elastic with document.
                      await pipeline.update(
                        doc.attachedTo as Ref<DocIndexState>,
                        true,
                        parentUpdate,
                        parentElasticUpdate
                      )
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      const wasError = (doc as any).error !== undefined

      await pipeline.update(doc._id, false, { [docKey('error')]: JSON.stringify({ message: err.message, err }) }, {})
      if (wasError) {
        return
      }
      // Print error only first time, and update it in doc index
      console.error(err)
      return
    }

    await pipeline.update(doc._id, true, update, elasticUpdate)
  }

  async remove (docs: DocIndexState[], pipeline: FullTextPipeline): Promise<void> {
    // will be handled by field processor
  }
}
