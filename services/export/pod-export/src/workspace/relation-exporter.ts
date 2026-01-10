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
  type Class,
  type Doc,
  type Hierarchy,
  type LowLevelStorage,
  type MeasureContext,
  type Ref
} from '@hcengineering/core'
import { isId } from '@hcengineering/core'
import { type ExportState, type RelationDefinition } from './types'

/**
 * Type for document export callback
 */
export type ExportDocumentFn = (
  doc: Doc,
  conflictStrategy: 'skip' | 'duplicate',
  includeAttachments: boolean,
  sourceHierarchy: Hierarchy,
  sourceLowLevel: LowLevelStorage,
  existingDocsMap: Map<Ref<Doc>, Doc>,
  relations: RelationDefinition[]
) => Promise<boolean>

/**
 * Handles forward and inverse relation export
 */
export class RelationExporter {
  constructor (
    private readonly context: MeasureContext,
    private readonly state: ExportState,
    private readonly exportDocument: ExportDocumentFn
  ) {}

  /**
   * Export forward relations (dependencies that must exist before the document)
   */
  async exportForwardRelations (
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
        await this.exportForwardRelation(
          doc,
          relation,
          conflictStrategy,
          includeAttachments,
          sourceHierarchy,
          sourceLowLevel,
          relations
        )
      } catch (err: any) {
        this.context.error(`Failed to export forward relation ${relation.field} for document ${doc._id}:`, {
          error: err instanceof Error ? err.message : String(err),
          docId: doc._id,
          relationField: relation.field
        })
      }
    }
  }

  /**
   * Export inverse relations (documents that reference this document)
   */
  async exportInverseRelations (
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
        await this.exportInverseRelation(
          doc,
          relation,
          conflictStrategy,
          includeAttachments,
          sourceHierarchy,
          sourceLowLevel,
          relations
        )
      } catch (err: any) {
        this.context.error(`Failed to export inverse relation ${relation.field} for document ${doc._id}:`, {
          error: err instanceof Error ? err.message : String(err),
          docId: doc._id,
          relationField: relation.field
        })
      }
    }
  }

  private async exportForwardRelation (
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

      await this.exportRelatedDocument(
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

  private async exportInverseRelation (
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

      await this.exportDocument(
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

  private async exportRelatedDocument (
    ref: Ref<Doc>,
    relationClass: Ref<Class<Doc>>,
    conflictStrategy: 'skip' | 'duplicate',
    includeAttachments: boolean,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage,
    relations: RelationDefinition[]
  ): Promise<void> {
    if (this.state.idMapping.has(ref)) {
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

    await this.exportDocument(
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
