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

import { Extension } from '@tiptap/core'
import { type Transaction } from '@tiptap/pm/state'

const metaKey = '$editable'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EditableOptions {}

export interface EditableStorage {
  isEditable: boolean | undefined
}

export function isChangeEditable (tr: Transaction): boolean {
  return tr.getMeta(metaKey) !== undefined
}

export const EditableExtension = Extension.create<EditableOptions, EditableStorage>({
  name: 'isEditable',

  addStorage () {
    return { isEditable: undefined }
  },

  onUpdate () {
    if (this.editor.isEditable !== this.storage.isEditable) {
      const { state, view } = this.editor

      this.storage.isEditable = this.editor.isEditable
      const tr = state.tr.setMeta(metaKey, this.storage.isEditable)
      view.dispatch(tr)
    }
  }
})
