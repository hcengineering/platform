//
// Copyright © 2026 TraceX SAS.
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

import type { BuildModelKey } from '@hcengineering/view'

/** Whether a configured column can be displayed in a relation table. */
export function isRelationColumn (column: string | BuildModelKey): boolean {
  const key = typeof column === 'string' ? column : column.key
  return !key.includes('$lookup') && !key.startsWith('@')
}

/** Move a displayed column while preserving hidden configuration entries and column properties. */
export function reorderRelationColumns (
  config: Array<string | BuildModelKey>,
  from: number,
  to: number
): Array<string | BuildModelKey> {
  const visibleIndexes = config.flatMap((column, index) => (isRelationColumn(column) ? [index] : []))
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= visibleIndexes.length ||
    to >= visibleIndexes.length
  ) {
    return config
  }

  const columns = visibleIndexes.map((index) => config[index])
  const [column] = columns.splice(from, 1)
  columns.splice(to, 0, column)
  const result = [...config]
  visibleIndexes.forEach((index, position) => {
    result[index] = columns[position]
  })
  return result
}
