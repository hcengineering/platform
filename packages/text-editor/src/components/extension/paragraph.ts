import { Extension } from '@tiptap/core'

export const ParagraphExtension = Extension.create({
  addKeyboardShortcuts () {
    return {
      'Shift-Enter': () => {
        const res = this.editor.commands.splitListItem('listItem')
        if (!res) {
          this.editor.commands.first(({ commands }) => [
            () => commands.newlineInCode(),
            () => commands.createParagraphNear(),
            () => commands.liftEmptyBlock(),
            () => commands.splitBlock()
          ])
        }
        return true
      }
    }
  }
})
