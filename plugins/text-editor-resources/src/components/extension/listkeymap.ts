//
// Copyright © 2024 Hardcore Engineering Inc.
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
import ListKeymap, { type ListKeymapOptions, listHelpers } from '@tiptap/extension-list-keymap'

/**
 * Workaround for the original ListKeymap extension issue that
 * https://github.com/ueberdosis/tiptap/issues/4368
 */
export const ListKeymapExtension = ListKeymap.extend<ListKeymapOptions>({
  addKeyboardShortcuts () {
    const handleBackspace = (editor: Editor): boolean => {
      let handled = false

      if (!editor.state.selection.empty) {
        return false
      }

      this.options.listTypes.forEach(({ itemName, wrapperNames }) => {
        if (editor.state.schema.nodes[itemName] === undefined) {
          return
        }
        if (listHelpers.handleBackspace(editor, itemName, wrapperNames)) {
          handled = true
        }
      })

      return handled
    }

    const handleDelete = (editor: Editor): boolean => {
      let handled = false

      if (!editor.state.selection.empty) {
        return false
      }

      this.options.listTypes.forEach(({ itemName }) => {
        if (editor.state.schema.nodes[itemName] === undefined) {
          return
        }
        if (listHelpers.handleDelete(editor, itemName)) {
          handled = true
        }
      })

      return handled
    }

    const handleBackspaceSafe = (editor: Editor): boolean => {
      try {
        return handleBackspace(editor)
      } catch (e) {
        console.log(e)
        return false
      }
    }

    const handleDeleteSafe = (editor: Editor): boolean => {
      try {
        return handleDelete(editor)
      } catch (e) {
        console.log(e)
        return false
      }
    }

    return {
      Backspace: ({ editor }) => handleBackspaceSafe(editor),
      'Mod-Backspace': ({ editor }) => handleBackspaceSafe(editor),
      Delete: ({ editor }) => handleDeleteSafe(editor),
      'Mod-Delete': ({ editor }) => handleDeleteSafe(editor)
    }
  }
})
