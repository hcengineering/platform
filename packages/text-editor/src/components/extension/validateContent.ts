import { Editor, Extension } from '@tiptap/core'

export interface ValidateContentOptions {
  onEmptyText?: (isEmpty: boolean) => void
  onValidate?: (html: string) => void
}

export interface ValidateContentStorage {
  isEmpty: boolean
}

const handleChange = (editor: Editor, options: ValidateContentOptions, storage: ValidateContentStorage): void => {
  if (options.onEmptyText !== undefined && options.onEmptyText !== null) {
    if (storage.isEmpty !== editor.isEmpty) {
      storage.isEmpty = editor.isEmpty
      options.onEmptyText(storage.isEmpty)
    }
  }

  if (options.onValidate !== undefined && options.onValidate !== null) {
    options.onValidate(editor.getHTML()) // TODO: might need to call async ?
  }
}

export const ValidateContentExtension: Extension<ValidateContentOptions, ValidateContentStorage> =
  Extension.create<ValidateContentOptions>({
    name: 'validate-content-extension',
    addStorage () {
      return {
        isEmpty: true
      }
    },
    onCreate () {
      this.parent?.()

      handleChange(this.editor, this.options, this.storage)
    },
    onUpdate () {
      this.parent?.()

      handleChange(this.editor, this.options, this.storage)
    }
  })
