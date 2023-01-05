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

import { Class, Doc, DocIndexState, DocumentQuery, DocumentUpdate, Hierarchy, Ref } from '@hcengineering/core'
import type { IndexedDoc } from '../types'

/**
 * @public
 */
export interface FullTextPipeline {
  hierarchy: Hierarchy
  update: (
    docId: Ref<DocIndexState>,
    mark: boolean,
    update: DocumentUpdate<DocIndexState>,
    elasticUpdate: Partial<IndexedDoc>,
    flush?: boolean
  ) => Promise<void>

  search: (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ) => Promise<{ docs: IndexedDoc[], pass: boolean }>

  cancelling: boolean
}

/**
 * @public
 */
export type DocUpdateHandler = (
  doc: DocIndexState,
  update: DocumentUpdate<DocIndexState>,
  elastic: Partial<IndexedDoc>
) => Promise<void>

/**
 * @public
 */
export interface FullTextPipelineStage {
  // States required to be complete
  require: string[]

  // State to be updated
  stageId: string

  // Clear all stages except following.
  clearExcept: string[]

  // Will propogate some changes for both mark values.
  updateFields: DocUpdateHandler[]

  limit: number

  // Collect all changes related to bulk of document states
  collect: (docs: DocIndexState[], pipeline: FullTextPipeline) => Promise<void>

  // Handle remove of items.
  remove: (docs: DocIndexState[], pipeline: FullTextPipeline) => Promise<void>

  // Search helper
  search: (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ) => Promise<{ docs: IndexedDoc[], pass: boolean }>
}

/**
 * @public
 */
export const contentStageId = 'cnt-v1'
/**
 * @public
 */
export const fieldStateId = 'fld-v1'
