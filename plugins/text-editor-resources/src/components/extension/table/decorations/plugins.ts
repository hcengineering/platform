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

import { Plugin, PluginKey } from '@tiptap/pm/state'
import { TableMap } from '@tiptap/pm/tables'
import { findTable } from '../utils'

export interface TableCachePluginState {
  tableMap?: TableMap
  tablePos?: number
}

export const TableCachePluginKey = new PluginKey<TableCachePluginState>('tableCache')

export const TableCachePlugin = (): Plugin<TableCachePluginState> => {
  return new Plugin<TableCachePluginState>({
    key: TableCachePluginKey,
    state: {
      init: () => ({}),
      apply (tr, prev, _oldState, newState) {
        const table = findTable(newState.selection)
        if (table === undefined) {
          return {}
        }

        if (prev.tablePos === table.pos && !tr.docChanged) {
          return prev
        }

        return {
          tableMap: TableMap.get(table.node),
          tablePos: table.pos
        }
      }
    }
  })
}
