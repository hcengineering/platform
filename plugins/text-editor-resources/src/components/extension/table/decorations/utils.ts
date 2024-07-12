//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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

import { type Editor } from '@tiptap/core'
import { type TableMap } from '@tiptap/pm/tables'
import { type TableNodeLocation } from '../types'

export function getTableCellWidgetDecorationPos (table: TableNodeLocation, map: TableMap, index: number): number {
  return table.start + map.map[index] + 1
}

export function getTableHeightPx (table: TableNodeLocation, editor: Editor): number {
  const dom = editor.view.domAtPos(table.start)
  return dom.node.parentElement?.offsetHeight ?? 0
}

export function getTableWidthPx (table: TableNodeLocation, editor: Editor): number {
  const dom = editor.view.domAtPos(table.start)
  return dom.node.parentElement?.offsetWidth ?? 0
}
