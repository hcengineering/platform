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

import { type Attribute } from '@tiptap/core'
import { showPopup, SelectPopup, type PopupAlignment } from '@hcengineering/ui'
import textEditor, { type InlineShortcutAction, type TextEditorInlineCommand } from '@hcengineering/text-editor'
import { getClient } from '@hcengineering/presentation'
import { getResource } from '@hcengineering/platform'
import { type DocumentQuery, type Ref } from '@hcengineering/core'

import { mInsertTable } from './components/extensions'

export function getDataAttribute (
  name: string,
  options?: Omit<Attribute, 'parseHTML' | 'renderHTML'>
): Partial<Attribute> {
  const dataName = `data-${name}`

  return {
    default: null,
    parseHTML: (element) => element.getAttribute(dataName),
    renderHTML: (attributes) => {
      // eslint-disable-next-line
      if (!attributes[name]) {
        return {}
      }

      return {
        [dataName]: attributes[name]
      }
    },
    ...(options ?? {})
  }
}

export async function addTableHandler (
  insertTable: (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) => void,
  alignment?: PopupAlignment
): Promise<void> {
  showPopup(
    SelectPopup,
    {
      value: mInsertTable.map((it) => ({ id: it.label, text: it.label }))
    },
    alignment ?? 'center',
    (val) => {
      if (val !== undefined) {
        const tab = mInsertTable.find((it) => it.label === val)
        if (tab !== undefined) {
          insertTable({
            cols: tab.cols,
            rows: tab.rows,
            withHeaderRow: tab.header
          })
        }
      }
    }
  )
}

export const insertImageShortcut: InlineShortcutAction = async (handler, pos, targetItem) => {
  handler.insertImage?.(pos, targetItem)
}

export const insertTableShortcut: InlineShortcutAction = async (handler, pos, targetItem) => {
  handler.insertTable?.(pos, targetItem)
}

export const insertSeparatorLineShortcut: InlineShortcutAction = async (handler, pos, targetItem) => {
  handler.insertSeparatorLine?.(pos, targetItem)
}

export const insertCodeBlockShortcut: InlineShortcutAction = async (handler, pos, targetItem) => {
  handler.insertCodeBlock?.(pos, targetItem)
}

export const insertTodoListShortcut: InlineShortcutAction = async (handler, pos, targetItem) => {
  handler.insertTodoList?.(pos, targetItem)
}

export async function getInlineCommands (
  query: DocumentQuery<TextEditorInlineCommand> = {},
  excluded: Array<Ref<TextEditorInlineCommand>> = []
): Promise<TextEditorInlineCommand[]> {
  const client = getClient()
  const allCommands = client.getModel().findAllSync(textEditor.class.TextEditorInlineCommand, query)
  const result: TextEditorInlineCommand[] = []

  for (const command of allCommands) {
    if (excluded.includes(command._id)) {
      continue
    }

    if (command.visibilityTester !== undefined) {
      const visibleFn = await getResource(command.visibilityTester)
      const isVisible = await visibleFn()
      if (!isVisible) continue
    }

    result.push(command)
  }

  return result
}
