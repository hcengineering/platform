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
  type DocumentQuery,
  type MeasureContext,
  type Ref,
  type Space,
  type WorkspaceIds
} from '@hcengineering/core'
import { type Pipeline } from '@hcengineering/server-core'

export type PipelineFactory = (ctx: MeasureContext, workspace: WorkspaceIds) => Promise<Pipeline>

export interface RelationDefinition {
  field: string
  class: Ref<Class<Doc>>
  direction?: 'forward' | 'inverse'
}

export interface ExportOptions {
  sourceWorkspace: WorkspaceIds
  targetWorkspace: WorkspaceIds
  sourceQuery: DocumentQuery<Doc>
  _class: Ref<Class<Doc>>
  // Strategy for handling conflicts
  conflictStrategy?: 'skip' | 'duplicate'
  // Whether to include attachments
  includeAttachments?: boolean
  // Optional mapper function to transform documents before export
  mapper?: (doc: Doc) => Doc | Promise<Doc>
  relations?: RelationDefinition[]
  // Field mappers per class: { classA: { fieldA: value, fieldB: '$currentUser' }, ... }
  // Special value '$currentUser' will be replaced with current account's employee ID
  fieldMappers?: Record<string, Record<string, any>>
  // Whether to skip documents and templates in deleted or obsolete state
  skipDeletedObsolete?: boolean
}

export interface ExportResult {
  success: boolean
  exportedCount: number
  skippedCount: number
  errors: Array<{ docId: string, error: string }>
  exportedDocuments: Array<{ docId: Ref<Doc>, name: string }>
}

/**
 * Shared export state used across all exporter components
 */
export interface ExportState {
  idMapping: Map<Ref<Doc>, Ref<Doc>>
  spaceMapping: Map<Ref<Space>, Ref<Space>>
  processingDocs: Set<Ref<Doc>>
  // Track unique field values per class: { className: { fieldName: Set<values> } }
  uniqueFieldValues: Map<string, Map<string, Set<string | number>>>
}
