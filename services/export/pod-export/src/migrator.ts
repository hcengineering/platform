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
  Hierarchy,
  Collection,
  isId,
  AccountUuid
} from '@hcengineering/core'
import { StorageAdapter, Pipeline } from '@hcengineering/server-core'
import core from '@hcengineering/model-core'
import contact, { type Employee } from '@hcengineering/contact'

export type PipelineFactory = (ctx: MeasureContext, workspace: WorkspaceIds) => Promise<Pipeline>

export interface RelationDefinition {
  field: string
  class: Ref<Class<Doc>>
  direction?: 'forward' | 'inverse'
}

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
  relations?: RelationDefinition[]
  // Field mappers per class: { classA: { fieldA: value, fieldB: '$currentUser' }, ... }
  // Special value '$currentUser' will be replaced with current account's employee ID
  fieldMappers?: Record<string, Record<string, any>>
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
  private readonly processingDocs = new Set<Ref<Doc>>()
  private readonly employeeCache = new Map<AccountUuid, Ref<Employee>>()
  private fieldMappers: Record<string, Record<string, any>> = {}
  private currentAccountEmployeeId: Ref<Employee> | undefined
  private readonly sourceWorkspace: WorkspaceIds
  private readonly targetWorkspace: WorkspaceIds

  constructor (
    private readonly context: MeasureContext,
    private readonly sourcePipelineFactory: PipelineFactory,
    private readonly targetClient: TxOperations,
    private readonly storage: StorageAdapter,
    private readonly currentAccount: AccountUuid | undefined,
    sourceWorkspace: WorkspaceIds,
    targetWorkspace: WorkspaceIds
  ) {
    this.sourceWorkspace = sourceWorkspace
    this.targetWorkspace = targetWorkspace
  }

  async migrate (options: MigrationOptions): Promise<MigrationResult> {
    const {
      sourceWorkspace,
      sourceQuery,
      _class,
      conflictStrategy = 'duplicate',
      includeAttachments = true,
      mapper,
      relations = [],
      fieldMappers = {}
    } = options

    // Store field mappers
    this.fieldMappers = fieldMappers

    // Pre-fetch current account's employee ID if available
    if (this.currentAccount !== undefined) {
      this.currentAccountEmployeeId = await this.getEmployeeByAccount(this.currentAccount)
      if (this.currentAccountEmployeeId !== undefined) {
        this.context.info(`Current account employee ID: ${this.currentAccountEmployeeId}`)
      }
    }

    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      skippedCount: 0,
      errors: []
    }

    // Create source pipeline to access LowLevelStorage
    const sourcePipeline = await this.sourcePipelineFactory(this.context, sourceWorkspace)

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

      this.context.info(`Starting migration for ${_class}`)

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

          this.context.info(`Processing batch: ${processedCount + 1}-${processedCount + docs.length}`)

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
                existingDocsMap,
                relations
              )
              if (migrated) {
                result.migratedCount++
              } else {
                result.skippedCount++
              }
            } catch (err: any) {
              this.context.error(`Error migrating document ${doc._id}:`, err)
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

      this.context.info(
        `Migration completed: ${result.migratedCount} migrated, ${result.skippedCount} skipped, ${result.errors.length} errors`
      )
    } catch (err: any) {
      this.context.error('Migration failed:', err)
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
    existingDocsMap: Map<Ref<Doc>, Doc>,
    relations: RelationDefinition[]
  ): Promise<boolean> {
    if (this.processingDocs.has(doc._id)) {
      return false
    }

    if (this.idMapping.has(doc._id)) {
      return false
    }

    if (conflictStrategy === 'skip') {
      const existingDoc = existingDocsMap.get(doc._id)
      if (existingDoc !== undefined) {
        this.idMapping.set(doc._id, existingDoc._id)
        return false
      }
    }

    this.processingDocs.add(doc._id)

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
      this.idMapping.set(doc._id, targetId)

      // First: Migrate forward relations (dependencies must exist before this doc)
      await this.migrateForwardRelations(
        doc,
        relations,
        conflictStrategy,
        includeAttachments,
        sourceHierarchy,
        sourceLowLevel
      )

      // Create the document
      const targetSpace = await this.getOrCreateTargetSpace(doc.space, sourceHierarchy, sourceLowLevel)
      const data = await this.prepareDocumentData(doc, targetSpace, isAttached)
      await this.createDocument(doc, data, targetId, targetSpace, isAttached)

      // Now: Migrate inverse relations (they can now reference this document)
      await this.migrateInverseRelations(
        doc,
        relations,
        conflictStrategy,
        includeAttachments,
        sourceHierarchy,
        sourceLowLevel
      )

      // Handle attachments
      if (includeAttachments) {
        await this.migrateAttachments(doc._id, targetId, doc._class, sourceHierarchy, sourceLowLevel)
      }

      // Handle collections (child documents)
      await this.migrateCollections(doc, targetId, sourceHierarchy, sourceLowLevel, relations)

      return true
    } catch (err: any) {
      // Remove from idMapping on failure
      this.idMapping.delete(doc._id)
      throw err
    } finally {
      this.processingDocs.delete(doc._id)
    }
  }

  private async migrateForwardRelations (
    doc: Doc,
    relations: RelationDefinition[],
    conflictStrategy: 'skip' | 'duplicate',
    includeAttachments: boolean,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage
  ): Promise<void> {
    for (const relation of relations) {
      const direction = relation.direction ?? 'forward'
      if (direction !== 'forward') {
        continue
      }
      try {
        await this.migrateForwardRelation(
          doc,
          relation,
          conflictStrategy,
          includeAttachments,
          sourceHierarchy,
          sourceLowLevel,
          relations
        )
      } catch (err: any) {
        this.context.error(`Failed to migrate forward relation ${relation.field} for document ${doc._id}:`, err)
      }
    }
  }

  private async migrateInverseRelations (
    doc: Doc,
    relations: RelationDefinition[],
    conflictStrategy: 'skip' | 'duplicate',
    includeAttachments: boolean,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage
  ): Promise<void> {
    for (const relation of relations) {
      const direction = relation.direction ?? 'forward'
      if (direction !== 'inverse') {
        continue
      }
      try {
        await this.migrateInverseRelation(
          doc,
          relation,
          conflictStrategy,
          includeAttachments,
          sourceHierarchy,
          sourceLowLevel,
          relations
        )
      } catch (err: any) {
        this.context.error(`Failed to migrate inverse relation ${relation.field} for document ${doc._id}:`, err)
      }
    }
  }

  private async migrateForwardRelation (
    doc: Doc,
    relation: RelationDefinition,
    conflictStrategy: 'skip' | 'duplicate',
    includeAttachments: boolean,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage,
    relations: RelationDefinition[]
  ): Promise<void> {
    const value = (doc as any)[relation.field]
    if (value === undefined || value === null) {
      return
    }

    const refs = Array.isArray(value) ? value : [value]
    for (const ref of refs) {
      if (!isId(ref)) {
        continue
      }

      // Skip predefined IDs (like documents:template:ProductChangeControl)
      // Predefined IDs have format module:type:name (two or more colons)
      if (typeof ref === 'string') {
        const colonCount = (ref.match(/:/g) ?? []).length
        if (colonCount >= 2) {
          continue
        }
      }

      await this.migrateRelatedDocument(
        ref as Ref<Doc>,
        relation.class,
        conflictStrategy,
        includeAttachments,
        sourceHierarchy,
        sourceLowLevel,
        relations
      )
    }
  }

  private async migrateInverseRelation (
    doc: Doc,
    relation: RelationDefinition,
    conflictStrategy: 'skip' | 'duplicate',
    includeAttachments: boolean,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage,
    relations: RelationDefinition[]
  ): Promise<void> {
    const domain = sourceHierarchy.findDomain(relation.class)
    if (domain === undefined) {
      this.context.warn(`Domain not found for relation class ${relation.class}`)
      return
    }

    // Query documents where the relation field points to current doc
    // Don't filter by _class to find subclasses as well
    const relatedDocs = await sourceLowLevel.rawFindAll<Doc>(domain, {
      [relation.field]: doc._id
    })

    if (relatedDocs.length > 0) {
      this.context.info(`Inverse relation ${relation.field}: found ${relatedDocs.length} docs pointing to ${doc._id}`)
    }

    for (const relatedDoc of relatedDocs) {
      // Only process docs of the relation class or its subclasses
      if (!sourceHierarchy.isDerived(relatedDoc._class, relation.class)) {
        continue
      }

      await this.migrateDocument(
        relatedDoc,
        conflictStrategy,
        includeAttachments,
        sourceHierarchy,
        sourceLowLevel,
        new Map(),
        relations
      )
    }
  }

  private async migrateRelatedDocument (
    ref: Ref<Doc>,
    relationClass: Ref<Class<Doc>>,
    conflictStrategy: 'skip' | 'duplicate',
    includeAttachments: boolean,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage,
    relations: RelationDefinition[]
  ): Promise<void> {
    if (this.idMapping.has(ref)) {
      return
    }

    const domain = sourceHierarchy.findDomain(relationClass)
    if (domain === undefined) {
      this.context.warn(`Domain not found for relation class ${relationClass}`)
      return
    }

    // Query by ID only - the document might be a subclass of relationClass
    const relatedDocs = await sourceLowLevel.rawFindAll<Doc>(domain, {
      _id: ref
    })

    const relatedDoc = relatedDocs[0]
    if (relatedDoc === undefined) {
      // This is normal for predefined IDs or already-migrated docs
      return
    }

    await this.migrateDocument(
      relatedDoc,
      conflictStrategy,
      includeAttachments,
      sourceHierarchy,
      sourceLowLevel,
      new Map(),
      relations
    )
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

  /**
   * Get employee ID in target workspace for a given account UUID.
   * Caches results to avoid repeated queries.
   */
  private async getEmployeeByAccount (account: AccountUuid): Promise<Ref<Employee> | undefined> {
    if (this.employeeCache.has(account)) {
      return this.employeeCache.get(account)
    }

    try {
      // Find employee by personUuid (account)
      const employees = await this.targetClient.findAll(contact.mixin.Employee, {
        personUuid: account
      })

      if (employees.length > 0) {
        const employeeId = employees[0]._id
        this.employeeCache.set(account, employeeId)
        return employeeId
      }

      this.context.warn(`Employee not found for account ${account} in target workspace`)
      return undefined
    } catch (err: any) {
      this.context.error(`Error finding employee for account ${account}:`, err)
      return undefined
    }
  }

  private async prepareDocumentData (
    doc: Doc,
    targetSpace: Ref<Space>,
    isAttached: boolean
  ): Promise<Record<string, any>> {
    const hierarchy = this.targetClient.getHierarchy()
    const attributes = hierarchy.getAllAttributes(doc._class)
    const data: Record<string, any> = {}

    // First pass: Copy attributes using hierarchy info
    for (const [key] of Array.from(attributes)) {
      if (key === '_id' || key === '_class' || key === 'space') {
        continue
      }

      const value = (doc as any)[key]
      if (value === undefined) {
        continue
      }

      // For attached docs, still remap attachedTo reference (but not attachedToClass/collection)
      if (isAttached && key === 'attachedTo') {
        // Remap the attachedTo reference to the new target ID
        data[key] = this.remapValue(value, key)
        continue
      }

      if (isAttached && (key === 'attachedToClass' || key === 'collection')) {
        data[key] = value
        continue
      }

      // Remap references - use recursive remapping for all values
      data[key] = this.remapValue(value, key)
    }

    // Second pass: Check all doc properties for any missed references
    // This catches fields that might not be in getAllAttributes
    for (const key of Object.keys(doc)) {
      if (
        key === '_id' ||
        key === '_class' ||
        key === 'space' ||
        key === 'modifiedOn' ||
        key === 'modifiedBy' ||
        key === 'createdOn' ||
        key === 'createdBy'
      ) {
        continue
      }

      // Skip if already processed
      if (data[key] !== undefined) {
        continue
      }

      const value = (doc as any)[key]
      if (value === undefined) {
        continue
      }

      data[key] = this.remapValue(value, key)
    }

    // Apply field mappers for specific document classes
    await this.applyFieldMappers(doc._class, data)

    return data
  }

  /**
   * Apply field mappers for specific document classes.
   * Field mappers format: { className: { fieldName: value, ... } }
   * Special value '$currentUser' is replaced with current account's employee ID
   */
  private async applyFieldMappers (docClass: Ref<Class<Doc>>, data: Record<string, any>): Promise<void> {
    const hierarchy = this.targetClient.getHierarchy()

    // Find field mapper for this class or any of its base classes
    let fieldMapper: Record<string, any> | undefined

    // First check exact class match
    if (this.fieldMappers[docClass] !== undefined) {
      fieldMapper = this.fieldMappers[docClass]
    } else {
      // Check all base classes
      for (const [className, mapper] of Object.entries(this.fieldMappers)) {
        if (hierarchy.isDerived(docClass, className as Ref<Class<Doc>>)) {
          fieldMapper = mapper
          break
        }
      }
    }

    if (fieldMapper === undefined) {
      return
    }

    // Apply field mappings
    for (const [fieldName, fieldValue] of Object.entries(fieldMapper)) {
      // Handle special $currentUser value
      if (fieldValue === '$currentUser') {
        if (this.currentAccountEmployeeId !== undefined) {
          data[fieldName] = this.currentAccountEmployeeId
          this.context.info(`Mapped ${fieldName}: $currentUser -> ${this.currentAccountEmployeeId}`)
        } else {
          this.context.warn(`Cannot map ${fieldName}: $currentUser but current account employee not found`)
        }
      } else if (fieldValue === '') {
        // Empty string means clear the field
        data[fieldName] = undefined
      } else {
        // Direct value assignment
        data[fieldName] = fieldValue
      }
    }
  }

  /**
   * Recursively remap a value, handling nested objects and arrays.
   */
  private remapValue (value: any, fieldPath: string = ''): any {
    if (value === null || value === undefined) {
      return value
    }

    // String - check if it's an ID that needs remapping
    if (typeof value === 'string') {
      if (this.idMapping.has(value as Ref<Doc>)) {
        const remapped = this.idMapping.get(value as Ref<Doc>)
        return remapped
      }
      return value
    }

    // Array - remap each element
    if (Array.isArray(value)) {
      return value.map((v, i) => this.remapValue(v, `${fieldPath}[${i}]`))
    }

    // Object - recursively remap all properties
    if (typeof value === 'object') {
      const result: Record<string, any> = {}
      for (const [key, v] of Object.entries(value)) {
        result[key] = this.remapValue(v, fieldPath !== '' ? `${fieldPath}.${key}` : key)
      }
      return result
    }

    return value
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

    this.context.info(`Migrating ${attachments.length} attachments for document ${targetDocId}`)

    for (const attachment of attachments) {
      try {
        await this.migrateAttachment(attachment, targetDocId, docClass)
      } catch (err: any) {
        this.context.error(`Failed to migrate attachment ${attachment._id}:`, err)
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
        this.context.error(`Failed to copy blob ${blobRef}:`, err)
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

  private async migrateCollections (
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
        this.context.info(`Migrating ${collectionDocs.length} items in collection ${key}`)
      }

      for (const collectionDoc of collectionDocs) {
        try {
          // Don't modify attachedTo here - the ID remapping happens in createDocument
          // The source document still has the source attachedTo ID which will be remapped
          await this.migrateDocument(
            collectionDoc,
            'duplicate',
            true,
            sourceHierarchy,
            sourceLowLevel,
            new Map(),
            relations
          )
        } catch (err: any) {
          this.context.error(`Failed to migrate collection item ${collectionDoc._id}:`, err)
        }
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
      _class: sourceSpace._class,
      name: sourceSpace.name
    })

    let targetSpaceId: Ref<Space>

    if (targetSpaces.length > 0) {
      // Space already exists, use it
      targetSpaceId = targetSpaces[0]._id
      this.context.info(`Using existing space ${targetSpaceId}`)
    } else {
      // Create new space with current user as member/owner
      const spaceData: Data<Space> & { owners?: AccountUuid[] } = {
        name: sourceSpace.name,
        description: sourceSpace.description,
        private: sourceSpace.private,
        archived: sourceSpace.archived ?? false,
        members: this.currentAccount !== undefined ? [this.currentAccount] : [],
        owners: this.currentAccount !== undefined ? [this.currentAccount] : []
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

      targetSpaceId = await this.targetClient.createDoc(sourceSpace._class, core.space.Space, spaceData)

      this.context.info(`Created new space ${targetSpaceId} (${sourceSpace.name})`)
    }

    // Update mapping and mark as migrated
    this.spaceMapping.set(sourceSpaceId, targetSpaceId)
    return targetSpaceId
  }
}
