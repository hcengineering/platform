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
  Class,
  Doc,
  DocumentQuery,
  generateId,
  MeasureContext,
  Ref,
  Space,
  TxOperations,
  WorkspaceIds,
  AttachedDoc,
  Data,
  Blob,
  LowLevelStorage,
  Hierarchy
} from '@hcengineering/core'
import { StorageAdapter, PipelineFactory } from '@hcengineering/server-core'
import core from '@hcengineering/model-core'

export interface MigrationOptions {
  sourceWorkspace: WorkspaceIds
  targetWorkspace: WorkspaceIds
  sourceQuery: DocumentQuery<Doc>
  _class: Ref<Class<Doc>>
  // Strategy for handling conflicts
  conflictStrategy?: 'skip' | 'duplicate'
  // Whether to include attachments
  includeAttachments?: boolean
  // Optional mapper function to transform documents before migration
  mapper?: (doc: Doc) => Doc | Promise<Doc>
}

export interface MigrationResult {
  success: boolean
  migratedCount: number
  skippedCount: number
  errors: Array<{ docId: string, error: string }>
}

export class WorkspaceMigrator {
  private readonly idMapping = new Map<Ref<Doc>, Ref<Doc>>()
  private readonly spaceMapping = new Map<Ref<Space>, Ref<Space>>()

  constructor (
    private readonly context: MeasureContext,
    private readonly sourcePipelineFactory: PipelineFactory,
    private readonly targetClient: TxOperations,
    private readonly storage: StorageAdapter
  ) {}

  async migrate (options: MigrationOptions): Promise<MigrationResult> {
    const {
      sourceWorkspace,
      sourceQuery,
      _class,
      conflictStrategy = 'duplicate',
      includeAttachments = true,
      mapper
    } = options

    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      skippedCount: 0,
      errors: []
    }

    // Create source pipeline to access LowLevelStorage
    const sourcePipeline = await this.sourcePipelineFactory(this.context, sourceWorkspace, {} as any, null)

    try {
      const { hierarchy, lowLevelStorage } = sourcePipeline.context
      if (lowLevelStorage === undefined) {
        throw new Error('Low level storage not available')
      }

      // Get domain for the class
      const domain = hierarchy.findDomain(_class)
      if (domain === undefined) {
        throw new Error(`Domain not found for class ${_class}`)
      }

      // Build query - handle both _class direct match and mixin cases
      const query = hierarchy.isMixin(_class)
        ? { [_class]: { $exists: true }, ...sourceQuery }
        : { _class, ...sourceQuery }

      console.log(`Starting migration for ${_class}`)

      // Migrate spaces first to establish space mapping
      await this.migrateSpaces(hierarchy, lowLevelStorage)

      // Use traverse for efficient bulk processing
      const iterator = await lowLevelStorage.traverse<Doc>(domain, query)
      const batchSize = 100
      let processedCount = 0

      try {
        while (true) {
          const docs = await iterator.next(batchSize)
          if (docs === null || docs.length === 0) {
            break
          }

          console.log(`Processing batch: ${processedCount + 1}-${processedCount + docs.length}`)

          // Check for existing documents in bulk if needed
          const existingDocsMap = new Map<Ref<Doc>, Doc>()
          if (conflictStrategy === 'skip') {
            const docIds = docs.map((d) => d._id)
            const existing = await this.targetClient.findAll(_class, { _id: { $in: docIds } })
            for (const doc of existing) {
              existingDocsMap.set(doc._id, doc)
            }
          }

          // Migrate documents in this batch
          for (const doc of docs) {
            try {
              // Apply mapper if provided
              const mappedDoc = mapper !== undefined ? await mapper(doc) : doc

              const migrated = await this.migrateDocument(
                mappedDoc,
                conflictStrategy,
                includeAttachments,
                hierarchy,
                lowLevelStorage,
                existingDocsMap
              )
              if (migrated) {
                result.migratedCount++
              } else {
                result.skippedCount++
              }
            } catch (err: any) {
              console.error(`Error migrating document ${doc._id}:`, err)
              result.errors.push({
                docId: doc._id,
                error: err.message ?? 'Unknown error'
              })
              result.success = false
            }
          }

          processedCount += docs.length
        }
      } finally {
        await iterator.close()
      }

      console.log(
        `Migration completed: ${result.migratedCount} migrated, ${result.skippedCount} skipped, ${result.errors.length} errors`
      )
    } catch (err: any) {
      console.error('Migration failed:', err)
      result.success = false
      result.errors.push({
        docId: 'migration',
        error: err.message ?? 'Unknown error'
      })
    } finally {
      await sourcePipeline.close()
    }

    return result
  }

  private async migrateDocument (
    doc: Doc,
    conflictStrategy: 'skip' | 'duplicate',
    includeAttachments: boolean,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage,
    existingDocsMap: Map<Ref<Doc>, Doc>
  ): Promise<boolean> {
    const hierarchy = this.targetClient.getHierarchy()
    const isAttached = hierarchy.isDerived(doc._class, core.class.AttachedDoc)

    // Get or create target space
    const targetSpace = await this.getOrCreateTargetSpace(doc.space, sourceHierarchy, sourceLowLevel)

    // Generate new ID or handle conflict
    let targetId: Ref<Doc>
    if (conflictStrategy === 'duplicate') {
      targetId = generateId()
      this.idMapping.set(doc._id, targetId)
    } else {
      // Check if document exists using the bulk-loaded map
      const existing = existingDocsMap.get(doc._id)
      if (existing !== undefined) {
        if (conflictStrategy === 'skip') {
          console.log(`Skipping existing document ${doc._id}`)
          return false
        }
      }
      targetId = doc._id
      this.idMapping.set(doc._id, targetId)
    }

    // Prepare document data
    const data = await this.prepareDocumentData(doc, targetSpace, isAttached)

    await this.createDocument(doc, data, targetId, targetSpace, isAttached)

    // Handle attachments
    if (includeAttachments) {
      await this.migrateAttachments(doc._id, targetId, doc._class, sourceHierarchy, sourceLowLevel)
    }

    // Handle collections (child documents)
    await this.migrateCollections(doc, targetId, sourceHierarchy, sourceLowLevel)

    return true
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

      // Remap attachedTo reference if it was migrated
      if (attachedData.attachedTo !== undefined) {
        attachedData.attachedTo = this.idMapping.get(attachedData.attachedTo) ?? attachedData.attachedTo
      }

      await this.targetClient.addCollection(
        attachedDoc._class,
        targetSpace,
        attachedData.attachedTo as any,
        attachedData.attachedToClass,
        attachedData.collection,
        attachedData,
        targetId as any
      )
    } else {
      await this.targetClient.createDoc(sourceDoc._class, targetSpace, data, targetId)
    }

    console.log(`Created document ${targetId} in space ${targetSpace}`)
  }

  private async prepareDocumentData (
    doc: Doc,
    targetSpace: Ref<Space>,
    isAttached: boolean
  ): Promise<Record<string, any>> {
    const hierarchy = this.targetClient.getHierarchy()
    const attributes = hierarchy.getAllAttributes(doc._class)
    const data: Record<string, any> = {}

    // Copy attributes, remapping references
    for (const [key, attr] of Array.from(attributes)) {
      if (key === '_id' || key === '_class' || key === 'space') {
        continue
      }

      if (isAttached && (key === 'attachedTo' || key === 'attachedToClass' || key === 'collection')) {
        data[key] = (doc as any)[key]
        continue
      }

      const value = (doc as any)[key]
      if (value === undefined) {
        continue
      }

      // Remap references
      if (attr.type._class === core.class.RefTo) {
        const ref = value as Ref<Doc>
        data[key] = this.idMapping.get(ref) ?? ref
      } else if (attr.type._class === core.class.ArrOf) {
        // Handle array of references
        if (Array.isArray(value)) {
          data[key] = value.map((v) => {
            if (typeof v === 'string' && this.idMapping.has(v as Ref<Doc>)) {
              return this.idMapping.get(v as Ref<Doc>)
            }
            return v
          })
        } else {
          data[key] = value
        }
      } else {
        data[key] = value
      }
    }

    return data
  }

  private async migrateAttachments (
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
      console.log('Domain not found for attachments')
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

    console.log(`Migrating ${attachments.length} attachments for document ${targetDocId}`)

    for (const attachment of attachments) {
      try {
        await this.migrateAttachment(attachment, targetDocId, docClass)
      } catch (err: any) {
        console.error(`Failed to migrate attachment ${attachment._id}:`, err)
      }
    }
  }

  private async migrateAttachment (
    attachment: Doc,
    targetDocId: Ref<Doc>,
    targetDocClass: Ref<Class<Doc>>
  ): Promise<void> {
    const attachmentData = attachment as any

    // Copy blob data if exists
    if (attachmentData.file !== undefined) {
      const blobRef = attachmentData.file as Ref<Blob>
      // Note: Blob migration requires access to storage adapter
      // This is a simplified version - in production you'd need to copy the actual blob
      console.log(`Note: Blob ${blobRef} needs to be copied manually`)
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

  private async migrateCollections (
    sourceDoc: Doc,
    targetDocId: Ref<Doc>,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage
  ): Promise<void> {
    const attributes = sourceHierarchy.getAllAttributes(sourceDoc._class)

    for (const [key, attr] of Array.from(attributes)) {
      if (attr.type._class !== core.class.Collection) {
        continue
      }

      const collectionClass = (attr.type as any).of as Ref<Class<Doc>>
      const domain = sourceHierarchy.findDomain(collectionClass)
      if (domain === undefined) {
        console.log(`Domain not found for collection ${key}`)
        continue
      }

      // Query collection items using rawFindAll
      const collectionDocs = await sourceLowLevel.rawFindAll<Doc>(domain, {
        _class: collectionClass,
        attachedTo: sourceDoc._id,
        attachedToClass: sourceDoc._class,
        collection: key
      })

      console.log(`Migrating ${collectionDocs.length} items in collection ${key}`)

      for (const collectionDoc of collectionDocs) {
        try {
          // Update attachedTo reference before migration
          const updatedDoc = { ...collectionDoc, attachedTo: targetDocId }
          // Pass empty map since we handle conflicts at top level only
          await this.migrateDocument(updatedDoc, 'duplicate', true, sourceHierarchy, sourceLowLevel, new Map())
        } catch (err: any) {
          console.error(`Failed to migrate collection item ${collectionDoc._id}:`, err)
        }
      }
    }
  }

  private async migrateSpaces (sourceHierarchy: Hierarchy, sourceLowLevel: LowLevelStorage): Promise<void> {
    console.log('Migrating spaces structure...')

    // Find all spaces in source workspace
    const spaceDomain = sourceHierarchy.findDomain(core.class.Space)
    if (spaceDomain === undefined) {
      console.log('Space domain not found, skipping space migration')
      return
    }

    const sourceSpaces = await sourceLowLevel.rawFindAll<Space>(spaceDomain, {
      _class: { $ne: core.class.TypedSpace }
    })

    console.log(`Found ${sourceSpaces.length} spaces in source workspace`)

    for (const sourceSpace of sourceSpaces) {
      try {
        await this.getOrCreateTargetSpace(sourceSpace._id, sourceHierarchy, sourceLowLevel)
      } catch (err: any) {
        console.error(`Failed to migrate space ${sourceSpace._id}:`, err)
      }
    }
  }

  private async getOrCreateTargetSpace (
    sourceSpaceId: Ref<Space>,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage
  ): Promise<Ref<Space>> {
    // Check if already mapped
    const existing = this.spaceMapping.get(sourceSpaceId)
    if (existing !== undefined) {
      return existing
    }

    // Find space in source
    const spaceDomain = sourceHierarchy.findDomain(core.class.Space)
    if (spaceDomain === undefined) {
      throw new Error('Space domain not found')
    }

    const sourceSpaces = await sourceLowLevel.rawFindAll<Space>(spaceDomain, {
      _id: sourceSpaceId
    })

    if (sourceSpaces.length === 0) {
      throw new Error(`Source space ${sourceSpaceId} not found`)
    }

    const sourceSpace = sourceSpaces[0]

    // Check if space exists in target workspace
    const targetSpaces = await this.targetClient.findAll(core.class.Space, {
      _id: sourceSpaceId
    })

    let targetSpaceId: Ref<Space>

    if (targetSpaces.length > 0) {
      // Space already exists, use it
      targetSpaceId = targetSpaces[0]._id
      console.log(`Using existing space ${targetSpaceId}`)
    } else {
      // Create new space without members and roles
      const spaceData: Data<Space> = {
        name: sourceSpace.name,
        description: sourceSpace.description,
        private: sourceSpace.private,
        archived: sourceSpace.archived ?? false,
        members: []
      }

      // Copy type-specific attributes if needed
      const targetHierarchy = this.targetClient.getHierarchy()
      const attributes = targetHierarchy.getAllAttributes(sourceSpace._class)

      for (const [key] of Array.from(attributes)) {
        if (
          key === '_id' ||
          key === '_class' ||
          key === 'space' ||
          key === 'members' ||
          key === 'owners' ||
          key === 'admins' ||
          key === 'name' ||
          key === 'description' ||
          key === 'private' ||
          key === 'archived'
        ) {
          continue
        }

        const value = (sourceSpace as any)[key]
        if (value !== undefined) {
          ;(spaceData as any)[key] = value
        }
      }

      targetSpaceId = await this.targetClient.createDoc(sourceSpace._class, core.space.Space, spaceData, sourceSpaceId)

      console.log(`Created new space ${targetSpaceId} (${sourceSpace.name})`)
    }

    // Update mapping
    this.spaceMapping.set(sourceSpaceId, targetSpaceId)
    return targetSpaceId
  }
}
