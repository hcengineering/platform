//
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

import type { Doc, Class, Ref, Hierarchy, DocumentQuery } from '@hcengineering/core'
import type { AttributeModel, BuildModelKey, Viewlet } from '@hcengineering/view'
import type { Resource } from '@hcengineering/platform'

import { escapeMarkdownLinkText, escapeMarkdownLinkUrl } from './markdown/escape'

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
  valueFormatter?: ValueFormatter
  query?: DocumentQuery<Doc>
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
  viewModel: RelationshipRowModel[]
  model: AttributeModel[]
  objects: Doc[]
  cardClass: Ref<Class<Doc>>
  valueFormatter?: ValueFormatter
  query?: DocumentQuery<Doc>
}

/**
 * Function type for CopyAsMarkdownTable (used in action context)
 */
export type CopyAsMarkdownTableFunction = (evt: Event, props: CopyAsMarkdownTableProps) => Promise<void>

/**
 * Function type for CopyRelationshipTableAsMarkdown
 */
export type CopyRelationshipTableAsMarkdownFunction = (
  evt: Event,
  props: CopyRelationshipTableAsMarkdownProps
) => Promise<void>

/**
 * Interface for a generic table converter to different formats.
 */
export interface TableConverter {
  // Build table output from formatted rows
  buildTable: (headers: string[], rows: string[][]) => string

  // Escape a cell value for this format
  escapeValue: (value: string) => string

  // Create a link in this format
  createLink: (url: string, text: string) => string

  // Format identifier (e.g., 'markdown', 'csv', 'html')
  readonly format: string
}

/**
 * Markdown implementation of TableConverter.
 */
export class MarkdownTableConverter implements TableConverter {
  readonly format = 'markdown'

  buildTable (headers: string[], rows: string[][]): string {
    let markdown = '| ' + headers.join(' | ') + ' |\n'
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
    for (const row of rows) {
      markdown += '| ' + row.join(' | ') + ' |\n'
    }
    return markdown
  }

  escapeValue (value: string): string {
    return escapeMarkdownLinkText(value)
  }

  createLink (url: string, text: string): string {
    return `[${escapeMarkdownLinkText(text)}](${escapeMarkdownLinkUrl(url)})`
  }
}
