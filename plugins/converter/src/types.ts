//
// Copyright © 2026 TraceX SAS.
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Class, Doc, DocumentQuery, Hierarchy, Ref } from '@hcengineering/core'
import type { Resource } from '@hcengineering/platform'
import type { AttributeModel, BuildModelKey, Viewlet, TableSource } from '@hcengineering/view'

/**
 * Value formatter function for custom field extraction during markdown/export
 * @param attr - The attribute model
 * @param doc - The document object
 * @param hierarchy - The hierarchy instance
 * @param _class - The document class
 * @param language - Current language
 * @returns The formatted value, or undefined if this formatter doesn't apply
 */
export type ValueFormatter = (
  attr: AttributeModel,
  doc: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined
) => Promise<string | undefined>

/**
 * Mixin for classes that provide a custom value formatter for markdown/export
 */
export interface MarkdownValueFormatter extends Class<Doc> {
  formatter: Resource<ValueFormatter>
}

/**
 * Props for CopyAsMarkdownTable function
 */
export interface CopyAsMarkdownTableProps {
  cardClass: Ref<Class<Doc>>
  viewlet?: Viewlet
  config?: Array<string | BuildModelKey>
  language?: string
  valueFormatter?: ValueFormatter
  query?: DocumentQuery<Doc>
  source?: TableSource
  /**
   * Refuse to build when a configured column no longer exists. Refreshable tables need it to keep
   * their columns stable; exports and plain copies keep the previous lenient behaviour.
   */
  strictColumns?: boolean
}

export interface TableData {
  config?: Array<string | BuildModelKey>
  columnIds?: string[]
  headers: string[]
  /** Cell text without markdown escaping and without links. `rows[i]` belongs to `docs[i]`. */
  rows: string[][]
  docs: Doc[]
  /** Columns a renderer may turn into a link to the row's document (the object column). */
  linkColumns: number[]
}

/**
 * Interface for RelationshipTable's cell model
 */
export interface RelationshipCellModel {
  attribute: AttributeModel
  rowSpan: number
  object: Doc | undefined
  parentObject: Doc | undefined
}

/**
 * Interface for RelationshipTable's row model
 */
export interface RelationshipRowModel {
  cells: RelationshipCellModel[]
}

/**
 * Props for CopyRelationshipTableAsMarkdown function
 */
export interface CopyRelationshipTableAsMarkdownProps {
  viewlet?: Viewlet
  viewModel: RelationshipRowModel[]
  model: AttributeModel[]
  objects: Doc[]
  cardClass: Ref<Class<Doc>>
  language?: string
  valueFormatter?: ValueFormatter
  query?: DocumentQuery<Doc>
  source?: TableSource
}
