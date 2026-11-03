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

import { escapeMarkdownLinkText, escapeMarkdownLinkUrl } from './markdown/escape'

export type {
  ValueFormatter,
  MarkdownValueFormatter,
  CopyAsMarkdownTableProps,
  TableData,
  RelationshipCellModel,
  RelationshipRowModel,
  CopyRelationshipTableAsMarkdownProps
} from '@hcengineering/converter'

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
