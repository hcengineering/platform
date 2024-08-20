import { Extension } from '@tiptap/core'

export interface IsEmptyContentOptions {
  onChange: (isEmpty: boolean) => void
}

export interface IsEmptyContentStorage {
  isEmpty: boolean
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

      this.storage.isEmpty = this.editor.isEmpty
      this.options.onChange(this.storage.isEmpty)
    },
    onUpdate () {
      this.parent?.()

      if (this.storage.isEmpty !== this.editor.isEmpty) {
        this.storage.isEmpty = this.editor.isEmpty

        this.options.onChange(this.storage.isEmpty)
      }
    }
  })
