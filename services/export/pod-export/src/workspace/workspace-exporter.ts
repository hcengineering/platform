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
  type AccountUuid,
  type Doc,
  type MeasureContext,
  type Ref,
  type Space,
  type TxOperations,
  type WorkspaceIds
} from '@hcengineering/core'
import contact, { type Employee } from '@hcengineering/contact'
import { type StorageAdapter } from '@hcengineering/server-core'
import { shouldSkipDocument } from '@hcengineering/export'
import { AttachmentExporter } from './attachment-exporter'
import { DataMapper } from './data-mapper'
import { DocumentExporter } from './document-exporter'
import { RelationExporter } from './relation-exporter'
import { SpaceExporter } from './space-exporter'
import { type ExportOptions, type ExportResult, type ExportState, type PipelineFactory } from './types'

/**
 * Main workspace exporter that orchestrates export between workspaces
 */
export class CrossWorkspaceExporter {
  private readonly state: ExportState
  private readonly employeeCache = new Map<AccountUuid, Ref<Employee>>()
  private currentAccountEmployeeId: Ref<Employee> | undefined

  // Component exporters
  private dataMapper: DataMapper
  private readonly spaceExporter: SpaceExporter
  private readonly attachmentExporter: AttachmentExporter
  private readonly documentExporter: DocumentExporter
  private readonly relationExporter: RelationExporter

  constructor (
    private readonly context: MeasureContext,
    private readonly sourcePipelineFactory: PipelineFactory,
    private readonly targetClient: TxOperations,
    private readonly storage: StorageAdapter,
    private readonly currentAccount: AccountUuid | undefined,
    private readonly sourceWorkspace: WorkspaceIds,
    private readonly targetWorkspace: WorkspaceIds,
    private fieldMappers: Record<string, Record<string, any>> = {}
  ) {
    // Initialize shared state
    this.state = {
      idMapping: new Map<Ref<Doc>, Ref<Doc>>(),
      spaceMapping: new Map<Ref<Space>, Ref<Space>>(),
      processingDocs: new Set<Ref<Doc>>(),
      uniqueFieldValues: new Map()
    }

    // Initialize component exporters
    this.dataMapper = new DataMapper(
      context,
      targetClient,
      this.state,
      fieldMappers,
      undefined // Will be set after employee lookup
    )

    this.spaceExporter = new SpaceExporter(context, targetClient, this.state, currentAccount)
    this.attachmentExporter = new AttachmentExporter(context, targetClient, storage, sourceWorkspace, targetWorkspace)

    // Create document exporter
    this.documentExporter = new DocumentExporter(
      context,
      targetClient,
      this.state,
      this.dataMapper,
      this.spaceExporter,
      this.attachmentExporter
    )

    // Create relation exporter with document exporter reference
    this.relationExporter = new RelationExporter(
      context,
      this.state,
      async (
        doc,
        conflictStrategy,
        includeAttachments,
        sourceHierarchy,
        sourceLowLevel,
        existingDocsMap,
        relations
      ) => {
        return await this.documentExporter.exportDocument(
          doc,
          conflictStrategy,
          includeAttachments,
          sourceHierarchy,
          sourceLowLevel,
          existingDocsMap,
          relations
        )
      }
    )

    // Set relation exporter in document exporter
    this.documentExporter.setRelationExporter(this.relationExporter)
  }

  async export (options: ExportOptions): Promise<ExportResult> {
    const {
      sourceWorkspace,
      sourceQuery,
      _class,
      conflictStrategy = 'duplicate',
      includeAttachments = true,
      mapper,
      relations = [],
      fieldMappers = {},
      skipDeletedObsolete = true
    } = options

    // Store field mappers
    this.fieldMappers = fieldMappers
    // Update data mapper with new field mappers
    this.dataMapper = new DataMapper(
      this.context,
      this.targetClient,
      this.state,
      fieldMappers,
      this.currentAccountEmployeeId
    )
    // Update document exporter with new data mapper
    this.documentExporter.setDataMapper(this.dataMapper)

    // Pre-fetch current account's employee ID if available
    if (this.currentAccount !== undefined) {
      this.currentAccountEmployeeId = await this.getEmployeeByAccount(this.currentAccount)
      if (this.currentAccountEmployeeId !== undefined) {
        this.context.info(`Current account employee ID: ${this.currentAccountEmployeeId}`)
        // Recreate data mapper with employee ID
        this.dataMapper = new DataMapper(
          this.context,
          this.targetClient,
          this.state,
          this.fieldMappers,
          this.currentAccountEmployeeId
        )
        // Update document exporter with new data mapper
        this.documentExporter.setDataMapper(this.dataMapper)
      }
    }

    const result: ExportResult = {
      success: true,
      exportedCount: 0,
      skippedCount: 0,
      errors: [],
      exportedDocuments: []
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

      this.context.info(`Starting export for ${_class}`)

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

          // Filter out archived/deleted/obsolete documents if skipDeletedObsolete is enabled
          const docsToProcess = skipDeletedObsolete ? docs.filter((doc) => !shouldSkipDocument(doc)) : docs

          // Check for existing documents in bulk if needed
          const existingDocsMap = new Map<Ref<Doc>, Doc>()
          if (conflictStrategy === 'skip') {
            const docIds = docsToProcess.map((d) => d._id)
            const existing = await this.targetClient.findAll(_class, { _id: { $in: docIds } })
            for (const doc of existing) {
              existingDocsMap.set(doc._id, doc)
            }
          }

          // Export documents in this batch
          for (const doc of docsToProcess) {
            try {
              // Apply mapper if provided
              const mappedDoc = mapper !== undefined ? await mapper(doc) : doc

              const exported = await this.documentExporter.exportDocument(
                mappedDoc,
                conflictStrategy,
                includeAttachments,
                hierarchy,
                lowLevelStorage,
                existingDocsMap,
                relations
              )
              if (exported) {
                result.exportedCount++
                const docName =
                  (mappedDoc as any).name ??
                  (mappedDoc as any).title ??
                  hierarchy.getClass(mappedDoc._class)?.label ??
                  mappedDoc._id
                // Use target workspace doc id so the notification panel can resolve docs in the target workspace
                const targetDocId = this.state.idMapping.get(mappedDoc._id)
                if (targetDocId !== undefined) {
                  result.exportedDocuments.push({
                    docId: targetDocId,
                    name: typeof docName === 'string' ? docName : String(docName)
                  })
                }
              } else {
                result.skippedCount++
              }
            } catch (err: any) {
              this.context.error(`Error exporting document ${doc._id}:`, {
                error: err instanceof Error ? err.message : String(err),
                docId: doc._id
              })
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
        `Export completed: ${result.exportedCount} exported, ${result.skippedCount} skipped, ${result.errors.length} errors`
      )
    } catch (err: any) {
      this.context.error('Export failed:', {
        error: err instanceof Error ? err.message : String(err)
      })
      result.success = false
      result.errors.push({
        docId: 'export',
        error: err.message ?? 'Unknown error'
      })
    } finally {
      await sourcePipeline.close()
    }

    return result
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
      this.context.error(`Error finding employee for account ${account}:`, {
        error: err instanceof Error ? err.message : String(err),
        account
      })
      return undefined
    }
  }
}
