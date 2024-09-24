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
  name: 'editable',

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
