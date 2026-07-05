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

import { type Issue } from '@hcengineering/tracker'

/** Semicolon — opens correctly in Excel (RU locale). */
const EXCEL_SEPARATOR = ';'

export interface TimeReportExportHeaders {
  issueId: string
  issueTitle: string
  parentId: string
  parentTitle: string
  hours: string
  total: string
}

/** Decimal hours for Excel RU, e.g. 4.5 h → "4,5". */
export function formatHoursDecimal (hours: number): string {
  if (hours <= 0) return '0'
  const rounded = Math.round(hours * 100) / 100
  const normalized = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2).replace(/\.?0+$/, '')
  return normalized.replace('.', ',')
}

function escapeCsvCell (value: string): string {
  const data = value.replace(/(\r\n|\n|\r)/gm, ' ').replace(/"/g, '""')
  return `"${data}"`
}

function buildCsvRow (cells: string[], separator: string): string {
  return cells.map(escapeCsvCell).join(separator)
}

function getParentInfo (issue: Issue): { parentId: string, parentTitle: string } {
  const parent = issue.parents?.[0]
  if (parent === undefined) return { parentId: '', parentTitle: '' }
  return {
    parentId: parent.identifier ?? '',
    parentTitle: parent.parentTitle ?? ''
  }
}

export function buildTimeReportsCsv (params: {
  projectName: string
  dateFrom: number
  dateTo: number
  headers: TimeReportExportHeaders
  rows: Array<{
    issue: Issue
    hours: number
  }>
}): string {
  const { projectName, dateFrom, dateTo, headers, rows } = params
  const lines: string[] = []

  lines.push(buildCsvRow([projectName], EXCEL_SEPARATOR))
  lines.push(
    buildCsvRow(
      [`${new Date(dateFrom).toLocaleDateString()} — ${new Date(dateTo).toLocaleDateString()}`],
      EXCEL_SEPARATOR
    )
  )
  lines.push('')
  lines.push(
    buildCsvRow(
      [headers.issueId, headers.issueTitle, headers.parentId, headers.parentTitle, headers.hours],
      EXCEL_SEPARATOR
    )
  )

  for (const row of rows) {
    const parent = getParentInfo(row.issue)
    lines.push(
      buildCsvRow(
        [
          row.issue.identifier ?? '',
          row.issue.title ?? '',
          parent.parentId,
          parent.parentTitle,
          formatHoursDecimal(row.hours)
        ],
        EXCEL_SEPARATOR
      )
    )
  }

  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0)
  lines.push('')
  lines.push(
    buildCsvRow(['', '', '', headers.total, formatHoursDecimal(totalHours)], EXCEL_SEPARATOR)
  )

  return lines.join('\n')
}

export function downloadTimeReportsCsv (csv: string, filename: string): void {
  const link = document.createElement('a')
  link.style.display = 'none'
  link.setAttribute('href', 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(csv))
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function sanitizeFilenamePart (value: string): string {
  return value.replace(/[^\w\u0400-\u04FF.-]+/g, '_').slice(0, 80)
}
