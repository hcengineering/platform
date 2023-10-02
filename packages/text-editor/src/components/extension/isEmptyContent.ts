import { Editor, Extension } from '@tiptap/core'

export interface IsEmptyContentOptions {
  onChange: (isEmpty: boolean) => void
}

export interface IsEmptyContentStorage {
  isEmpty: boolean
}

const handleChange = (editor: Editor, options: IsEmptyContentOptions, storage: IsEmptyContentStorage): void => {
  if (storage.isEmpty !== editor.isEmpty) {
    storage.isEmpty = editor.isEmpty

    options.onChange(storage.isEmpty)
  }
}

export const IsEmptyContentExtension: Extension<IsEmptyContentOptions, IsEmptyContentStorage> =
  Extension.create<IsEmptyContentOptions>({
    name: 'is-empty-content-extension',
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
