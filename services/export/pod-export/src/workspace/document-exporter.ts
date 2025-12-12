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
  type AttachedDoc,
  type Class,
  type Collection,
  type Data,
  type Doc,
  type Hierarchy,
  type LowLevelStorage,
  type MeasureContext,
  type Ref,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import core from '@hcengineering/model-core'
import { type AttachmentExporter } from './attachment-exporter'
import { type DataMapper } from './data-mapper'
import { type RelationExporter } from './relation-exporter'
import { type SpaceExporter } from './space-exporter'
import { type ExportState, type RelationDefinition } from './types'

/**
 * Handles document export logic
 */
export class DocumentExporter {
  private relationExporter: RelationExporter | undefined
  private dataMapper: DataMapper

  constructor (
    private readonly context: MeasureContext,
    private readonly targetClient: TxOperations,
    private readonly state: ExportState,
    dataMapper: DataMapper,
    private readonly spaceExporter: SpaceExporter,
    private readonly attachmentExporter: AttachmentExporter
  ) {
    this.dataMapper = dataMapper
  }

  setRelationExporter (relationExporter: RelationExporter): void {
    this.relationExporter = relationExporter
  }

  setDataMapper (dataMapper: DataMapper): void {
    this.dataMapper = dataMapper
  }

  /**
   * Export a single document
   */
  async exportDocument (
    doc: Doc,
    conflictStrategy: 'skip' | 'duplicate',
    includeAttachments: boolean,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage,
    existingDocsMap: Map<Ref<Doc>, Doc>,
    relations: RelationDefinition[]
  ): Promise<boolean> {
    if (this.state.processingDocs.has(doc._id)) {
      return false
    }

    if (this.state.idMapping.has(doc._id)) {
      return false
    }

    if (conflictStrategy === 'skip') {
      const existingDoc = existingDocsMap.get(doc._id)
      if (existingDoc !== undefined) {
        this.state.idMapping.set(doc._id, existingDoc._id)
        return false
      }
    }

    this.state.processingDocs.add(doc._id)

    try {
      const hierarchy = this.targetClient.getHierarchy()
      // Check both hierarchy derivation AND presence of attachedTo field
      // Some classes like ControlledDocument have attachedTo but don't extend AttachedDoc
      const hasAttachedFields =
        (doc as any).attachedTo !== undefined &&
        (doc as any).attachedToClass !== undefined &&
        (doc as any).collection !== undefined
      const isAttached = hierarchy.isDerived(doc._class, core.class.AttachedDoc) || hasAttachedFields

      // Generate target ID upfront and add to idMapping BEFORE inverse relations
      // This ensures inverse relations can reference this document
      const targetId = generateId()
      this.state.idMapping.set(doc._id, targetId)

      // First: Export forward relations (dependencies must exist before this doc)
      if (this.relationExporter === undefined) {
        throw new Error('RelationExporter not initialized')
      }
      await this.relationExporter.exportForwardRelations(
        doc,
        relations,
        conflictStrategy,
        includeAttachments,
        sourceHierarchy,
        sourceLowLevel
      )

      // Create the document
      const targetSpace = await this.spaceExporter.getOrCreateTargetSpace(doc.space, sourceHierarchy, sourceLowLevel)
      const data = await this.dataMapper.prepareDocumentData(doc, targetSpace, isAttached)
      await this.createDocument(doc, data, targetId, targetSpace, isAttached)

      // Now: Export inverse relations (they can now reference this document)
      if (this.relationExporter === undefined) {
        throw new Error('RelationExporter not initialized')
      }
      await this.relationExporter.exportInverseRelations(
        doc,
        relations,
        conflictStrategy,
        includeAttachments,
        sourceHierarchy,
        sourceLowLevel
      )

      // Handle attachments
      if (includeAttachments) {
        await this.attachmentExporter.exportAttachments(doc._id, targetId, doc._class, sourceHierarchy, sourceLowLevel)
      }

      // Handle collections (child documents)
      await this.exportCollections(doc, targetId, sourceHierarchy, sourceLowLevel, relations)

      return true
    } catch (err: any) {
      // Remove from idMapping on failure
      this.state.idMapping.delete(doc._id)
      throw err
    } finally {
      this.state.processingDocs.delete(doc._id)
    }
  }

  private async createDocument (
    sourceDoc: Doc,
    data: any,
    targetId: Ref<Doc>,
    targetSpace: Ref<Space>,
    isAttached: boolean
  ): Promise<void> {
    if (isAttached) {
      const attachedDoc = sourceDoc as AttachedDoc
      const attachedData = data as Data<AttachedDoc>

      // attachedTo is already remapped in prepareDocumentData
      const attachedTo = attachedData.attachedTo
      const attachedToClass = attachedData.attachedToClass
      const collection = attachedData.collection

      // Remove attached doc fields from data - they're passed as separate params to addCollection
      delete (attachedData as any).attachedTo
      delete (attachedData as any).attachedToClass
      delete (attachedData as any).collection

      await this.targetClient.addCollection(
        attachedDoc._class,
        targetSpace,
        attachedTo as any,
        attachedToClass,
        collection,
        attachedData,
        targetId as any
      )
    } else {
      await this.targetClient.createDoc(sourceDoc._class, targetSpace, data, targetId)
    }

    this.context.info(
      `Created document ${targetId} (from ${sourceDoc._id}) class ${sourceDoc._class} in space ${targetSpace}${isAttached ? ' [attached]' : ''}`
    )
  }

  private async exportCollections (
    sourceDoc: Doc,
    targetDocId: Ref<Doc>,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage,
    relations: RelationDefinition[]
  ): Promise<void> {
    const attributes = sourceHierarchy.getAllAttributes(sourceDoc._class)

    for (const [key, attr] of Array.from(attributes)) {
      if (attr.type._class !== core.class.Collection) {
        continue
      }

      const collectionClass = (attr.type as Collection<AttachedDoc>).of as Ref<Class<Doc>>
      const domain = sourceHierarchy.findDomain(collectionClass)
      if (domain === undefined) {
        this.context.warn(`Domain not found for collection ${key}`)
        continue
      }

      // Query collection items using rawFindAll
      const collectionDocs = await sourceLowLevel.rawFindAll<Doc>(domain, {
        _class: collectionClass,
        attachedTo: sourceDoc._id,
        attachedToClass: sourceDoc._class,
        collection: key
      })

      if (collectionDocs.length > 0) {
        this.context.info(`Exporting ${collectionDocs.length} items in collection ${key}`)
      }

      for (const collectionDoc of collectionDocs) {
        try {
          // Don't modify attachedTo here - the ID remapping happens in createDocument
          // The source document still has the source attachedTo ID which will be remapped
          await this.exportDocument(
            collectionDoc,
            'duplicate',
            true,
            sourceHierarchy,
            sourceLowLevel,
            new Map(),
            relations
          )
        } catch (err: any) {
          this.context.error(`Failed to export collection item ${collectionDoc._id}:`, {
            error: err instanceof Error ? err.message : String(err),
            docId: collectionDoc._id
          })
        }
      }
    }
  }
}
