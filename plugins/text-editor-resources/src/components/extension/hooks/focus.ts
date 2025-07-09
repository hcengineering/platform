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

import { type Editor, Extension } from '@tiptap/core'

const canBlur = (editor: Editor, options: FocusOptions): boolean => {
  return (
    options.canBlur?.(editor) ??
    (!editor.isActive('bulletList') &&
      !editor.isActive('orderedList') &&
      !editor.isActive('taskList') &&
      !editor.isActive('todoList') &&
      !editor.isActive('table') &&
      !editor.isActive('code') &&
      !editor.isActive('codeBlock'))
  )
}

export interface FocusOptions {
  canBlur?: (editor: Editor) => boolean
  onCanBlur?: (canBlur: boolean) => void
  onFocus?: (focused: boolean) => void
}

export interface FocusStorage {
  canBlur: boolean
}

export const FocusExtension = Extension.create<FocusOptions, FocusStorage>({
  name: 'focus',
  addStorage () {
    return { canBlur: true }
  },
  onCreate () {
    this.options.onFocus?.(this.editor.isFocused)

    this.storage.canBlur = canBlur(this.editor, this.options)
    this.options.onCanBlur?.(this.storage.canBlur)
  },
  onBlur () {
    this.options.onFocus?.(false)
  },
  onFocus () {
    this.options.onFocus?.(true)
  },
  onSelectionUpdate () {
    const canBlurNow = canBlur(this.editor, this.options)

    if (this.storage.canBlur !== canBlurNow) {
      this.storage.canBlur = canBlurNow
      this.options.onCanBlur?.(this.storage.canBlur)
    }
  }
})
