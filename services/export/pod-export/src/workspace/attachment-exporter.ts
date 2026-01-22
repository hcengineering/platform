//
// Copyright © 2025 Hardcore Engineering Inc.
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
  generateId,
  type Blob,
  type Class,
  type Doc,
  Hierarchy,
  type LowLevelStorage,
  type MeasureContext,
  type Mixin,
  type Ref,
  type TxOperations,
  type WorkspaceIds
} from '@hcengineering/core'
import core from '@hcengineering/model-core'
import { type StorageAdapter } from '@hcengineering/server-core'
import { Buffer } from 'buffer'

/**
 * Handles attachment and blob export between workspaces
 */
export class AttachmentExporter {
  constructor (
    private readonly context: MeasureContext,
    private readonly targetClient: TxOperations,
    private readonly storage: StorageAdapter,
    private readonly sourceWorkspace: WorkspaceIds,
    private readonly targetWorkspace: WorkspaceIds
  ) {}

  /**
   * Export all attachments for a document
   */
  async exportAttachments (
    sourceDocId: Ref<Doc>,
    targetDocId: Ref<Doc>,
    docClass: Ref<Class<Doc>>,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage
  ): Promise<void> {
    if (sourceHierarchy.hasMixin(docClass as any, 'attachment:mixin:Attachments' as any) === undefined) {
      return
    }

    // Find the domain for attachments
    const attachmentClass = 'attachment:class:Attachment' as Ref<Class<Doc>>
    const domain = sourceHierarchy.findDomain(attachmentClass)
    if (domain === undefined) {
      this.context.warn('Domain not found for attachments')
      return
    }

    // Query attachments using rawFindAll
    const attachments = await sourceLowLevel.rawFindAll(domain, {
      _class: attachmentClass,
      attachedTo: sourceDocId
    })

    if (attachments.length === 0) {
      return
    }

    this.context.info(`Exporting ${attachments.length} attachments for document ${targetDocId}`)

    for (const attachment of attachments) {
      try {
        await this.exportAttachment(attachment, targetDocId, docClass)
      } catch (err: any) {
        this.context.error(`Failed to export attachment ${attachment._id}:`, {
          error: err instanceof Error ? err.message : String(err),
          attachmentId: attachment._id
        })
      }
    }
  }

  /**
   * Export collaborative content blobs for a document.
   * Finds all TypeCollaborativeDoc fields and copies their blob references.
   */
  async exportCollaborativeContent (sourceDoc: Doc, sourceHierarchy: Hierarchy): Promise<void> {
    try {
      const attributes = sourceHierarchy.getAllAttributes(sourceDoc._class)

      for (const [key, attr] of Array.from(attributes)) {
        // Check if this is a collaborative document field
        if (attr.type._class !== core.class.TypeCollaborativeDoc) {
          continue
        }

        const blobRef = (sourceDoc as any)[key] as Ref<Blob> | undefined | null
        if (blobRef === undefined || blobRef === null || typeof blobRef !== 'string') {
          continue
        }

        try {
          // Read blob from source workspace
          const blobBuffers = await this.storage.read(this.context, this.sourceWorkspace, blobRef as string)
          if (blobBuffers !== undefined && blobBuffers.length > 0) {
            // Get blob metadata from source
            const sourceBlob = await this.storage.stat(this.context, this.sourceWorkspace, blobRef as string)
            if (sourceBlob !== undefined) {
              // Combine buffers into single buffer
              const totalSize = blobBuffers.reduce((sum, buf) => sum + buf.length, 0)
              const combinedBuffer = Buffer.concat(blobBuffers)

              // Write blob to target workspace
              await this.storage.put(
                this.context,
                this.targetWorkspace,
                blobRef as string,
                combinedBuffer,
                sourceBlob.contentType ?? 'application/json',
                totalSize
              )

              this.context.info(`Copied collaborative content blob ${blobRef} (${totalSize} bytes) for field ${key}`)
            } else {
              this.context.warn(`Blob metadata not found for ${blobRef} (field ${key}), skipping blob copy`)
            }
          } else {
            this.context.warn(`Blob ${blobRef} (field ${key}) not found in source workspace, skipping blob copy`)
          }
        } catch (err: any) {
          this.context.error(`Failed to copy collaborative content blob ${blobRef} (field ${key}):`, {
            error: err instanceof Error ? err.message : String(err),
            blobRef,
            field: key
          })
          // Continue with document creation even if blob copy fails
        }
      }

      // Also check mixin attributes - iterate through document keys to find mixins
      for (const key of Object.keys(sourceDoc)) {
        if (key === '_id' || key === '_class' || key === 'space') {
          continue
        }

        // Check if this key is a mixin
        if (
          sourceHierarchy.isMixin(key as Ref<Mixin<Doc>>) &&
          sourceHierarchy.hasMixin(sourceDoc, key as Ref<Mixin<Doc>>)
        ) {
          const mixinAttrs = sourceHierarchy.getAllAttributes(key as Ref<Mixin<Doc>>)
          const mixinData = (sourceDoc as any)[key]
          if (mixinData === undefined || typeof mixinData !== 'object') {
            continue
          }

          for (const [mixinKey, attr] of Array.from(mixinAttrs)) {
            if (attr.type._class !== core.class.TypeCollaborativeDoc) {
              continue
            }

            const blobRef = mixinData[mixinKey] as Ref<Blob> | undefined | null
            if (blobRef === undefined || blobRef === null || typeof blobRef !== 'string') {
              continue
            }

            try {
              const blobBuffers = await this.storage.read(this.context, this.sourceWorkspace, blobRef as string)
              if (blobBuffers !== undefined && blobBuffers.length > 0) {
                const sourceBlob = await this.storage.stat(this.context, this.sourceWorkspace, blobRef as string)
                if (sourceBlob !== undefined) {
                  const totalSize = blobBuffers.reduce((sum, buf) => sum + buf.length, 0)
                  const combinedBuffer = Buffer.concat(blobBuffers)

                  await this.storage.put(
                    this.context,
                    this.targetWorkspace,
                    blobRef as string,
                    combinedBuffer,
                    sourceBlob.contentType ?? 'application/json',
                    totalSize
                  )

                  this.context.info(
                    `Copied collaborative content blob ${blobRef} (${totalSize} bytes) for mixin ${key} field ${mixinKey}`
                  )
                }
              }
            } catch (err: any) {
              this.context.error(
                `Failed to copy collaborative content blob ${blobRef} (mixin ${key}, field ${mixinKey}):`,
                {
                  error: err instanceof Error ? err.message : String(err),
                  blobRef,
                  mixin: key,
                  field: mixinKey
                }
              )
            }
          }
        }
      }
    } catch (err: any) {
      this.context.error(`Failed to export collaborative content for document ${sourceDoc._id}:`, {
        error: err instanceof Error ? err.message : String(err),
        docId: sourceDoc._id,
        docClass: sourceDoc._class
      })
      // Re-throw to allow caller to handle the error if needed
      throw err
    }
  }

  /**
   * Export a single attachment, including copying blob data
   */
  private async exportAttachment (
    attachment: Doc,
    targetDocId: Ref<Doc>,
    targetDocClass: Ref<Class<Doc>>
  ): Promise<void> {
    const attachmentData = attachment as any

    // Copy blob data if exists
    if (attachmentData.file !== undefined) {
      const blobRef = attachmentData.file as Ref<Blob>
      try {
        // Read blob from source workspace
        const blobBuffers = await this.storage.read(this.context, this.sourceWorkspace, blobRef)
        if (blobBuffers !== undefined && blobBuffers.length > 0) {
          // Get blob metadata from source
          const sourceBlob = await this.storage.stat(this.context, this.sourceWorkspace, blobRef)
          if (sourceBlob !== undefined) {
            // Combine buffers into single buffer
            const totalSize = blobBuffers.reduce((sum, buf) => sum + buf.length, 0)
            const combinedBuffer = Buffer.concat(blobBuffers)

            // Write blob to target workspace
            await this.storage.put(
              this.context,
              this.targetWorkspace,
              blobRef,
              combinedBuffer,
              sourceBlob.contentType ?? 'application/octet-stream',
              totalSize
            )

            this.context.info(`Copied blob ${blobRef} (${totalSize} bytes) to target workspace`)
          } else {
            this.context.warn(`Blob metadata not found for ${blobRef}, skipping blob copy`)
          }
        } else {
          this.context.warn(`Blob ${blobRef} not found in source workspace, skipping blob copy`)
        }
      } catch (err: any) {
        this.context.error(`Failed to copy blob ${blobRef}:`, {
          error: err instanceof Error ? err.message : String(err),
          blobRef
        })
        // Continue with attachment creation even if blob copy fails
      }
    }

    // Create attachment in target workspace
    const newAttachmentId = generateId()
    const data: any = {
      ...attachmentData,
      attachedTo: targetDocId,
      attachedToClass: targetDocClass
    }

    delete data._id
    delete data._class
    delete data.space

    await this.targetClient.addCollection(
      attachment._class,
      (attachment as any).space,
      targetDocId as any,
      targetDocClass,
      'attachments',
      data,
      newAttachmentId as any
    )
  }
}
